import mongoose from "mongoose";

const EXPECTED_DATABASE =
  "costaspanish-lms-demo";

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
  if (anomalies.length > 0) {
    console.log(
      `\nLedger anomalies: ${anomalies.length}`,
    );

    console.dir(
      anomalies,
      { depth: null },
    );

    throw new Error(
      "Voucher migration aborted because ledger is not fully canonical.",
    );
  }

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

  for (const student of students) {
    for (const plan of student.activePlans ?? []) {
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
        expectedAmountPaidCents =
          ledgerPaidCents;

        /*
         * El snapshot legacy debe coincidir
         * con la fuente de verdad.
         */
        if (
          isEuroAmount(plan.amountPaid) &&
          toCents(plan.amountPaid) !==
            ledgerPaidCents
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
        if (!isEuroAmount(plan.amountPaid)) {
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
          toCents(plan.amountPaid);

        if (legacyAmountPaidCents > 0) {
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

      const missingPriceTotalCents =
        !isVoucherCents(
          plan.priceTotalCents,
        );

      const missingAmountPaidCents =
        !isVoucherCents(
          plan.amountPaidCents,
        );

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
        });
      }
    }
  }

  console.log(
    `\nStudents scanned: ${students.length}`,
  );

  console.log(
    `Migration candidates: ${candidates.length}`,
  );

  console.dir(
    candidates.map((candidate) => ({
      studentName:
        candidate.studentName,

      voucherName:
        candidate.voucherName,

      voucherId:
        candidate.voucherId.toString(),

      paymentStatus:
        candidate.paymentStatus,

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
      const set = {};
      const voucherMatch = {
        _id: candidate.voucherId,
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
      const student =
        await studentsCollection.findOne(
          {
            _id:
              candidate.studentId,
          },
          {
            projection: {
              activePlans: {
                $elemMatch: {
                  _id:
                    candidate.voucherId,
                },
              },
            },
          },
        );

      const plan =
        student?.activePlans?.[0];

      if (
        !plan ||
        plan.priceTotalCents !==
          candidate.expectedPriceTotalCents ||
        plan.amountPaidCents !==
          candidate.expectedAmountPaidCents
      ) {
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