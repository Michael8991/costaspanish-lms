import type { LessonBlockType } from "@/lib/types/lesson";
import { getLessonBlockTypeVisual } from "@/lib/utils/lesson-block-visuals";

interface LessonBlockCategoryStackProps {
  categories: readonly LessonBlockType[];
  tone?: "light" | "dark";
}

export default function LessonBlockCategoryStack({
  categories,
  tone = "light",
}: LessonBlockCategoryStackProps) {
  const uniqueCategories = [...new Set(categories)];
  const displayedCategories = uniqueCategories.slice(0, 3);
  const hiddenCount = Math.max(0, uniqueCategories.length - 3);
  const borderClassName =
    tone === "dark"
      ? "border-slate-950/80 ring-white/15"
      : "border-white ring-slate-200/80";

  return (
    <div
      className="group/categories flex min-h-8 max-w-full items-center"
      aria-label={uniqueCategories
        .map((category) => getLessonBlockTypeVisual(category).label)
        .join(", ")}
    >
      {displayedCategories.map((category, index) => {
        const visual = getLessonBlockTypeVisual(category);
        const CategoryIcon = visual.icon;

        return (
          <span
            key={category}
            title={visual.label}
            style={{ zIndex: displayedCategories.length - index }}
            className={`inline-flex h-8 max-w-8 shrink-0 items-center overflow-hidden rounded-full border shadow-sm ring-1 ring-inset transition-[max-width,margin] duration-300 ease-out group-hover/categories:max-w-40 ${
              index === 0
                ? ""
                : "-ml-2 group-hover/categories:ml-1"
            } ${borderClassName} ${visual.iconClassName}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center">
              <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap pr-3 text-[11px] font-semibold opacity-0 transition-opacity delay-0 duration-150 group-hover/categories:opacity-100 group-hover/categories:delay-100">
              {visual.label}
            </span>
          </span>
        );
      })}

      {hiddenCount > 0 && (
        <span
          className={`relative z-0 -ml-2 inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold shadow-sm ring-1 ring-inset transition-[margin] duration-300 group-hover/categories:ml-1 ${
            tone === "dark"
              ? "border-slate-950/80 bg-slate-800 text-white/75 ring-white/15"
              : "border-white bg-slate-100 text-slate-600 ring-slate-200/80"
          }`}
          title={`${hiddenCount} categoría${hiddenCount === 1 ? "" : "s"} más`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
