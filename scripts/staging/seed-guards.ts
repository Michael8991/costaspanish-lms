import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";

const REQUIRED_CONFIRMATION = "SEED_COSTASPANISH_STAGING";

type AssertStagingSeedOptions = {
  confirmation?: string;
};

export function assertStagingSeedEnvironment({
  confirmation,
}: AssertStagingSeedOptions): void {
  const appEnv = process.env.APP_ENV;
  const databaseName = process.env.MONGODB_DB_NAME;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  const seedAllowed = process.env.ALLOW_STAGING_SEED;

  if (appEnv !== "staging") {
    throw new Error(
      `Seed blocked: APP_ENV must be "staging". Received: "${appEnv}".`,
    );
  }

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Seed blocked: expected database "${STAGING_DATABASE_NAME}", ` +
        `received "${databaseName}".`,
    );
  }

  if (!mongoUri) {
    throw new Error(
      "Seed blocked: MONGODB_URI or MONGO_URI is missing.",
    );
  }

  if (seedAllowed !== "true") {
    throw new Error(
      'Seed blocked: ALLOW_STAGING_SEED must be set to "true".',
    );
  }

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Seed blocked: pass --confirm=${REQUIRED_CONFIRMATION}. ` +
        "With npm 11, add an extra -- before that argument.",
    );
  }

  const forbiddenDatabaseNames = [
    "costaspanish",
    "costaspanish_production",
    "production",
    "prod",
  ];

  if (
    forbiddenDatabaseNames.some(name =>
      databaseName.toLowerCase() === name,
    )
  ) {
    throw new Error(
      `Seed blocked: "${databaseName}" looks like a production database.`,
    );
  }
}
