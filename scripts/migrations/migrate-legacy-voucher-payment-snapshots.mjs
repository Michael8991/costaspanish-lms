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

function isFinitePositiveNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function eurosToCents(value) {
  return Math.round(value * 100);
}

function toValidDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

const PAYMENT_METHODS = new Set([
  "cash",
  "bank_transfer",
  "bizum",
  "card",
  "other",
  "",
]);

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

  const studentsCollection =
    mongoose.connection.collection(
      "studentprofiles",
    );

  const ledgerCollection =
    mongoose.connection.collection(
      "paymentledgerentries",
    );

  const students =
    await studentsCollection
      .find(
        {},
        {
          projection: {
            teacherId: 1,
            fullName: 1,
            activePlans: 1,
          },
        },
      )
      .toArray();

  /*
   * Leemos TODOS los ledger entries, no solo active.
   *
   * Si encontramos únicamente movimientos reversed
   * para un voucher legacy "paid", no queremos recrear
   * silenciosamente un pago.
   */
  const ledgerEntries =
    await ledgerCollection
      .find(
        {},
        {
          projection: {
            teacherId: 1,
            voucherId: 1,
            amount: 1,
            amountCents: 1,
            status: 1,
            source: 1,
            idempotencyKey: 1,
          },
        },
      )
      .toArray();

  const ledgersByVoucher = new Map();

  for (const entry of ledgerEntries) {
    if (!entry.voucherId) continue;

    const key = entry.voucherId.toString();

    const current =
      ledgersByVoucher.get(key) ?? [];

    current.push(entry);

    ledgersByVoucher.set(key, current);
  }

  const candidates = [];
  const anomalies = [];

  for (const student of students) {
    for (const plan of student.activePlans ?? []) {
      /*
       * Solo reconstruimos dinero que el sistema
       * legacy ya consideraba pagado.
       */
      if (
        plan.paymentStatus !== "paid" &&
        plan.paymentStatus !== "partial"
      ) {
        continue;
      }

      if (!isFinitePositiveNumber(plan.amountPaid)) {
        continue;
      }

      const voucherId =
        plan._id?.toString();

      if (!voucherId) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          reason: "voucher without _id",
        });
        continue;
      }

      if (!student.teacherId) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "student without teacherId",
        });
        continue;
      }

      const existing =
        ledgersByVoucher.get(voucherId) ?? [];

      const active =
        existing.filter(
          (entry) => entry.status === "active",
        );

      const reversed =
        existing.filter(
          (entry) => entry.status === "reversed",
        );

      /*
       * Ya existe fuente de verdad.
       * No hacemos absolutamente nada.
       */
      if (active.length > 0) {
        continue;
      }

      /*
       * Un histórico reversed significa que hubo
       * una decisión financiera previa.
       * Requiere revisión manual.
       */
      if (reversed.length > 0) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason:
            "paid legacy voucher has reversed ledger but no active ledger",
          reversedLedgerIds:
            reversed.map(
              (entry) => entry._id.toString(),
            ),
        });
        continue;
      }

      const paidAt =
        toValidDate(plan.paidAt);

      if (!paidAt) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason:
            "paid legacy voucher has no valid paidAt",
        });
        continue;
      }

      const paymentMethod =
        typeof plan.paymentMethod === "string"
          ? plan.paymentMethod
          : "";

      if (!PAYMENT_METHODS.has(paymentMethod)) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason:
            "invalid legacy paymentMethod",
          paymentMethod,
        });
        continue;
      }

      const amountCents =
        eurosToCents(plan.amountPaid);

      if (
        !Number.isSafeInteger(amountCents) ||
        amountCents <= 0
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "invalid converted amountCents",
          amountPaid: plan.amountPaid,
          amountCents,
        });
        continue;
      }

      candidates.push({
        teacherId: student.teacherId,
        studentId: student._id,

        studentNameSnapshot:
          student.fullName?.trim() ?? "",

        courseId:
          plan.courseId ?? null,

        courseNameSnapshot:
          plan.courseNameSnapshot?.trim() ?? "",

        voucherId: plan._id,

        voucherNameSnapshot:
          plan.name?.trim() ?? "",

        billingPeriodStart:
          plan.billingPeriodStart ?? null,

        billingPeriodEnd:
          plan.billingPeriodEnd ?? null,

        amount: plan.amountPaid,
        amountCents,

        currency: "EUR",

        paymentStatusSnapshot:
          plan.paymentStatus,

        paymentMethod,
        paidAt,

        source:
          "legacy_snapshot_migration",

        status: "active",

        reversedAt: null,
        reversedBy: null,
        reversalReason: "",

        notes:
          plan.paymentNotes?.trim() ?? "",

        createdBy: null,

        idempotencyKey:
          `legacy-snapshot-migration:${voucherId}`,
      });
    }
  }

  console.log(
    `\nMigration candidates: ${candidates.length}`,
  );

  console.dir(
    candidates.map((candidate) => ({
      studentName:
        candidate.studentNameSnapshot,

      voucherName:
        candidate.voucherNameSnapshot,

      voucherId:
        candidate.voucherId.toString(),

      amount:
        candidate.amount,

      amountCents:
        candidate.amountCents,

      paidAt:
        candidate.paidAt,

      paymentMethod:
        candidate.paymentMethod,

      idempotencyKey:
        candidate.idempotencyKey,
    })),
    { depth: null },
  );

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
    let inserted = 0;
    let unchanged = 0;

    for (const candidate of candidates) {
      /*
       * $setOnInsert + deterministic idempotency key
       * makes the migration rerunnable.
       */
      const result =
        await ledgerCollection.updateOne(
          {
            teacherId:
              candidate.teacherId,

            idempotencyKey:
              candidate.idempotencyKey,
          },
          {
            $setOnInsert: {
              ...candidate,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          {
            upsert: true,
          },
        );

      if (result.upsertedCount === 1) {
        inserted += 1;
      } else {
        unchanged += 1;
      }
    }

    console.log(
      `\nInserted: ${inserted}`,
    );

    console.log(
      `Already present / unchanged: ${unchanged}`,
    );

    /*
     * Post-verification.
     */
    const verificationFailures = [];

    for (const candidate of candidates) {
      const entry =
        await ledgerCollection.findOne({
          teacherId:
            candidate.teacherId,

          voucherId:
            candidate.voucherId,

          status: "active",
        });

      if (!entry) {
        verificationFailures.push({
          voucherId:
            candidate.voucherId.toString(),

          reason:
            "active ledger not found after migration",
        });

        continue;
      }

      if (
        entry.amountCents !==
        candidate.amountCents
      ) {
        verificationFailures.push({
          voucherId:
            candidate.voucherId.toString(),

          reason:
            "amountCents mismatch",

          expected:
            candidate.amountCents,

          actual:
            entry.amountCents,
        });
      }
    }

    if (verificationFailures.length > 0) {
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