export type LessonViewMode = "day" | "week" | "month"

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endExclusiveOfDay(date: Date) {
    const d = startOfDay(date);
    d.setDate(d.getDate() + 1);
    return d;
}

function startOfWeekMonday(date: Date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function endExclusiveOfWeekMonday(date: Date) {
    const start = startOfWeekMonday(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return end;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1,0,0,0,0)
}

function endExclusiveOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1,1,0,0,0,0)
}

export function getLessonDateRange({
    view, date 
}: { view: LessonViewMode; date: Date }) {
     if (view === "day") {
    return {
      start: startOfDay(date),
      end: endExclusiveOfDay(date),
    };
  }else if (view === "month") {
    return {
      start: startOfMonth(date),
      end: endExclusiveOfMonth(date),
    };
     } else {
         return {
             start: startOfWeekMonday(date),
             end: endExclusiveOfWeekMonday(date),
         }
  };
}