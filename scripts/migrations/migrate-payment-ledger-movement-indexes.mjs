import mongoose from "mongoose";

const DATABASES = Object.freeze({
  staging: "costaspanish-lms-demo",
  production: "costaspanish_lms",
});
const appEnv = process.env.APP_ENV;
const expectedDatabase = Object.hasOwn(DATABASES, appEnv)
  ? DATABASES[appEnv] : null;
const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
const args = process.argv.slice(2);

if (args.some((arg) => arg !== "--apply") || args.length > 1) {
  throw new Error('Only one "--apply" argument is supported.');
}
const APPLY = args.length === 1;
if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");
if (!expectedDatabase) {
  throw new Error('APP_ENV must be "staging" or "production".');
}
if (process.env.MONGODB_DB_NAME !== expectedDatabase) {
  throw new Error(
    `Expected database "${expectedDatabase}" for APP_ENV "${appEnv}", ` +
      `got "${process.env.MONGODB_DB_NAME}".`,
  );
}
if (APPLY && appEnv === "production" &&
    process.env.ALLOW_PRODUCTION_MIGRATION !== "true") {
  throw new Error(
    "Production --apply requires ALLOW_PRODUCTION_MIGRATION=true.",
  );
}

const LEGACY_NAME = "unique_active_payment_per_voucher";
const IDEMPOTENCY_FILTER = { idempotencyKey: { $type: "string" } };
const DESIRED = [
  {
    name: "teacherId_1_voucherId_1_status_1",
    key: { teacherId: 1, voucherId: 1, status: 1 },
    unique: false,
  },
  {
    name: "unique_payment_idempotency_key_per_teacher",
    key: { teacherId: 1, idempotencyKey: 1 },
    unique: true,
    partialFilterExpression: IDEMPOTENCY_FILTER,
  },
];

function sameObject(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  return keysA.length === keysB.length &&
    keysA.every((key, i) =>
      key === keysB[i] && sameObject(a[key], b[key]));
}

function sameKey(a, b) {
  return JSON.stringify(Object.entries(a ?? {})) ===
    JSON.stringify(Object.entries(b ?? {}));
}

function correct(index, desired) {
  return sameKey(index.key, desired.key) &&
    Boolean(index.unique) === desired.unique &&
    sameObject(index.partialFilterExpression ?? null,
      desired.partialFilterExpression ?? null) &&
    !index.sparse;
}

function inspect(indexes) {
  const anomalies = [];
  const desired = DESIRED.map((definition) => {
    const named = indexes.find((index) => index.name === definition.name);
    const sameKeyIndexes = indexes.filter((index) =>
      index.name !== definition.name && sameKey(index.key, definition.key));
    for (const index of sameKeyIndexes) {
      anomalies.push({
        reason: "another index uses a desired key",
        desired: definition.name,
        existing: index.name,
        index,
      });
    }
    if (named && !correct(named, definition)) {
      anomalies.push({
        reason: "conflicting definition under desired name",
        desired: definition.name,
        index: named,
      });
    }
    return {
      name: definition.name,
      status: !named ? "missing" :
        correct(named, definition) ? "already_correct" :
          "conflicting_definition",
    };
  });
  return {
    desired,
    legacy: indexes.some((index) => index.name === LEGACY_NAME)
      ? "present_and_should_drop" : "absent",
    anomalies,
  };
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME });

try {
  const connectedDatabase = mongoose.connection.db?.databaseName;
  if (connectedDatabase !== process.env.MONGODB_DB_NAME) {
    throw new Error(
      `Connected database "${connectedDatabase}" does not match ` +
        `MONGODB_DB_NAME "${process.env.MONGODB_DB_NAME}".`,
    );
  }
  console.log(`database: ${connectedDatabase}`);
  console.log(`mode: ${APPLY ? "APPLY" : "DRY_RUN"}`);

  const collection = mongoose.connection.collection("paymentledgerentries");
  const indexesBefore = await collection.indexes();
  const entriesExamined = await collection.countDocuments({});
  const documentsEligibleForIdempotencyIndex =
    await collection.countDocuments(IDEMPOTENCY_FILTER);
  const duplicateGroups = await collection.aggregate([
    { $match: IDEMPOTENCY_FILTER },
    { $group: {
      _id: { teacherId: "$teacherId", idempotencyKey: "$idempotencyKey" },
      count: { $sum: 1 },
      documentIds: { $push: "$_id" },
    } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  const plan = inspect(indexesBefore);

  console.log("currentIndexes:");
  console.dir(indexesBefore.map((index) => ({
    name: index.name,
    key: index.key,
    unique: Boolean(index.unique),
    partialFilterExpression: index.partialFilterExpression,
    ...(index.sparse !== undefined ? { sparse: index.sparse } : {}),
  })), { depth: null });
  console.log("desiredIndexes:");
  console.dir(plan.desired, { depth: null });
  console.log(`legacyIndex: ${plan.legacy}`);
  console.log(`entriesExamined: ${entriesExamined}`);
  console.log(
    `documentsEligibleForIdempotencyIndex: ` +
      documentsEligibleForIdempotencyIndex,
  );
  console.log(`duplicateGroups: ${duplicateGroups.length}`);
  if (duplicateGroups.length) console.dir(duplicateGroups, { depth: null });
  console.log(`anomalies/conflicts: ${plan.anomalies.length}`);
  if (plan.anomalies.length) console.dir(plan.anomalies, { depth: null });
  console.log(`pendingChanges: ${plan.desired.filter((x) => x.status === "missing").length +
    (plan.legacy === "present_and_should_drop" ? 1 : 0)}`);

  if (!APPLY) {
    console.log("DRY_RUN finished. No indexes or documents were modified.");
  } else {
    if (plan.anomalies.length || duplicateGroups.length) {
      throw new Error("Index migration aborted: preflight conflicts found.");
    }

    // Keep the legacy index until the desired indexes are present.
    for (const definition of DESIRED) {
      if (plan.desired.find((x) => x.name === definition.name).status !== "missing") {
        continue;
      }
      const name = await collection.createIndex(definition.key, {
        name: definition.name,
        ...(definition.unique ? { unique: true } : {}),
        ...(definition.partialFilterExpression
          ? { partialFilterExpression: definition.partialFilterExpression } : {}),
      });
      if (name !== definition.name) {
        throw new Error(`createIndex returned unexpected name "${name}".`);
      }
      console.log(`Created index: ${name}`);
    }
    if (plan.legacy === "present_and_should_drop") {
      await collection.dropIndex(LEGACY_NAME);
      console.log(`Dropped legacy index: ${LEGACY_NAME}`);
    }

    const indexesAfter = await collection.indexes();
    const verified = inspect(indexesAfter);
    if (verified.legacy !== "absent" || verified.anomalies.length ||
      verified.desired.some((x) => x.status !== "already_correct")) {
      console.dir(indexesAfter, { depth: null });
      throw new Error("Post-migration index verification failed.");
    }
    console.log("Post-verification passed: desired indexes present; legacy absent.");
  }
} finally {
  await mongoose.disconnect();
}
