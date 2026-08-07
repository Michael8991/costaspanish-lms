function requireE2EEnv(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required E2E environment variable: ${name}`,
    );
  }

  return value;
}

export const e2eEnv = {
  teacherEmail: requireE2EEnv(
    "E2E_TEACHER_EMAIL",
  ),

  teacherPassword: requireE2EEnv(
    "E2E_TEACHER_PASSWORD",
  ),
};