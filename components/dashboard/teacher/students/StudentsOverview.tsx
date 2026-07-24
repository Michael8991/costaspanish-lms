"use client";

import { useStudentsOverview } from "@/lib/hooks/useStudentsOverview";

import StudentsFilters from "./StudentsFilters";
import StudentsTable from "./StudentsTable";
import SummaryStudentsData from "./SummaryStudentsData";

export default function StudentsOverview({ locale }: { locale: string }) {
  const {
    items,
    pagination,
    summary,
    search,
    level,
    status,
    planType,
    classType,
    planHealth,
    hasActiveFilters,
    isLoading,
    hasLoaded,
    error,
    setSearch,
    setLevel,
    setStatus,
    setPlanType,
    setClassType,
    setPlanHealth,
    clearFilters,
    goToPreviousPage,
    goToNextPage,
  } = useStudentsOverview();

  return (
    <>
      <SummaryStudentsData summary={summary} isLoading={!hasLoaded} />
      <StudentsFilters
        search={search}
        level={level}
        status={status}
        planType={planType}
        classType={classType}
        planHealth={planHealth}
        onSearchChange={setSearch}
        onLevelChange={setLevel}
        onStatusChange={setStatus}
        onPlanTypeChange={setPlanType}
        onClassTypeChange={setClassType}
        onPlanHealthChange={setPlanHealth}
        onClearFilters={clearFilters}
      />
      <StudentsTable
        locale={locale}
        items={items}
        pagination={pagination}
        hasActiveFilters={hasActiveFilters}
        isLoading={isLoading}
        error={error}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
      />
    </>
  );
}
