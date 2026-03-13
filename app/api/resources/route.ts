import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { CEFR_LEVELS, IResource, Resource } from "@/models/ResourceProfile";
import { NextRequest, NextResponse } from "next/server";
import mongoose, { QueryFilter } from "mongoose";

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
            if (!requireRole(user, ["admin", "teacher"])) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            } 
        await dbConnect();

        const searchParams  = req.nextUrl.searchParams;
        const search = searchParams.get("search")?.trim();
        const level = searchParams.get("level")?.trim();

        const query: QueryFilter<IResource> = {};
        if (search) {query.$text = { $search: search };}

        if (level && CEFR_LEVELS.includes(level as (typeof CEFR_LEVELS)[number])) {
        query.levels = level;
        }
            const resourcesQuery = Resource.find(query).lean();

        if (search) {
        resourcesQuery
            .select({ score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" }, createdAt: -1 });
        } else {
        resourcesQuery.sort({ createdAt: -1 });
        }

        const resources = await resourcesQuery;

        return NextResponse.json(resources, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.log("Error en get api/resources", errorMessage);
        return NextResponse.json({ error: "Error al obtener los recursos" }, { status: 500 });
    }
}

//POST; Crear nuevo recurso.

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        if (!requireRole(user, ["admin", "teacher"])) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await req.json();

        if (!body.title || !body.pedagogicalType || !body.format) {
            return NextResponse.json({
                error: "Faltan campos obligatorios: title, pedagogicaltype o format."
            }, {
                status: 400
            })
        }
        
        await dbConnect();

        const newResource = await Resource.create({
            title: body.title,
            description: body.description,
            status: body.status,
            visibility: body.visibility,
      
            pedagogicalType: body.pedagogicalType,
            levels: body.levels,
            skills: body.skills,
            deliveryModes: body.deliveryModes,
            lessonStages: body.lessonStages,
      
            grammarTopics: body.grammarTopics,
            vocabularyTopics: body.vocabularyTopics,
            tags: body.tags,
      
            estimatedDurationMinutes: body.estimatedDurationMinutes,
            difficulty: body.difficulty,
            hasAnswerKey: body.hasAnswerKey,
            requiresTeacherReview: body.requiresTeacherReview,
      
            format: body.format,
            storagePath: body.storagePath,
            fileUrl: body.fileUrl,
            originalFilename: body.originalFilename,
            mimeType: body.mimeType,
            fileSizeBytes: body.fileSizeBytes,
            pageCount: body.pageCount,
            durationSeconds: body.durationSeconds,
            thumbnailUrl: body.thumbnailUrl,
            externalUrl: body.externalUrl,

            ownerTeacherId: user!.id,
        });

        return NextResponse.json(newResource, { status: 201 })


    } catch (error: unknown) {
        if (error instanceof mongoose.Error.ValidationError) {
            return NextResponse.json(
                { error: "Datos de recurso no válidos", details: error.errors },
                { status: 400 }
            );
        }

        const errorMessage =
            error instanceof Error ? error.message : "Error desconocido";

        console.error("Error en POST /api/resources:", errorMessage);

        return NextResponse.json(
            { error: "Error al crear un nuevo recurso" },
            { status: 500 }
        );
    }
}