import mongoose from "mongoose";
import { isDeepStrictEqual } from "node:util";

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

if (APPLY && appEnv === "production" &&
    process.env.ALLOW_PRODUCTION_MIGRATION !== "true") {
  throw new Error(
    "Production --apply requires ALLOW_PRODUCTION_MIGRATION=true.",
  );
}

function isEuroAmount(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isVoucherCents(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isLedgerCents(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function toCents(value) {
  return Math.round(value * 100);
}

const LEGACY_FIELDS = [
  "price", "priceTotal", "unitCreditPriceSnapshot", "currency",
  "paymentStatus", "amountPaid", "paidAt", "paymentMethod",
  "paymentNotes",
];

function snapshotFields(plan) {
  return Object.fromEntries(
    LEGACY_FIELDS.filter((field) => Object.hasOwn(plan, field))
      .map((field) => [field, plan[field]]),
  );
}

function legacyUnchanged(plan, snapshot) {
  return LEGACY_FIELDS.every((field) =>
    Object.hasOwn(plan, field) === Object.hasOwn(snapshot, field) &&
    isDeepStrictEqual(plan[field], snapshot[field]),
  );
}

function legacyGuard(snapshot) {
  return Object.fromEntries(LEGACY_FIELDS.map((field) => [
    field,
    Object.hasOwn(snapshot, field)
      ? (snapshot[field] === null ? { $type: 10 } : snapshot[field])
      : { $exists: false },
  ]));
}

async function readVoucher(collection, candidate) {
  const student = await collection.findOne(
    { _id: candidate.studentId },
    { projection: { activePlans: {
      $elemMatch: { _id: candidate.voucherId },
    } } },
  );
  return student?.activePlans?.[0];
}

function candidateVerified(plan, candidate) {
  return Boolean(plan) &&
    plan.priceTotalCents === candidate.expectedPriceTotalCents &&
    plan.amountPaidCents === candidate.expectedAmountPaidCents &&
    legacyUnchanged(plan, candidate.legacySnapshot);
}

async function activeLedgerTotal(collection, candidate) {
  const entries = await collection.find({
    voucherId: candidate.voucherId,
    status: "active",
  }).toArray();
  if (entries.some((entry) => !isLedgerCents(entry.amountCents))) {
    throw new Error(`Active ledger for ${candidate.voucherId} is invalid.`);
  }
  const total = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  if (!isVoucherCents(total)) {
    throw new Error(`Active ledger total for ${candidate.voucherId} is unsafe.`);
  }
  return entries.length ? total : 0;
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

  const studentsCollection =
    mongoose.connection.collection(
      "studentprofiles",
    );

  const ledgerCollection =
    mongoose.connection.collection(
      "paymentledgerentries",
    );

  /*
   * El ledger ya debería estar completamente
   * migrado a amountCents.
   */
  const ledgerEntries =
    await ledgerCollection
      .find(
        {},
        {
          projection: {
            voucherId: 1,
            status: 1,
            amount: 1,
            amountCents: 1,
          },
        },
      )
      .toArray();

  const anomalies = [];
  const activeLedgerTotals =
    new Map();

  for (const entry of ledgerEntries) {
    if (!isLedgerCents(entry.amountCents)) {
      anomalies.push({
        ledgerId:
          entry._id.toString(),

        voucherId:
          entry.voucherId?.toString(),

        reason:
          "ledger entry has invalid or missing amountCents",

        amount:
          entry.amount,

        amountCents:
          entry.amountCents,
      });

      continue;
    }

    if (
      entry.status !== "active" ||
      !entry.voucherId
    ) {
      continue;
    }

    const voucherId =
      entry.voucherId.toString();

    activeLedgerTotals.set(
      voucherId,
      (activeLedgerTotals.get(voucherId) ?? 0) +
        entry.amountCents,
    );
  }

  /*
   * Si el ledger todavía no está limpio,
   * no tocamos StudentProfile.
   */
  const students =
    await studentsCollection
      .find(
        {},
        {
          projection: {
            fullName: 1,
            activePlans: 1,
          },
        },
      )
      .toArray();

  const candidates = [];
  let vouchersExamined = 0;
  let canonicalValid = 0;
  const priceSources = { priceTotal: 0, price: 0, missing: 0 };
  const amountPaidSources = { activeLedger: 0, zeroWithoutLedger: 0, ambiguous: 0 };

  for (const student of students) {
    for (const plan of student.activePlans ?? []) {
      vouchersExamined += 1;
      const anomaliesBeforeVoucher = anomalies.length;
      const voucherId =
        plan._id?.toString();

      if (!voucherId) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          reason:
            "voucher without _id",
        });

        continue;
      }

      /*
       * Precio comercial:
       *
       * priceTotal tiene prioridad.
       * price es el fallback legacy.
       */
      let sourcePrice = null;
      let priceSource = null;

      if (isEuroAmount(plan.priceTotal)) {
        sourcePrice =
          plan.priceTotal;

        priceSource =
          "priceTotal";
      } else if (
        isEuroAmount(plan.price)
      ) {
        sourcePrice =
          plan.price;

        priceSource =
          "price";
      }

      priceSources[priceSource ?? "missing"] += 1;

      if (sourcePrice === null) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            "voucher has no valid price source",

          price:
            plan.price,

          priceTotal:
            plan.priceTotal,
        });

        continue;
      }

      const expectedPriceTotalCents =
        toCents(sourcePrice);

      if (!isVoucherCents(expectedPriceTotalCents)) {
        anomalies.push({
          studentId: student._id.toString(), voucherId,
          reason: "price cannot be represented safely in cents",
          sourcePrice, expectedPriceTotalCents,
        });
        continue;
      }

      /*
       * Ambos legacy deberían representar
       * el mismo precio.
       */
      if (
        isEuroAmount(plan.price) &&
        isEuroAmount(plan.priceTotal) &&
        toCents(plan.price) !==
          toCents(plan.priceTotal)
      ) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            "price differs from priceTotal",

          price:
            plan.price,

          priceTotal:
            plan.priceTotal,
        });
      }

      /*
       * Dinero cobrado:
       *
       * Si existe ledger activo,
       * esa es la fuente de verdad.
       */
      const ledgerPaidCents =
        activeLedgerTotals.get(voucherId);

      let expectedAmountPaidCents;

      if (
        ledgerPaidCents !== undefined
      ) {
        amountPaidSources.activeLedger += 1;
        expectedAmountPaidCents =
          ledgerPaidCents;

        if (!isVoucherCents(ledgerPaidCents)) {
          anomalies.push({
            studentId: student._id.toString(), voucherId,
            reason: "active ledger total cannot be represented safely",
            ledgerPaidCents,
          });
          continue;
        }

        /*
         * El snapshot legacy debe coincidir
         * con la fuente de verdad.
         */
        if (
          typeof plan.amountPaid === "number" &&
          (!isEuroAmount(plan.amountPaid) ||
            !isVoucherCents(toCents(plan.amountPaid)) ||
            toCents(plan.amountPaid) !== ledgerPaidCents)
        ) {
          anomalies.push({
            studentId:
              student._id.toString(),

            studentName:
              student.fullName,

            voucherId,
            voucherName:
              plan.name,

            reason:
              "legacy amountPaid differs from active ledger",

            amountPaid:
              plan.amountPaid,

            legacyAmountPaidCents:
              toCents(plan.amountPaid),

            ledgerPaidCents,
          });
        }
      } else {
        /*
         * Sin ledger solo aceptamos
         * ausencia real de dinero.
         */
        if (plan.amountPaid != null && !isEuroAmount(plan.amountPaid)) {
          amountPaidSources.ambiguous += 1;
          anomalies.push({
            studentId:
              student._id.toString(),

            studentName:
              student.fullName,

            voucherId,
            voucherName:
              plan.name,

            reason:
              "voucher without ledger has invalid amountPaid",

            amountPaid:
              plan.amountPaid,
          });

          continue;
        }

        const legacyAmountPaidCents =
          plan.amountPaid == null ? 0 : toCents(plan.amountPaid);

        if (plan.amountPaid > 0) {
          amountPaidSources.ambiguous += 1;
          anomalies.push({
            studentId:
              student._id.toString(),

            studentName:
              student.fullName,

            voucherId,
            voucherName:
              plan.name,

            reason:
              "voucher has money recorded but no active ledger",

            paymentStatus:
              plan.paymentStatus,

            amountPaid:
              plan.amountPaid,
          });

          continue;
        }

        expectedAmountPaidCents = 0;
        amountPaidSources.zeroWithoutLedger += 1;
      }

      /*
       * Estados financieros incompatibles
       * también bloquean la migración.
       */
      if (
        (plan.paymentStatus === "paid" ||
          plan.paymentStatus === "partial") &&
        expectedAmountPaidCents <= 0
      ) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            `${plan.paymentStatus} voucher has no paid money`,
        });
      }

      if (
        (plan.paymentStatus === "pending" ||
          plan.paymentStatus === "waived") &&
        expectedAmountPaidCents > 0
      ) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            `${plan.paymentStatus} voucher has active ledger money`,

          amountPaidCents:
            expectedAmountPaidCents,
        });
      }

      /*
       * Si canonical ya existe,
       * comprobamos que sea correcto.
       */
      if (
        isVoucherCents(
          plan.priceTotalCents,
        ) &&
        plan.priceTotalCents !==
          expectedPriceTotalCents
      ) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            "existing priceTotalCents mismatch",

          current:
            plan.priceTotalCents,

          expected:
            expectedPriceTotalCents,
        });
      }

      if (
        isVoucherCents(
          plan.amountPaidCents,
        ) &&
        plan.amountPaidCents !==
          expectedAmountPaidCents
      ) {
        anomalies.push({
          studentId:
            student._id.toString(),

          studentName:
            student.fullName,

          voucherId,
          voucherName:
            plan.name,

          reason:
            "existing amountPaidCents mismatch",

          current:
            plan.amountPaidCents,

          expected:
            expectedAmountPaidCents,
        });
      }

      for (const field of ["priceTotalCents", "amountPaidCents"]) {
        if (plan[field] != null && !isVoucherCents(plan[field])) {
          anomalies.push({
            studentId: student._id.toString(), voucherId,
            reason: `invalid existing ${field}`,
            current: plan[field],
          });
        }
      }

      if (anomalies.length !== anomaliesBeforeVoucher) {
        continue;
      }

      const missingPriceTotalCents =
        plan.priceTotalCents == null;

      const missingAmountPaidCents =
        plan.amountPaidCents == null;

      if (
        missingPriceTotalCents ||
        missingAmountPaidCents
      ) {
        candidates.push({
          studentId:
            student._id,

          studentName:
            student.fullName,

          voucherId:
            plan._id,

          voucherName:
            plan.name,

          paymentStatus:
            plan.paymentStatus,

          expectedPriceTotalCents,
          expectedAmountPaidCents,

          priceSource,

          amountPaidSource:
            ledgerPaidCents !== undefined
              ? "ledger"
              : "amountPaid",

          missingPriceTotalCents,
          missingAmountPaidCents,
          legacySnapshot: snapshotFields(plan),
          currentPriceTotalCents: plan.priceTotalCents,
          currentAmountPaidCents: plan.amountPaidCents,
        });
      } else {
        canonicalValid += 1;
      }
    }
  }

  console.log(`\nstudentsExamined: ${students.length}`);
  console.log(`vouchersExamined: ${vouchersExamined}`);
  console.log(`ledgerEntriesExamined: ${ledgerEntries.length}`);
  console.log(`canonicalValid: ${canonicalValid}`);
  console.log("priceSources:", priceSources);
  console.log("amountPaidSources:", amountPaidSources);

  console.log(
    `Migration candidates: ${candidates.length}`,
  );

  console.dir(
    candidates.map((candidate) => ({
      studentName:
        candidate.studentName,

      studentId: candidate.studentId.toString(),

      voucherName:
        candidate.voucherName,

      voucherId:
        candidate.voucherId.toString(),

      paymentStatus:
        candidate.paymentStatus,

      current: candidate.legacySnapshot,

      currentPriceTotalCents: candidate.currentPriceTotalCents,

      currentAmountPaidCents: candidate.currentAmountPaidCents,

      priceTotalCents:
        candidate.expectedPriceTotalCents,

      priceSource:
        candidate.priceSource,

      amountPaidCents:
        candidate.expectedAmountPaidCents,

      amountPaidSource:
        candidate.amountPaidSource,
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
      const currentLedgerTotal = await activeLedgerTotal(
        ledgerCollection, candidate,
      );
      if (currentLedgerTotal !== candidate.expectedAmountPaidCents) {
        throw new Error(
          `Active ledger changed for voucher ${candidate.voucherId}; ` +
            "manual review required.",
        );
      }

      const set = {};
      const voucherMatch = {
        _id: candidate.voucherId,
        ...legacyGuard(candidate.legacySnapshot),
      };

      if (
        candidate.missingPriceTotalCents
      ) {
        set[
          "activePlans.$.priceTotalCents"
        ] =
          candidate.expectedPriceTotalCents;

        /*
         * null también hace match con
         * campos inexistentes.
         */
        voucherMatch.priceTotalCents =
          null;
      } else {
        voucherMatch.priceTotalCents = candidate.expectedPriceTotalCents;
      }

      if (
        candidate.missingAmountPaidCents
      ) {
        set[
          "activePlans.$.amountPaidCents"
        ] =
          candidate.expectedAmountPaidCents;

        voucherMatch.amountPaidCents =
          null;
      } else {
        voucherMatch.amountPaidCents = candidate.expectedAmountPaidCents;
      }

      const result =
        await studentsCollection.updateOne(
          {
            _id:
              candidate.studentId,

            activePlans: {
              $elemMatch:
                voucherMatch,
            },
          },
          {
            $set: set,
          },
        );

      if (result.modifiedCount === 1) {
        modified += 1;
      } else {
        const plan = await readVoucher(studentsCollection, candidate);
        if (!candidateVerified(plan, candidate)) {
          throw new Error(
            `Voucher ${candidate.voucherId} changed before update; ` +
              "manual review required.",
          );
        }
        unchanged += 1;
      }
    }

    console.log(
      `\nModified vouchers: ${modified}`,
    );

    console.log(
      `Already present / unchanged: ${unchanged}`,
    );

    /*
     * Verificación física final.
     */
    const verificationFailures = [];

    for (const candidate of candidates) {
      const plan = await readVoucher(studentsCollection, candidate);

      if (!candidateVerified(plan, candidate)) {
        verificationFailures.push({
          voucherId:
            candidate.voucherId.toString(),

          expectedPriceTotalCents:
            candidate.expectedPriceTotalCents,

          actualPriceTotalCents:
            plan?.priceTotalCents,

          expectedAmountPaidCents:
            candidate.expectedAmountPaidCents,

          actualAmountPaidCents:
            plan?.amountPaidCents,

          legacyUnchanged: plan && legacyUnchanged(plan, candidate.legacySnapshot),
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
