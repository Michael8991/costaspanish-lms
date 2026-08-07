import mongoose from "mongoose";

import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";

function getStagingMongoConfig(): { databaseName: string; mongoUri: string } {
  const databaseName = process.env.MONGODB_DB_NAME;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (process.env.APP_ENV !== "staging") {
    throw new Error('Inspection blocked: APP_ENV must be "staging".');
  }

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Inspection blocked: expected database "${STAGING_DATABASE_NAME}", ` +
        `received "${databaseName}".`,
    );
  }

  if (!mongoUri) {
    throw new Error("Inspection blocked: MONGODB_URI or MONGO_URI is missing.");
  }

  return { databaseName, mongoUri };
}

async function inspectResourceIndexes(): Promise<void> {
  const { databaseName, mongoUri } = getStagingMongoConfig();

  await mongoose.connect(mongoUri, {
    dbName: databaseName,
    autoCreate: false,
    autoIndex: false,
  });

  const indexes = await mongoose.connection
    .collection("resources")
    .indexes();

  console.log(
    JSON.stringify(
      {
        appEnv: process.env.APP_ENV,
        databaseName,
        collection: "resources",
        indexes,
      },
      null,
      2,
    ),
  );
}

inspectResourceIndexes()
  .catch(error => {
    console.error(
      error instanceof Error
        ? error.message
        : "Resource index inspection failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
