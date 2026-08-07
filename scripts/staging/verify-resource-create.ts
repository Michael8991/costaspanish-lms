import { request } from "@playwright/test";
import mongoose from "mongoose";

import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";

type CreatedResourceResponse = {
  item?: {
    id?: string;
    format?: string;
    lessonStages?: string[];
  };
  error?: string;
};

type UploadResponse = {
  fileUrl?: string;
  storagePath?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  error?: string;
};

function getStagingConfig(): {
  baseUrl: string;
  databaseName: string;
  email: string;
  mongoUri: string;
  password: string;
} {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const databaseName = process.env.MONGODB_DB_NAME;
  const email = process.env.DEMO_TEACHER_EMAIL;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  const password = process.env.DEMO_TEACHER_PASSWORD;
  const targetHost = new URL(baseUrl).hostname;

  if (process.env.APP_ENV !== "staging") {
    throw new Error('Verification blocked: APP_ENV must be "staging".');
  }

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Verification blocked: expected database "${STAGING_DATABASE_NAME}".`,
    );
  }

  if (targetHost !== "localhost" && targetHost !== "127.0.0.1") {
    throw new Error(
      `Verification blocked: "${targetHost}" is not a local staging host.`,
    );
  }

  if (!email || !password) {
    throw new Error("Verification blocked: demo teacher credentials are missing.");
  }

  if (!mongoUri) {
    throw new Error("Verification blocked: Mongo URI is missing.");
  }

  return { baseUrl, databaseName, email, mongoUri, password };
}

function resourcePayload(title: string, format: string) {
  return {
    title,
    description: "Verificación aislada de creación de recursos en staging.",
    status: "draft",
    visibility: "private",
    pedagogicalType: "worksheet",
    transcriptText: "",
    levels: ["A1", "A2"],
    skills: ["reading", "writing"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["warmup", "homework"],
    grammarTopics: [],
    vocabularyTopics: [],
    tags: ["staging-verification"],
    hasAnswerKey: false,
    requiresTeacherReview: false,
    format,
  };
}

async function readJson<T>(response: {
  json(): Promise<unknown>;
}): Promise<T> {
  return (await response.json()) as T;
}

async function verifyResourceCreate(): Promise<void> {
  const { baseUrl, databaseName, email, mongoUri, password } =
    getStagingConfig();
  const api = await request.newContext({ baseURL: baseUrl });

  try {
    const csrfResponse = await api.get("/api/auth/csrf");
    const csrfData = await readJson<{ csrfToken?: string }>(csrfResponse);

    if (!csrfResponse.ok() || !csrfData.csrfToken) {
      throw new Error(`CSRF request failed (${csrfResponse.status()}).`);
    }

    const authResponse = await api.post(
      "/api/auth/callback/credentials?json=true",
      {
        form: {
          csrfToken: csrfData.csrfToken,
          email,
          password,
          callbackUrl: `${baseUrl}/en/dashboard`,
          json: "true",
        },
      },
    );

    if (!authResponse.ok()) {
      throw new Error(`Demo authentication failed (${authResponse.status()}).`);
    }

    const sessionResponse = await api.get("/api/auth/session");
    const session = await readJson<{
      user?: { id?: string; role?: string };
    }>(sessionResponse);

    if (session.user?.role !== "teacher" && session.user?.role !== "admin") {
      throw new Error("Demo authentication did not produce a teacher session.");
    }

    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const results: Array<Record<string, unknown>> = [];

    const createResource = async (
      format: "external_link" | "image" | "pdf",
      asset?: UploadResponse,
    ) => {
      const title = `[staging-check ${runId}] ${format}`;
      const payload = {
        ...resourcePayload(title, format),
        ...(format === "external_link"
          ? { externalUrl: "https://example.com/staging-resource-check" }
          : asset),
        ...(format === "pdf" ? { pageCount: 1 } : {}),
      };
      const response = await api.post("/api/resources", { data: payload });
      const responseData = await readJson<CreatedResourceResponse>(response);

      if (response.status() !== 201 || !responseData.item?.id) {
        throw new Error(
          `${format} create failed (${response.status()}): ` +
            (responseData.error ?? "missing resource id"),
        );
      }

      const document = await mongoose.connection
        .collection("resources")
        .findOne({ _id: new mongoose.Types.ObjectId(responseData.item.id) });

      if (!document) {
        throw new Error(`${format} resource was not found in MongoDB.`);
      }

      if (
        !Array.isArray(document.levels) ||
        !Array.isArray(document.skills) ||
        !Array.isArray(document.deliveryModes) ||
        !Array.isArray(document.lessonStages)
      ) {
        throw new Error(`${format} resource did not preserve array fields.`);
      }

      const expectedArrays = {
        levels: ["A1", "A2"],
        skills: ["reading", "writing"],
        deliveryModes: ["classwork", "homework"],
        lessonStages: ["warmup", "homework"],
      };

      for (const [field, expected] of Object.entries(expectedArrays)) {
        if (JSON.stringify(document[field]) !== JSON.stringify(expected)) {
          throw new Error(`${format} resource did not preserve ${field}.`);
        }
      }

      results.push({
        format,
        httpStatus: response.status(),
        mongoDocumentCreated: true,
        resourceId: responseData.item.id,
        storagePathPresent: Boolean(document.storagePath),
      });
    };

    const upload = async (
      format: "image" | "pdf",
      file: { name: string; mimeType: string; buffer: Buffer },
    ): Promise<UploadResponse> => {
      const response = await api.post("/api/resources/upload", {
        multipart: {
          file,
          format,
          variant: "main",
        },
      });
      const responseData = await readJson<UploadResponse>(response);

      if (
        response.status() !== 201 ||
        !responseData.fileUrl ||
        !responseData.storagePath
      ) {
        throw new Error(
          `${format} upload failed (${response.status()}): ` +
            (responseData.error ?? "missing upload metadata"),
        );
      }

      return responseData;
    };

    await mongoose.connect(mongoUri, {
      dbName: databaseName,
      autoCreate: false,
      autoIndex: false,
    });

    await createResource("external_link");

    const imageAsset = await upload("image", {
      name: `staging-check-${runId}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await createResource("image", imageAsset);

    const pdfAsset = await upload("pdf", {
      name: `staging-check-${runId}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% staging resource verification\n%%EOF\n"),
    });
    await createResource("pdf", pdfAsset);

    console.log(
      JSON.stringify(
        {
          appEnv: process.env.APP_ENV,
          databaseName,
          baseUrl,
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await api.dispose();
  }
}

verifyResourceCreate()
  .catch(error => {
    console.error(
      error instanceof Error
        ? error.message
        : "Resource creation verification failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
