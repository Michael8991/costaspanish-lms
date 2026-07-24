"use client";

import { useStudentsOverview } from "@/lib/hooks/useStudentsOverview";

import StudentsTable from "./StudentsTable";
import SummaryStudentsData from "./SummaryStudentsData";

export default function StudentsOverview({ locale }: { locale: string }) {
  const {
    items,
    pagination,
    summary,
    search,
    isLoading,
    hasLoaded,
    error,
    setSearch,
    goToPreviousPage,
    goToNextPage,
  } = useStudentsOverview();

  return (
    <>
      <SummaryStudentsData summary={summary} isLoading={!hasLoaded} />
      <StudentsTable
        locale={locale}
        items={items}
        pagination={pagination}
        search={search}
        isLoading={isLoading}
        error={error}
        onSearchChange={setSearch}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
      />
    </>
  );
}
