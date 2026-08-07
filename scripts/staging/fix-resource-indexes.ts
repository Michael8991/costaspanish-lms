import mongoose from "mongoose";

import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";

const INVALID_RESOURCE_INDEXES = [
  {
    name: "ownerTeacherId_1_levels_1_skills_1_pedagogicalType_1",
    key: {
      ownerTeacherId: 1,
      levels: 1,
      skills: 1,
      pedagogicalType: 1,
    },
  },
  {
    name: "ownerTeacherId_1_deliveryModes_1_lessonStages_1",
    key: {
      ownerTeacherId: 1,
      deliveryModes: 1,
      lessonStages: 1,
    },
  },
] as const;

function getStagingMongoConfig(): { databaseName: string; mongoUri: string } {
  const databaseName = process.env.MONGODB_DB_NAME;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (process.env.APP_ENV !== "staging") {
    throw new Error('Index fix blocked: APP_ENV must be "staging".');
  }

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Index fix blocked: expected database "${STAGING_DATABASE_NAME}", ` +
        `received "${databaseName}".`,
    );
  }

  if (!mongoUri) {
    throw new Error("Index fix blocked: MONGODB_URI or MONGO_URI is missing.");
  }

  return { databaseName, mongoUri };
}

function hasExpectedKey(
  actualKey: Record<string, unknown>,
  expectedKey: Record<string, number>,
): boolean {
  const actualEntries = Object.entries(actualKey);
  const expectedEntries = Object.entries(expectedKey);

  return (
    actualEntries.length === expectedEntries.length &&
    actualEntries.every(
      ([field, direction], index) =>
        field === expectedEntries[index]?.[0] &&
        direction === expectedEntries[index]?.[1],
    )
  );
}

async function fixResourceIndexes(): Promise<void> {
  const { databaseName, mongoUri } = getStagingMongoConfig();

  await mongoose.connect(mongoUri, {
    dbName: databaseName,
    autoCreate: false,
    autoIndex: false,
  });

  const collection = mongoose.connection.collection("resources");
  const indexes = await collection.indexes();
  const removed: string[] = [];
  const alreadyAbsent: string[] = [];

  for (const invalidIndex of INVALID_RESOURCE_INDEXES) {
    const existingIndex = indexes.find(index => index.name === invalidIndex.name);

    if (!existingIndex) {
      alreadyAbsent.push(invalidIndex.name);
      continue;
    }

    if (!hasExpectedKey(existingIndex.key, invalidIndex.key)) {
      throw new Error(
        `Index fix blocked: "${invalidIndex.name}" does not have the expected key.`,
      );
    }

    await collection.dropIndex(invalidIndex.name);
    removed.push(invalidIndex.name);
  }

  console.log(
    JSON.stringify(
      {
        appEnv: process.env.APP_ENV,
        databaseName,
        collection: "resources",
        removed,
        alreadyAbsent,
      },
      null,
      2,
    ),
  );
}

fixResourceIndexes()
  .catch(error => {
    console.error(
      error instanceof Error ? error.message : "Resource index fix failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
