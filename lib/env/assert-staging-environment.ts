export const STAGING_DATABASE_NAME = "costaspanish-lms-demo";

export function assertStagingEnvironment(): void {
  if (process.env.APP_ENV !== "staging") {
    return;
  }

  const databaseName = process.env.MONGODB_DB_NAME;
  const firebaseProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Unsafe staging configuration: expected database ` +
        `"${STAGING_DATABASE_NAME}", received "${databaseName}".`,
    );
  }

  if (!firebaseProjectId?.includes("staging")) {
    throw new Error(
      `Unsafe staging configuration: Firebase project ` +
        `"${firebaseProjectId}" does not look like staging.`,
    );
  }

  if (process.env.DEMO_MODE !== "true") {
    throw new Error(
      'Unsafe staging configuration: DEMO_MODE must be "true".',
    );
  }
}
