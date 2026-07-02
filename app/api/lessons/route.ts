import { requireAuth, requireRole } from '@/lib/auth/apiAuth';
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
        const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
        const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
        const skip = (page - 1) * limit;

        const filter = { teacherId: getCurrentUserId }
        
        const sort={scheduledStart:1}

        const [items, total] = await Promise.all([
  Lesson.find(filter).sort(sort).skip(skip).limit(limit).lean(),
  Lesson.countDocuments(filter),
]);

        return NextResponse.json({ok: true, data: items.map(toLessonListDTO), meta:{page, limit, total, totalPages: Math.ceil(total/limit)}})
    } catch (error) {
        return NextResponse.json({error:error},{status:500})
    }
}