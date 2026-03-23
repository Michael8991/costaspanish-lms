import { NextRequest, NextResponse } from "next/server";
import mongoose, { QueryFilter, SortOrder, Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { IResource, Resource } from "@/models/ResourceProfile";
import {
  createResourceSchema,
  formatZodIssues,
  resourceListQuerySchema,
} from "@/lib/validators/resource";
import {
  ResourceListSource,
  toPaginatedResponse,
  toResourceDetailDTO,
  toResourceListItemDTO,
} from "@/lib/dto/resource.dto";

/**
 * Tipo derivado del retorno real de `requireAuth`.
 *
 * Transformación aplicada:
 * 1. `typeof requireAuth` obtiene el tipo de la función.
 * 2. `ReturnType<...>` extrae su tipo de retorno.
 * 3. `Awaited<...>` resuelve la promesa.
 * 4. `Exclude<..., null>` elimina el caso `null`.
 *
 * Resultado:
 * `AuthUser` representa el valor retornado por `requireAuth` una vez
 * descartado el caso no autenticado.
 *
 * Objetivo:
 * evitar la duplicación manual del tipo de usuario autenticado y mantener
 * este alias alineado con la firma real de `requireAuth`.
 *
 * Importante:
 * esta abstracción es correcta únicamente si `requireAuth` garantiza en
 * runtime que el flujo autenticado no continúa con `null`.
 */
type AuthUser = Exclude<Awaited<ReturnType<typeof requireAuth>>, null>;

/**
 * Extrae el identificador lógico del usuario autenticado en formato string.
 *
 * Esta función centraliza el acceso al identificador para evitar repetir
 * lógica de extracción en distintos puntos del handler.
 *
 * Nota:
 * actualmente se prioriza `user.id`. Si en el futuro la capa de auth expone
 * otra forma de identificación, la adaptación queda encapsulada aquí.
 */
function getCurrentUserId(user: AuthUser): string {
  return String(user.id ?? "");
}

/**
 * Convierte el identificador lógico del usuario autenticado a `ObjectId`.
 *
 * Este paso es necesario porque el modelo de datos persiste referencias a
 * usuario/profesor en formato `Types.ObjectId`, mientras que la capa de
 * autenticación puede exponer dicho identificador como string.
 *
 * Retorno:
 * - `Types.ObjectId` cuando el id es válido para MongoDB.
 * - `null` cuando el valor no puede representarse como `ObjectId`.
 *
 * La validación previa evita lanzar excepciones al construir el `ObjectId`.
 */
function getCurrentUserObjectId(user: AuthUser): Types.ObjectId | null {
  const rawId = getCurrentUserId(user);

  if (!Types.ObjectId.isValid(rawId)) {
    return null;
  }

  return new Types.ObjectId(rawId);
}

/**
 * GET /api/resources
 *
 * Recupera una lista paginada de recursos aplicando:
 * - autenticación,
 * - autorización por rol,
 * - validación de query params,
 * - reglas de acceso según ownership,
 * - filtros funcionales,
 * - ordenación,
 * - proyección,
 * - serialización a DTO de listado.
 *
 * Flujo de alto nivel:
 * 1. Verificar autenticación.
 * 2. Verificar autorización (`admin` | `teacher`).
 * 3. Resolver el `ObjectId` del usuario autenticado.
 * 4. Validar y normalizar query params.
 * 5. Construir el filtro final de MongoDB.
 * 6. Ejecutar búsqueda paginada + conteo total.
 * 7. Mapear documentos a DTO de salida.
 */
export async function GET(req: NextRequest) {
  try {
    /**
     * `requireAuth` resuelve el usuario autenticado asociado a la request.
     * Si no existe contexto de autenticación válido, se devuelve 401.
     */
    const maybeUser = await requireAuth(req);

    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /**
     * A partir de este punto el flujo ya ha descartado `null`, por lo que se
     * puede promover el valor a `AuthUser`.
     */
    const user: AuthUser = maybeUser;

    /**
     * La lectura de recursos está restringida a perfiles con capacidad de
     * gestión académica: administradores y profesores.
     */
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /**
     * El modelo usa referencias `ObjectId` para `ownerTeacherId`, por lo que
     * se convierte el id autenticado a dicho formato antes de construir filtros.
     */
    const currentUserObjectId = getCurrentUserObjectId(user);

    /**
     * Un usuario autenticado cuyo id no puede representarse como `ObjectId`
     * indica una inconsistencia entre la capa de autenticación y la capa de
     * persistencia, por lo que se trata como error interno.
     */
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    /**
     * Los query params de `URLSearchParams` se materializan como objeto plano
     * para ser validados por Zod.
     *
     * Nota:
     * `entries()` devuelve únicamente la última ocurrencia por clave cuando se
     * reconstruye con `Object.fromEntries`, lo cual es adecuado mientras el
     * contrato de entrada no admita arrays repetidos.
     */
    const rawQuery = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsedQuery = resourceListQuerySchema.safeParse(rawQuery);

    /**
     * Si la query no satisface el contrato esperado, se devuelve 400 junto a
     * un detalle de errores serializado de forma estable.
     */
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: formatZodIssues(parsedQuery.error.issues),
        },
        { status: 400 },
      );
    }

    /**
     * Se extraen ya tipados y normalizados los filtros admitidos por el endpoint.
     */
    const {
      search,
      level,
      pedagogicalType,
      format,
      status,
      visibility,
      ownership,
      ownerTeacherId,
      page,
      limit,
    } = parsedQuery.data;

    /**
     * La conexión se realiza una vez superadas autenticación, autorización y
     * validación, evitando abrir conexión para requests ya descartadas.
     */
    await dbConnect();

    /**
     * Filtro base de MongoDB que se irá enriqueciendo de forma incremental.
     *
     * `QueryFilter<IResource>` permite construir el predicado respetando la
     * forma del documento Mongoose.
     */
    const finalQuery: QueryFilter<IResource> = {};

    // ========================================================================
    // Filtros funcionales
    // ========================================================================
    // En esta sección se aplican criterios de búsqueda relacionados con el
    // contenido del recurso, independientemente de las reglas de acceso.
    // ========================================================================

    /**
     * Búsqueda full-text.
     *
     * Requiere un índice de texto definido en el modelo. Cuando este filtro
     * está presente, también se habilita más adelante ordenación por `textScore`.
     */
    if (search) {
      finalQuery.$text = { $search: search };
    }

    /**
     * Filtra por nivel pedagógico.
     *
     * Dado que `levels` es presumiblemente un campo multivalor en el documento,
     * la asignación directa permite que MongoDB resuelva la coincidencia sobre
     * arrays de forma nativa.
     */
    if (level) {
      finalQuery.levels = level;
    }

    /**
     * Filtra por tipo pedagógico del recurso.
     */
    if (pedagogicalType) {
      finalQuery.pedagogicalType = pedagogicalType;
    }

    /**
     * Filtra por formato técnico o de distribución del recurso.
     */
    if (format) {
      finalQuery.format = format;
    }

    // ========================================================================
    // Ownership / permisos
    // ========================================================================
    // En esta sección se materializan las reglas de acceso sobre recursos
    // en función del rol del usuario autenticado y del filtro `ownership`.
    // ========================================================================

    if (user.role === "admin") {
      /**
       * El administrador puede:
       * - consultar recursos de un profesor concreto (`ownerTeacherId`),
       * - limitarse a sus propios recursos (`ownership === "mine"`),
       * - consultar recursos compartidos (`ownership === "shared"`),
       * - o no aplicar restricción de ownership adicional.
       */
      if (ownerTeacherId) {
        finalQuery.ownerTeacherId = new Types.ObjectId(ownerTeacherId);
      } else if (ownership === "mine") {
        finalQuery.ownerTeacherId = currentUserObjectId;
      } else if (ownership === "shared") {
        finalQuery.visibility = "shared";
      }

      /**
       * El administrador puede filtrar libremente por estado y visibilidad,
       * sin que existan restricciones de publicación impuestas por el sistema.
       */
      if (status) {
        finalQuery.status = status;
      }

      if (visibility) {
        finalQuery.visibility = visibility;
      }
    } else {
      /**
       * Profesor:
       * las reglas son más restrictivas y combinan propiedad del recurso con
       * visibilidad pública/compartida según el caso.
       */
      if (ownership === "mine") {
        /**
         * `mine`:
         * solo recursos cuyo propietario sea el usuario autenticado.
         */
        finalQuery.ownerTeacherId = currentUserObjectId;

        /**
         * Sobre recursos propios sí se permiten filtros explícitos de estado
         * y visibilidad.
         */
        if (status) {
          finalQuery.status = status;
        }

        if (visibility) {
          finalQuery.visibility = visibility;
        }
      } else if (ownership === "shared") {
        /**
         * `shared`:
         * se ignoran posibles combinaciones incompatibles del cliente y se
         * impone la política de acceso efectiva:
         * - visibilidad compartida
         * - estado publicado
         */
        finalQuery.visibility = "shared";
        finalQuery.status = "published";
      } else {
        /**
         * `all`:
         * unión de dos subconjuntos accesibles para un profesor:
         * 1. recursos propios,
         * 2. recursos compartidos y publicados.
         */
        finalQuery.$or = [
          { ownerTeacherId: currentUserObjectId },
          { visibility: "shared", status: "published" },
        ];

        /**
         * Si además se especifican `status` o `visibility`, esos filtros se
         * añaden a nivel superior del predicado y, por tanto, estrechan el
         * resultado global del `$or`.
         *
         * Esto significa que no se aplican por rama, sino sobre el conjunto
         * total de documentos admitidos por la disyunción.
         */
        if (status) {
          finalQuery.status = status;
        }

        if (visibility) {
          finalQuery.visibility = visibility;
        }
      }
    }

    /**
     * Cálculo de offset para paginación clásica por página y tamaño de página.
     */
    const skip = (page - 1) * limit;

    /**
     * Proyección de listado.
     *
     * Se limita explícitamente el conjunto de campos devueltos por MongoDB para:
     * - reducir payload,
     * - evitar exponer datos internos innecesarios,
     * - estabilizar el shape esperado por el DTO de listado.
     */
    const projection = {
      title: 1,
      description: 1,
      status: 1,
      visibility: 1,
      pedagogicalType: 1,
      levels: 1,
      skills: 1,
      deliveryModes: 1,
      lessonStages: 1,
      grammarTopics: 1,
      vocabularyTopics: 1,
      tags: 1,
      estimatedDurationMinutes: 1,
      difficulty: 1,
      hasAnswerKey: 1,
      requiresTeacherReview: 1,
      format: 1,
      originalFilename: 1,
      mimeType: 1,
      pageCount: 1,
      durationSeconds: 1,
      thumbnailUrl: 1,
      externalUrl: 1,
      timesUsed: 1,
      ownerTeacherId: 1,
      createdAt: 1,
      updatedAt: 1,
    } as const;

    /**
     * Cuando existe búsqueda textual se añade `score` con metadatos de MongoDB
     * para poder ordenar por relevancia sin perder el resto de la proyección.
     */
    const findProjection = search
      ? { ...projection, score: { $meta: "textScore" as const } }
      : projection;

    /**
     * Estrategia de ordenación:
     * - con búsqueda textual: primero relevancia (`textScore`), después fecha.
     * - sin búsqueda textual: orden descendente por creación.
     */
    const sort: Record<string, SortOrder | { $meta: "textScore" }> = search
      ? {
          score: { $meta: "textScore" },
          createdAt: -1 as SortOrder,
        }
      : {
          createdAt: -1 as SortOrder,
        };

    /**
     * Se ejecutan en paralelo:
     * - la consulta paginada,
     * - el conteo total sobre el mismo filtro.
     *
     * `lean<ResourceListSource[]>()` devuelve objetos planos en lugar de
     * documentos Mongoose hidratados, reduciendo coste y ajustándose mejor
     * al posterior mapeo a DTO.
     */
    const [documents, total] = await Promise.all([
      Resource.find(finalQuery, findProjection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<ResourceListSource[]>(),
      Resource.countDocuments(finalQuery),
    ]);

    /**
     * Transformación explícita a DTO de listado.
     *
     * El id del usuario actual se pasa al mapper para permitir derivar flags
     * dependientes del contexto del solicitante, si el DTO lo necesita
     * (por ejemplo, ownership calculado o permisos derivados).
     */
    const items = documents.map((doc) =>
      toResourceListItemDTO(doc, getCurrentUserId(user)),
    );

    /**
     * Respuesta paginada normalizada.
     */
    return NextResponse.json(toPaginatedResponse(items, page, limit, total), {
      status: 200,
    });
  } catch (error) {
    /**
     * Se evita propagar detalles internos al cliente, pero se conserva un
     * mensaje razonable para trazabilidad en logs.
     */
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en GET /api/resources:", errorMessage);

    return NextResponse.json(
      { error: "Error al obtener los recursos" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/resources
 *
 * Crea un nuevo recurso asociado al usuario autenticado.
 *
 * Flujo de alto nivel:
 * 1. Verificar autenticación.
 * 2. Verificar autorización (`admin` | `teacher`).
 * 3. Resolver `ownerTeacherId` a partir del usuario autenticado.
 * 4. Parsear y validar el body mediante Zod.
 * 5. Persistir el recurso.
 * 6. Mapear la entidad creada a DTO de detalle.
 */
export async function POST(req: NextRequest) {
  try {
    /**
     * Resolución del usuario autenticado para la request actual.
     */
    const maybeUser = await requireAuth(req);

    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /**
     * Promoción a tipo autenticado no nulo tras descartar 401.
     */
    const user: AuthUser = maybeUser;

    /**
     * Solo administradores y profesores pueden crear recursos.
     */
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /**
     * El propietario persistido del recurso se almacena como `ObjectId`.
     */
    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    /**
     * Parseo del cuerpo JSON de la request.
     *
     * Si el body no es JSON válido, `req.json()` lanzará excepción y el flujo
     * será capturado por el `catch` general.
     */
    const body = await req.json();
    const parsedBody = createResourceSchema.safeParse(body);

    /**
     * Validación estructural y semántica previa a persistencia.
     *
     * El uso de Zod permite devolver errores de contrato antes de llegar a la
     * validación de Mongoose.
     */
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodIssues(parsedBody.error.issues),
        },
        { status: 400 },
      );
    }

    /**
     * La conexión a base de datos se retrasa hasta haber validado acceso y body.
     */
    await dbConnect();

    /**
     * `payload` queda tipado según el schema validado.
     */
    const payload = parsedBody.data;

    /**
     * Persistencia explícita campo a campo.
     *
     * Esta asignación deliberada:
     * - hace visible el contrato de entrada aceptado,
     * - evita propagar accidentalmente propiedades extra del body,
     * - y documenta la correspondencia entre DTO de entrada y modelo.
     */
    const created = await Resource.create({
      title: payload.title,
      description: payload.description,

      status: payload.status,
      visibility: payload.visibility,

      pedagogicalType: payload.pedagogicalType,
      levels: payload.levels,
      skills: payload.skills,
      deliveryModes: payload.deliveryModes,
      lessonStages: payload.lessonStages,

      grammarTopics: payload.grammarTopics,
      vocabularyTopics: payload.vocabularyTopics,
      tags: payload.tags,

      estimatedDurationMinutes: payload.estimatedDurationMinutes,
      difficulty: payload.difficulty,

      hasAnswerKey: payload.hasAnswerKey,
      requiresTeacherReview: payload.requiresTeacherReview,

      format: payload.format,
      storagePath: payload.storagePath,
      fileUrl: payload.fileUrl,
      originalFilename: payload.originalFilename,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.fileSizeBytes,
      pageCount: payload.pageCount,
      durationSeconds: payload.durationSeconds,
      thumbnailUrl: payload.thumbnailUrl,
      thumbnailStoragePath: payload.thumbnailStoragePath,
      externalUrl: payload.externalUrl,

      /**
       * La propiedad del recurso no se toma del cliente; se deriva siempre
       * del usuario autenticado, evitando suplantación de ownership.
       */
      ownerTeacherId: currentUserObjectId,
    });

    /**
     * Se serializa la entidad recién creada a DTO de detalle antes de exponerla.
     */
    return NextResponse.json(
      {
        item: toResourceDetailDTO(created.toObject(), getCurrentUserId(user)),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    /**
     * Validación de Mongoose.
     *
     * Este bloque captura errores de esquema/modelo que hayan escapado a la
     * validación previa de Zod o que dependan de reglas propias del modelo.
     */
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Datos de recurso no válidos",
          details: Object.values(error.errors).map((err) => ({
            path: err.path,
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    /**
     * Resto de errores no controlados.
     */
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    console.error("Error en POST /api/resources:", errorMessage);

    return NextResponse.json(
      { error: "Error al crear un nuevo recurso" },
      { status: 500 },
    );
  }
}