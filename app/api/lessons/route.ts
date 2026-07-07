import { requireAuth, requireRole } from '@/lib/auth/apiAuth';
import dbConnect from '@/lib/mongo';
import { getLessonDateRange } from '@/lib/utils/lesson-date-range';
import { toLessonListDTO } from '@/lib/utils/lesson.mapper';
import Lesson from '@/models/Lesson';
import { NextRequest, NextResponse } from 'next/server';

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

        console.error("Error GET /api/lessons: ", message);

        return NextResponse.json({ ok: false, error: "Internal Server Error"}, {status: 500})
    }
}