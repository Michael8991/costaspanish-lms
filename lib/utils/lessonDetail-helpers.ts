export function formatLessonDate(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const dateLabel = startDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const startTime = startDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime = endDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel} · ${startTime} - ${endTime}`;
}

export function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getTotalResources(blocks: { resources: string[] }[]) {
  const resourceIds = blocks.flatMap((block) => block.resources ?? []);
  return Array.from(new Set(resourceIds));
}
