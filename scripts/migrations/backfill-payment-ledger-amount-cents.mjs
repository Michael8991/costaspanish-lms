import mongoose from "mongoose";

const EXPECTED_DATABASE = "costaspanish-lms-demo";

const uri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI;

const APPLY =
  process.env.APPLY_MIGRATION === "true";

if (!uri) {
  throw new Error(
    "MONGODB_URI or MONGO_URI is required",
  );
}

if (process.env.APP_ENV !== "staging") {
  throw new Error(
    'APP_ENV must be "staging".',
  );
}

if (
  process.env.MONGODB_DB_NAME !==
  EXPECTED_DATABASE
) {
  throw new Error(
    `Expected database "${EXPECTED_DATABASE}", ` +
      `got "${process.env.MONGODB_DB_NAME}".`,
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

  if (actualDatabase !== EXPECTED_DATABASE) {
    throw new Error(
      `Connected to unsafe database "${actualDatabase}".`,
    );
  }

  console.log(`Database: ${actualDatabase}`);
  console.log(
    APPLY
      ? "MODE: APPLY"
      : "MODE: DRY RUN — no documents will be modified.",
  );

  const collection =
    mongoose.connection.collection(
      "paymentledgerentries",
    );

  const entries =
    await collection.find({}).toArray();

  const candidates = [];
  const anomalies = [];

  for (const entry of entries) {
    /*
     * Ya existe canonical cents.
     * Comprobamos también que coincida con legacy amount.
     */
    if (isValidCents(entry.amountCents)) {
      if (
        isValidEuroAmount(entry.amount) &&
        entry.amountCents !==
          toCents(entry.amount)
      ) {
        anomalies.push({
          ledgerId: entry._id.toString(),
          reason:
            "amountCents differs from legacy amount",
          amount: entry.amount,
          amountCents: entry.amountCents,
          expectedAmountCents:
            toCents(entry.amount),
        });
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
  }

  console.log(
    `\nLedger entries scanned: ${entries.length}`,
  );

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

    throw new Error(
      "Migration aborted because anomalies were found.",
    );
  }

  if (!APPLY) {
    console.log(
      "\nDry run finished. No documents were modified.",
    );
  } else {
    let modified = 0;
    let unchanged = 0;

    for (const candidate of candidates) {
      const result =
        await collection.updateOne(
          {
            _id: candidate.ledgerId,
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
        entry.amountCents !==
          candidate.amountCents
      ) {
        verificationFailures.push({
          ledgerId:
            candidate.ledgerId.toString(),
          expected:
            candidate.amountCents,
          actual:
            entry?.amountCents,
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