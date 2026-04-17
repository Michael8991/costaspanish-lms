type BuildCourseTemplateListQueryParams = {
  ownerTeacherId: string;
  searchParams: URLSearchParams;
};

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function parseCourseTemplateSort(sortRaw: string | null): Record<string, 1 | -1> {
  switch (sortRaw) {
    case "createdAt_asc":
      return { createdAt: 1 as const };
    case "updatedAt_asc":
      return { updatedAt: 1 as const };
    case "code_asc":
      return { code: 1 as const };
    case "code_desc":
      return { code: -1 as const };
    case "updatedAt_desc":
    default:
      return { updatedAt: -1 as const };
  }
}

export function buildCourseTemplateListQuery({
  ownerTeacherId,
  searchParams,
}: BuildCourseTemplateListQueryParams) {
  const search = (searchParams.get("search") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const level = (searchParams.get("level") || "").trim();
  const category = (searchParams.get("category") || "").trim();

  const query: Record<string, unknown> = {
    ownerTeacherId,
  };

  if (status) query.status = status;
  if (level) query["pedagogicalMeta.level"] = level;
  if (category) query["pedagogicalMeta.category"] = category;

  if (search) {
    query.$or = [
      { code: { $regex: search, $options: "i" } },
      { internalName: { $regex: search, $options: "i" } },
      { "storefront.publicTitle": { $regex: search, $options: "i" } },
      { "pedagogicalMeta.category": { $regex: search, $options: "i" } },
    ];
  }

  return query;
}