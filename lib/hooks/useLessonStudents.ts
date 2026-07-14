"use client"

import { useEffect, useState } from "react";

type RawStudent = {
  _id: string;
  fullName?: string;
  name?: string;
  contactEmail?: string;
  activePlans?: RawPlans[];
}

type RawPlans = {
  _id: string;
  classType: string;
  status: string;
  creditsRemaining: number;
  creditsTotal?: number;
  validUntil: string | null;
}

export type LessonStudentPlan = {
  _id: string;
  classType: string;
  status: string;
  creditsRemaining: number;
  creditsTotal?: number;
  validUntil: string | null;
};

export type LessonStudent = {
  _id: string;
  fullName: string;
  contactEmail?: string;
  activePlans: LessonStudentPlan[];
};

type UseLessonStudentsResult = {
  students: LessonStudent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLessonStudents(): UseLessonStudentsResult {
  const [students, setStudents] = useState<LessonStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/students?includeActivePlans.status=active", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Error al cargar alumnos");
      }

      setStudents(data.items ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    isLoading,
    error,
    refetch: fetchStudents,
  };
}