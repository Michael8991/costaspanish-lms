"use client";

import {
  Check,
  ChevronDown,
  Circle,
  ListTodo,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import CustomModal from "@/components/ui/CustomModal";
import type {
  TeacherTaskDTO,
  TeacherTaskPriority,
} from "@/lib/dto/teacher-task.dto";
import { useTeacherTasks } from "@/lib/hooks/useTeacherTasks";
import { getTeacherTaskPriorityVisual } from "@/lib/utils/teacher-task-priority";

interface TeacherTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const taskPriorities: TeacherTaskPriority[] = ["low", "medium", "high"];

const taskCreatedDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

const taskCreatedTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const taskDayFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Madrid",
});

function formatTaskCreatedAt(date: string): string {
  const taskDate = new Date(date);

  if (Number.isNaN(taskDate.getTime())) {
    return "";
  }

  const datePart = taskCreatedDateFormatter
    .format(taskDate)
    .replace(".", "");
  const timePart = taskCreatedTimeFormatter.format(taskDate);

  return `${datePart} · ${timePart}`;
}

function getTaskDayKey(date: string | Date): string | null {
  const taskDate = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(taskDate.getTime())) {
    return null;
  }

  return taskDayFormatter.format(taskDate);
}

function sortOpenTasks(
  first: TeacherTaskDTO,
  second: TeacherTaskDTO,
) {
  const createdAtDifference =
    new Date(first.createdAt).getTime() -
    new Date(second.createdAt).getTime();

  return createdAtDifference || first.id.localeCompare(second.id);
}

function sortCompletedTasks(
  first: TeacherTaskDTO,
  second: TeacherTaskDTO,
) {
  const completedAtDifference =
    new Date(second.completedAt ?? second.updatedAt).getTime() -
    new Date(first.completedAt ?? first.updatedAt).getTime();

  return completedAtDifference || second.id.localeCompare(first.id);
}

interface TeacherTaskItemProps {
  task: TeacherTaskDTO;
  order?: number;
  disabled: boolean;
  onToggle: (task: TeacherTaskDTO) => void;
  onPriorityChange: (taskId: string, priority: TeacherTaskPriority) => void;
  onDelete: (taskId: string) => void;
}

function TeacherTaskItem({
  task,
  order,
  disabled,
  onToggle,
  onPriorityChange,
  onDelete,
}: TeacherTaskItemProps) {
  const isCompleted = task.status === "completed";
  const priorityVisual = getTeacherTaskPriorityVisual(task.priority);

  const handlePriorityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onPriorityChange(task.id, event.target.value as TeacherTaskPriority);
  };

  return (
    <li
      className={`rounded-2xl border border-white/10 bg-white/[0.05] p-3 transition ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(task)}
          aria-label={
            isCompleted ? "Reabrir tarea" : "Marcar tarea como completada"
          }
          className={`mt-0.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isCompleted
              ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
              : "border-white/20 text-white/50 hover:border-emerald-300/40 hover:text-emerald-200"
          }`}
        >
          {isCompleted ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            {order !== undefined && (
              <span className="shrink-0 text-sm font-semibold text-white/45">
                {order}.
              </span>
            )}
            <p
              className={`break-words text-sm font-medium text-white ${
                isCompleted ? "line-through" : ""
              }`}
            >
              {task.title}
            </p>
          </div>
          {task.notes && (
            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-white/45">
              {task.notes}
            </p>
          )}
          <p className="mt-1 text-[11px] text-white/35">
            Añadida: {formatTaskCreatedAt(task.createdAt)}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor={`task-priority-${task.id}`} className="sr-only">
              Prioridad de {task.title}
            </label>
            <select
              id={`task-priority-${task.id}`}
              value={task.priority}
              disabled={disabled}
              onChange={handlePriorityChange}
              className={`cursor-pointer rounded-full border px-2 py-1 text-[11px]  outline-none disabled:cursor-not-allowed ${priorityVisual.className}`}
            >
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getTeacherTaskPriorityVisual(priority).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete(task.id)}
          aria-label={`Eliminar tarea: ${task.title}`}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-white/35 transition hover:bg-red-400/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export default function TeacherTasksModal({
  isOpen,
  onClose,
}: TeacherTasksModalProps) {
  const {
    tasks,
    summary,
    createTask,
    completeTask,
    reopenTask,
    changePriority,
    deleteTask,
    refresh,
    isLoading,
    isMutating,
    error,
  } = useTeacherTasks();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TeacherTaskPriority>("medium");
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const todayTaskDay = getTaskDayKey(new Date());
  const {
    highPriorityTasks,
    newTodayTasks,
    remainingOpenTasks,
    completedTodayTasks,
    openTaskOrder,
  } = useMemo(() => {
    const seenTaskIds = new Set<string>();
    const openTasks = tasks
      .filter((task) => task.status === "open")
      .sort(sortOpenTasks);
    const highPriority = openTasks.filter(
      (task) => task.priority === "high",
    );

    highPriority.forEach((task) => seenTaskIds.add(task.id));

    const newToday = openTasks.filter(
      (task) =>
        !seenTaskIds.has(task.id) &&
        getTaskDayKey(task.createdAt) === todayTaskDay,
    );

    newToday.forEach((task) => seenTaskIds.add(task.id));

    const remaining = openTasks.filter(
      (task) => !seenTaskIds.has(task.id),
    );

    remaining.forEach((task) => seenTaskIds.add(task.id));

    const completed = tasks
      .filter((task) => task.status === "completed")
      .sort(sortCompletedTasks);
    const orderedOpenTasks = [
      ...highPriority,
      ...newToday,
      ...remaining,
    ];

    return {
      highPriorityTasks: highPriority,
      newTodayTasks: newToday,
      remainingOpenTasks: remaining,
      completedTodayTasks: completed,
      openTaskOrder: new Map(
        orderedOpenTasks.map((task, index) => [task.id, index + 1]),
      ),
    };
  }, [tasks, todayTaskDay]);
  const openTaskGroups = [
    {
      key: "high-priority",
      title: "Alta prioridad",
      tasks: highPriorityTasks,
    },
    {
      key: "new-today",
      title: "Nuevas de hoy",
      tasks: newTodayTasks,
    },
    {
      key: "remaining",
      title: "Pendientes",
      tasks: remainingOpenTasks,
    },
  ];

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setFormError("Escribe el título de la tarea.");
      return;
    }

    setFormError(null);

    try {
      await createTask({ title: normalizedTitle, priority });
      setTitle("");
      setPriority("medium");
    } catch {
      setFormError("No se pudo crear la tarea.");
    }
  };

  const handleToggleTask = async (task: TeacherTaskDTO) => {
    try {
      if (task.status === "completed") {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
    } catch {
      // El hook expone el mensaje de error para el panel.
    }
  };

  const handlePriorityChange = async (
    taskId: string,
    nextPriority: TeacherTaskPriority,
  ) => {
    try {
      await changePriority(taskId, nextPriority);
    } catch {
      // El hook expone el mensaje de error para el panel.
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;

    try {
      await deleteTask(taskId);
    } catch {
      // El hook expone el mensaje de error para el panel.
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tareas"
      maxWidth="2xl"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar tareas"
          className="absolute -top-11 right-0 grid size-8 cursor-pointer place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-sm text-white/50">
          Anota recordatorios rápidos y márcalos cuando estén listos.
        </p>

        <form
          onSubmit={(event) => void handleCreateTask(event)}
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_8rem_auto]"
        >
          <div>
            <label htmlFor="teacher-task-title" className="sr-only">
              Nueva tarea
            </label>
            <input
              id="teacher-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Añadir una tarea..."
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#e34040]/60 focus:ring-2 focus:ring-[#e34040]/15 "
            />
          </div>

          <div>
            <label htmlFor="teacher-task-priority" className="sr-only">
              Prioridad
            </label>
            <select
              id="teacher-task-priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TeacherTaskPriority)
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-gray-700 px-3 text-sm text-white outline-none focus:border-[#e34040]/60"
            >
              {taskPriorities.map((taskPriority) => (
                <option key={taskPriority} value={taskPriority}>
                  {getTeacherTaskPriorityVisual(taskPriority).label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isMutating}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#e34040] px-4 text-sm font-medium text-white transition hover:bg-[#cc3939] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Añadir
          </button>
        </form>

        {formError && (
          <p role="alert" className="mt-2 text-xs text-red-200">
            {formError}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2"
          >
            <p className="text-xs text-red-100">
              No se pudieron cargar las tareas.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="cursor-pointer text-xs font-medium text-red-100 underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-white">Tareas abiertas</h3>
              <p className="mt-0.5 text-xs text-white/35">
                Ordenadas para que veas primero lo más útil.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/55">
              {summary.open}
            </span>
          </div>

          {isLoading ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center text-sm text-white/40">
              Cargando tareas...
            </p>
          ) : summary.open === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center">
              <ListTodo className="mx-auto h-6 w-6 text-white/20" />
              <p className="mt-2 text-sm text-white/45">
                No hay tareas pendientes.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {openTaskGroups.map(
                (group) =>
                  group.tasks.length > 0 && (
                    <section key={group.key}>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-white/55">
                          {group.title}
                        </h3>
                        <span className="text-[11px] text-white/30">
                          {group.tasks.length}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-2">
                        {group.tasks.map((task) => (
                          <TeacherTaskItem
                            key={task.id}
                            task={task}
                            order={openTaskOrder.get(task.id)}
                            disabled={isMutating}
                            onToggle={(selectedTask) =>
                              void handleToggleTask(selectedTask)
                            }
                            onPriorityChange={(taskId, nextPriority) =>
                              void handlePriorityChange(
                                taskId,
                                nextPriority,
                              )
                            }
                            onDelete={(taskId) =>
                              void handleDeleteTask(taskId)
                            }
                          />
                        ))}
                      </ul>
                    </section>
                  ),
              )}
            </div>
          )}

          {completedTodayTasks.length > 0 && (
            <section className="mt-5 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() =>
                  setIsCompletedOpen((currentValue) => !currentValue)
                }
                aria-expanded={isCompletedOpen}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg py-1 text-left"
              >
                <span className="text-sm  text-white/70">
                  Completadas hoy ({completedTodayTasks.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-white/40 transition ${
                    isCompletedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isCompletedOpen && (
                <ul className="mt-3 space-y-2">
                  {completedTodayTasks.map((task) => (
                    <TeacherTaskItem
                      key={task.id}
                      task={task}
                      disabled={isMutating}
                      onToggle={(selectedTask) =>
                        void handleToggleTask(selectedTask)
                      }
                      onPriorityChange={(taskId, nextPriority) =>
                        void handlePriorityChange(taskId, nextPriority)
                      }
                      onDelete={(taskId) => void handleDeleteTask(taskId)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </CustomModal>
  );
}
