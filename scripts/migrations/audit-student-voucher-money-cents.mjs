import mongoose from "mongoose";

const EXPECTED_DATABASE = "costaspanish-lms-demo";

const uri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI;

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

function isFiniteNonNegativeNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isValidCents(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function eurosToCents(value) {
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
  console.log("READ ONLY AUDIT — no documents will be modified.");

  const studentsCollection =
    mongoose.connection.collection("studentprofiles");

  const ledgerCollection =
    mongoose.connection.collection("paymentledgerentries");

  /*
   * Usamos la colección raw para no introducir defaults
   * de Mongoose sobre documentos legacy.
   */
  const students = await studentsCollection
    .find(
      {},
      {
        projection: {
          fullName: 1,
          contactEmailLower: 1,
          activePlans: 1,
        },
      },
    )
    .toArray();

  /*
   * Construimos la suma real del ledger por voucher.
   *
   * Preferimos amountCents.
   * Mientras exista legacy, hacemos fallback desde amount.
   */
  const ledgerEntries = await ledgerCollection
    .find(
      { status: "active" },
      {
        projection: {
          voucherId: 1,
          amount: 1,
          amountCents: 1,
        },
      },
    )
    .toArray();

  const ledgerTotalsByVoucher = new Map();
  const invalidLedgerEntries = [];

  for (const entry of ledgerEntries) {
    if (!entry.voucherId) {
      invalidLedgerEntries.push({
        ledgerId: entry._id?.toString(),
        reason: "missing voucherId",
      });
      continue;
    }

    let cents = null;

    if (isValidCents(entry.amountCents)) {
      cents = entry.amountCents;
    } else if (
      entry.amountCents == null &&
      isFiniteNonNegativeNumber(entry.amount)
    ) {
      cents = eurosToCents(entry.amount);
    } else {
      invalidLedgerEntries.push({
        ledgerId: entry._id?.toString(),
        voucherId: entry.voucherId?.toString(),
        amount: entry.amount,
        amountCents: entry.amountCents,
        reason: "invalid monetary amount",
      });
      continue;
    }

    const key = entry.voucherId.toString();

    ledgerTotalsByVoucher.set(
      key,
      (ledgerTotalsByVoucher.get(key) ?? 0) + cents,
    );
  }

  const stats = {
    studentsScanned: students.length,
    vouchersScanned: 0,

    priceTotalCentsPresent: 0,
    priceTotalCentsMissing: 0,

    priceSourcePriceTotal: 0,
    priceSourceLegacyPrice: 0,
    priceSourceMissing: 0,

    amountPaidCentsPresent: 0,
    amountPaidCentsMissing: 0,

    amountPaidLegacyNumeric: 0,
    amountPaidLegacyMissing: 0,

    vouchersWithLedger: 0,
    vouchersWithoutLedger: 0,
  };

  const anomalies = [];
  const migrationCandidates = [];

  for (const student of students) {
    for (const plan of student.activePlans ?? []) {
      stats.vouchersScanned += 1;

      const voucherId = plan._id?.toString();

      if (!voucherId) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          reason: "voucher without _id",
        });
        continue;
      }

      /*
       * PRICE
       */
      if (isValidCents(plan.priceTotalCents)) {
        stats.priceTotalCentsPresent += 1;
      } else {
        stats.priceTotalCentsMissing += 1;
      }

      let sourcePrice = null;
      let priceSource = null;

      if (isFiniteNonNegativeNumber(plan.priceTotal)) {
        sourcePrice = plan.priceTotal;
        priceSource = "priceTotal";
        stats.priceSourcePriceTotal += 1;
      } else if (
        isFiniteNonNegativeNumber(plan.price)
      ) {
        sourcePrice = plan.price;
        priceSource = "price";
        stats.priceSourceLegacyPrice += 1;
      } else {
        stats.priceSourceMissing += 1;
      }

      const expectedPriceTotalCents =
        sourcePrice === null
          ? null
          : eurosToCents(sourcePrice);

      /*
       * Detectar price != priceTotal.
       * Comparamos en cents para evitar ruido de floats.
       */
      if (
        isFiniteNonNegativeNumber(plan.price) &&
        isFiniteNonNegativeNumber(plan.priceTotal) &&
        eurosToCents(plan.price) !==
          eurosToCents(plan.priceTotal)
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "price differs from priceTotal",
          price: plan.price,
          priceTotal: plan.priceTotal,
        });
      }

      /*
       * Si ya hay cents, comprobar que coinciden
       * con el valor euro de referencia.
       */
      if (
        isValidCents(plan.priceTotalCents) &&
        expectedPriceTotalCents !== null &&
        plan.priceTotalCents !== expectedPriceTotalCents
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "priceTotalCents differs from legacy price",
          priceTotalCents: plan.priceTotalCents,
          expectedPriceTotalCents,
        });
      }

      /*
       * AMOUNT PAID
       */
      if (isValidCents(plan.amountPaidCents)) {
        stats.amountPaidCentsPresent += 1;
      } else {
        stats.amountPaidCentsMissing += 1;
      }

      if (
        isFiniteNonNegativeNumber(plan.amountPaid)
      ) {
        stats.amountPaidLegacyNumeric += 1;
      } else {
        stats.amountPaidLegacyMissing += 1;
      }

      const hasLedger =
        ledgerTotalsByVoucher.has(voucherId);

      if (hasLedger) {
        stats.vouchersWithLedger += 1;
      } else {
        stats.vouchersWithoutLedger += 1;
      }

      const ledgerPaidCents =
        ledgerTotalsByVoucher.get(voucherId) ?? null;

      const legacyAmountPaidCents =
        isFiniteNonNegativeNumber(plan.amountPaid)
          ? eurosToCents(plan.amountPaid)
          : null;

      /*
       * Si existe ledger, debe ser nuestra mejor
       * referencia financiera.
       */
      if (
        ledgerPaidCents !== null &&
        legacyAmountPaidCents !== null &&
        ledgerPaidCents !== legacyAmountPaidCents
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "ledger total differs from amountPaid",
          paymentStatus: plan.paymentStatus,
          ledgerPaidCents,
          legacyAmountPaidCents,
        });
      }

      if (
        isValidCents(plan.amountPaidCents) &&
        ledgerPaidCents !== null &&
        plan.amountPaidCents !== ledgerPaidCents
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "amountPaidCents differs from ledger",
          amountPaidCents: plan.amountPaidCents,
          ledgerPaidCents,
        });
      }

      /*
       * Casos especialmente sospechosos.
       */
      if (
        ["paid", "partial"].includes(plan.paymentStatus) &&
        ledgerPaidCents === null &&
        legacyAmountPaidCents === null
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason:
            `${plan.paymentStatus} voucher without ledger or amountPaid`,
        });
      }

      if (
        expectedPriceTotalCents !== null &&
        ledgerPaidCents !== null &&
        ledgerPaidCents > expectedPriceTotalCents
      ) {
        anomalies.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,
          reason: "ledger total exceeds voucher price",
          expectedPriceTotalCents,
          ledgerPaidCents,
        });
      }

      /*
       * Preview de lo que una futura migración
       * podría escribir.
       *
       * Para amountPaid:
       * 1. ledger
       * 2. legacy snapshot
       * 3. pending/waived sin dinero => 0
       * 4. cualquier otro caso => null/manual review
       */
      let proposedAmountPaidCents = null;
      let amountPaidSource = null;

      if (ledgerPaidCents !== null) {
        proposedAmountPaidCents = ledgerPaidCents;
        amountPaidSource = "ledger";
      } else if (legacyAmountPaidCents !== null) {
        proposedAmountPaidCents =
          legacyAmountPaidCents;
        amountPaidSource = "amountPaid";
      } else if (
        plan.paymentStatus === "pending" ||
        plan.paymentStatus === "waived" ||
        plan.paymentStatus == null
      ) {
        proposedAmountPaidCents = 0;
        amountPaidSource = "status_default_zero";
      }

      if (
        !isValidCents(plan.priceTotalCents) ||
        !isValidCents(plan.amountPaidCents)
      ) {
        migrationCandidates.push({
          studentId: student._id.toString(),
          studentName: student.fullName,
          voucherId,
          voucherName: plan.name,

          paymentStatus: plan.paymentStatus,

          current: {
            price: plan.price,
            priceTotal: plan.priceTotal,
            priceTotalCents: plan.priceTotalCents,
            amountPaid: plan.amountPaid,
            amountPaidCents: plan.amountPaidCents,
            paidAt: plan.paidAt,
            paymentMethod: plan.paymentMethod,
            paymentNotes: plan.paymentNotes
          },

          proposed: {
            priceTotalCents:
              expectedPriceTotalCents,
            priceSource,

            amountPaidCents:
              proposedAmountPaidCents,
            amountPaidSource,
          },
        });
      }
    }
  }

  console.log("\n=== SUMMARY ===");
  console.table(stats);

  console.log(
    `\nInvalid ledger entries: ${invalidLedgerEntries.length}`,
  );

  if (invalidLedgerEntries.length > 0) {
    console.dir(
      invalidLedgerEntries.slice(0, 20),
      { depth: null },
    );
  }

  console.log(
    `\nAnomalies: ${anomalies.length}`,
  );

  if (anomalies.length > 0) {
    console.dir(
      anomalies.slice(0, 30),
      { depth: null },
    );
  }

  console.log(
    `\nMigration candidates: ${migrationCandidates.length}`,
  );

  if (migrationCandidates.length > 0) {
    console.dir(
      migrationCandidates.slice(0, 20),
      { depth: null },
    );
  }

  console.log(
    "\nAudit finished. No documents were modified.",
  );
} finally {
  await mongoose.disconnect();
}