import mongoose from "mongoose";

const ALLOWED_DATABASES = Object.freeze({
  staging: "costaspanish-lms-demo",
  production: "costaspanish_lms",
});

const appEnv = process.env.APP_ENV;
const expectedDatabase = Object.hasOwn(ALLOWED_DATABASES, appEnv)
  ? ALLOWED_DATABASES[appEnv]
  : null;

const uri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI;

const APPLY = process.argv.includes("--apply");

if (process.argv.slice(2).some((arg) => arg !== "--apply")) {
  throw new Error('Only the "--apply" argument is supported.');
}

if (!uri) {
  throw new Error(
    "MONGODB_URI or MONGO_URI is required",
  );
}

if (!expectedDatabase) {
  throw new Error(
    'APP_ENV must be "staging" or "production".',
  );
}

if (
  process.env.MONGODB_DB_NAME !==
  expectedDatabase
) {
  throw new Error(
    `Expected database "${expectedDatabase}" for APP_ENV "${appEnv}", ` +
      `got "${process.env.MONGODB_DB_NAME}".`,
  );
}

if (
  APPLY &&
  appEnv === "production" &&
  process.env.ALLOW_PRODUCTION_MIGRATION !== "true"
) {
  throw new Error(
    "Production --apply requires ALLOW_PRODUCTION_MIGRATION=true.",
  );
}

function isValidEuroAmount(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function isValidCents(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function toCents(value) {
  return Math.round(value * 100);
}

await mongoose.connect(uri, {
  dbName: process.env.MONGODB_DB_NAME,
});

try {
  const actualDatabase =
    mongoose.connection.db?.databaseName;

  if (actualDatabase !== process.env.MONGODB_DB_NAME) {
    throw new Error(
      `Connected database "${actualDatabase}" does not match ` +
        `MONGODB_DB_NAME "${process.env.MONGODB_DB_NAME}".`,
    );
  }

  console.log(`database: ${actualDatabase}`);
  console.log(`mode: ${APPLY ? "APPLY" : "DRY_RUN"}`);

  const collection =
    mongoose.connection.collection(
      "paymentledgerentries",
    );

  const entries =
    await collection.find({}).toArray();

  const candidates = [];
  const anomalies = [];
  let canonicalValid = 0;
  const byStatus = Object.create(null);

  for (const entry of entries) {
    const status = entry.status ?? "<missing>";
    byStatus[status] ??= {
      examined: 0,
      canonicalValid: 0,
      candidates: 0,
      anomalies: 0,
    };
    byStatus[status].examined += 1;

    /*
     * Ya existe canonical cents.
     * Comprobamos también que coincida con legacy amount.
     */
    if (isValidCents(entry.amountCents)) {
      if (entry.amount != null &&
          (!isValidEuroAmount(entry.amount) ||
            !isValidCents(toCents(entry.amount)) ||
            entry.amountCents !== toCents(entry.amount))) {
        anomalies.push({
          ledgerId: entry._id.toString(),
          reason:
            "amountCents differs from legacy amount",
          amount: entry.amount,
          amountCents: entry.amountCents,
          expectedAmountCents:
            toCents(entry.amount),
        });
        byStatus[status].anomalies += 1;
      } else {
        canonicalValid += 1;
        byStatus[status].canonicalValid += 1;
      }

      continue;
    }

    /*
     * amountCents existe pero es inválido.
     */
    if (
      entry.amountCents !== undefined &&
      entry.amountCents !== null
    ) {
      anomalies.push({
        ledgerId: entry._id.toString(),
        reason: "invalid existing amountCents",
        amount: entry.amount,
        amountCents: entry.amountCents,
      });
      byStatus[status].anomalies += 1;

      continue;
    }

    /*
     * Legacy amount debe poder convertirse
     * de forma determinista.
     */
    if (!isValidEuroAmount(entry.amount)) {
      anomalies.push({
        ledgerId: entry._id.toString(),
        reason:
          "missing amountCents and invalid legacy amount",
        amount: entry.amount,
      });
      byStatus[status].anomalies += 1;

      continue;
    }

    const amountCents =
      toCents(entry.amount);

    if (!isValidCents(amountCents)) {
      anomalies.push({
        ledgerId: entry._id.toString(),
        reason:
          "converted amountCents is invalid",
        amount: entry.amount,
        amountCents,
      });
      byStatus[status].anomalies += 1;

      continue;
    }

    candidates.push({
      ledgerId: entry._id,
      voucherId:
        entry.voucherId?.toString(),
      status: entry.status,
      source: entry.source,
      amount: entry.amount,
      amountCents,
    });
    byStatus[status].candidates += 1;
  }

  console.log(`\nledgerEntriesExamined: ${entries.length}`);
  console.log(`canonicalValid: ${canonicalValid}`);
  console.log("By status:");
  console.table(byStatus);

  console.log(
    `Migration candidates: ${candidates.length}`,
  );

  if (candidates.length > 0) {
    console.dir(
      candidates.map((candidate) => ({
        ledgerId:
          candidate.ledgerId.toString(),
        voucherId:
          candidate.voucherId,
        status:
          candidate.status,
        source:
          candidate.source,
        amount:
          candidate.amount,
        amountCents:
          candidate.amountCents,
      })),
      { depth: null },
    );
  }

  console.log(
    `\nAnomalies: ${anomalies.length}`,
  );

  if (anomalies.length > 0) {
    console.dir(
      anomalies,
      { depth: null },
    );

    if (APPLY) {
      throw new Error(
        "Migration aborted because anomalies were found.",
      );
    }
  }

  if (!APPLY) {
    console.log(
      "\nDRY_RUN finished. No documents were modified.",
    );
  } else {
    let modified = 0;
    let unchanged = 0;

    for (const candidate of candidates) {
      const result =
        await collection.updateOne(
          {
            _id: candidate.ledgerId,
            amount: candidate.amount,
            $or: [
              {
                amountCents: {
                  $exists: false,
                },
              },
              {
                amountCents: null,
              },
            ],
          },
          {
            $set: {
              amountCents:
                candidate.amountCents,
            },
          },
        );

      if (result.modifiedCount === 1) {
        modified += 1;
      } else {
        const current = await collection.findOne({
          _id: candidate.ledgerId,
        });

        if (
          !current ||
          current.amount !== candidate.amount ||
          current.amountCents !== candidate.amountCents
        ) {
          throw new Error(
            `Candidate ${candidate.ledgerId} changed before update; ` +
              "aborting for manual review.",
          );
        }

        unchanged += 1;
      }
    }

    console.log(
      `\nModified: ${modified}`,
    );

    console.log(
      `Already present / unchanged: ${unchanged}`,
    );

    const verificationFailures = [];

    for (const candidate of candidates) {
      const entry =
        await collection.findOne({
          _id: candidate.ledgerId,
        });

      if (
        !entry ||
        entry.amountCents !== candidate.amountCents ||
        entry.amount !== candidate.amount
      ) {
        verificationFailures.push({
          ledgerId:
            candidate.ledgerId.toString(),
          expected:
            candidate.amountCents,
          actual:
            entry?.amountCents,
          expectedAmount: candidate.amount,
          actualAmount: entry?.amount,
        });
      }
    }

    if (
      verificationFailures.length > 0
    ) {
      console.dir(
        verificationFailures,
        { depth: null },
      );

      throw new Error(
        "Post-migration verification failed.",
      );
    }

    console.log(
      "\nPost-verification passed.",
    );
  }
} finally {
  await mongoose.disconnect();
}
