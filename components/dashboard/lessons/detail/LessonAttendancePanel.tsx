import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import { UserCheck, Users } from "lucide-react";

interface LessonAttendancePanelProps {
  lesson: LessonDetailDTO;
}

export default function LessonAttendancePanel({
  lesson,
}: LessonAttendancePanelProps) {
  return (
    <aside className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Alumnos y asistencia
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Control de asistencia y créditos.
            </p>
          </div>

          <Users size={18} className="text-gray-400" />
        </div>

        <div className="space-y-3">
          {lesson.attendees.map((attendee, index) => (
            <div
              key={`${attendee.studentId}-${index}`}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-950">
                    Alumno {index + 1}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    ID: {attendee.studentId.slice(-6)}
                  </p>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {formatLabel(attendee.attendanceStatus)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                  <p className="text-gray-400">Créditos</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {attendee.creditsToConsume ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                  <p className="text-gray-400">Bono</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {attendee.voucherId ? "Asignado" : "Sin bono"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8d2323]"
        >
          <UserCheck size={15} />
          Completar clase
        </button>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-950">Notas rápidas</h2>

        <p className="mt-2 text-sm text-gray-500">
          Aquí podremos mostrar preparación, deberes y foco de la próxima clase.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          {lesson.preparationNotes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Preparación
              </p>
              <p className="mt-1 text-gray-600">{lesson.preparationNotes}</p>
            </div>
          )}

          {lesson.homeworkAssigned && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Homework
              </p>
              <p className="mt-1 text-gray-600">{lesson.homeworkAssigned}</p>
            </div>
          )}

          {lesson.nextLessonFocus && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Próxima clase
              </p>
              <p className="mt-1 text-gray-600">{lesson.nextLessonFocus}</p>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
