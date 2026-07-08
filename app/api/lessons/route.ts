import { requireAuth, requireRole } from '@/lib/auth/apiAuth';
import dbConnect from '@/lib/mongo';
import { getLessonDateRange } from '@/lib/utils/lesson-date-range';
import { toLessonDetailDTO, toLessonListDTO } from '@/lib/utils/lesson.mapper';
import { createLessonSchema } from '@/lib/validators/lesson';
import Lesson from '@/models/Lesson';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorizez" },
                {status:401}
            )
        }
        if (!requireRole(user,["admin","teacher"])) {
            return NextResponse.json({ ok: false, error: "Forbidden" },
                {status:403}
            )
        }
       
        const searchParams = req.nextUrl.searchParams;

        const rawView = searchParams.get("view");
        const view = rawView === "day" || rawView === "week" || rawView === "month" ? rawView : "week";

        const rawDate = searchParams.get("date");

        const date = rawDate ? new Date(rawDate) : new Date();

        if (Number.isNaN(date.getTime())) {
            return NextResponse.json(
                { error: "Invalid date parameter" },
                { status: 400 },
            )
        }

        const { start, end } = getLessonDateRange({ view, date });

        const filter = {
            teacherId: getCurrentUserId(user),
            scheduledStart: {
                $gte: start,
                $lt: end
            }
        }

        await dbConnect();

        const items = await Lesson.find(filter).sort({ scheduledStart: 1 }).lean().limit(300);
        
        return NextResponse.json({ ok: true, view, range:{start: start.toISOString(), end: end.toISOString()}, items: items.map(toLessonListDTO)})

       } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";

  console.error("Error GET /api/lessons:", error);

  return NextResponse.json(
    { ok: false, error: message },
    { status: 500 },
  );
    }
}


export async function POST(req: NextRequest) {
    try { 
        const user = await requireAuth(req);
        if (!user) {
            return NextResponse.json({ok: false, error: "Unauthorized"}, {status: 401})
        }
        if (!requireRole(user, ["teacher", "admin"])) {
            return NextResponse.json({ok: false, error: "Forbidden"}, {status: 403})
        }

        const body = await req.json();

        const parsed = createLessonSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ok: false, error:"Invalid lesson payload", issues: z.flattenError(parsed.error)},{status:400})
        }
        
        await dbConnect();

        const currentUserObjectId = getCurrentUserId(user);

        if (!currentUserObjectId) {
           return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
            );
        }
        
        const lesson = await Lesson.create({ ...parsed.data, teacherId: currentUserObjectId });

        return NextResponse.json({ ok: true, item: toLessonDetailDTO(lesson)}, {status: 201})
    } catch (error) {
        console.error("Error en POST /api/lessons: ", error);

        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500})
    }
}