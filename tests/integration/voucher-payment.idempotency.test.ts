import assert from "node:assert/strict";
import test from "node:test";
import mongoose, { Types } from "mongoose";

import { PaymentLedgerEntry } from "../../models/PaymentLedgerEntry";
import { StudentProfile } from "../../models/StudentProfile";
import { createMongooseVoucherPaymentRepository, createVoucherPaymentService } from "../../lib/services/voucher-payment.service";

const EXPECTED_DATABASE = "costaspanish-lms-demo";

function assertSafeIntegrationEnvironment() {
  if (process.env.APP_ENV !== "staging") {
    throw new Error(
      `Unsafe integration environment: APP_ENV must be "staging".`
    );
  }

  if (process.env.MONGODB_DB_NAME !== EXPECTED_DATABASE) {
    throw new Error(
      `Unsafe integration database configuration: expected "${EXPECTED_DATABASE}", ` +
      `received "${process.env.MONGODB_DB_NAME}".`
    )
  }

  if (!process.env.MONGODB_URI) {
    throw new Error(
      `MONGODB_URI is required for voucher payment integration tests.`
    )
  }
}

test(
  "real Mongo idempotency prevents duplicate voucher payments",
  async () => {
    assertSafeIntegrationEnvironment();
    
    const teacherId = new Types.ObjectId();
    const voucherId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const runId = new Types.ObjectId().toString();

    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: process.env.MONGODB_DB_NAME,
    });

  try {
    const actualDbName = mongoose.connection.db?.databaseName;

    assert.equal(
      actualDbName,
      EXPECTED_DATABASE,
      `Connected to unsafe database "${actualDbName}"`
    )

    const student = await StudentProfile.create({
      _id: studentId,
      teacherId,
      contactEmail: `idempotency-${runId}`,
      contactEmailLower: `idempotency-${runId}`,
      fullName: `Transaction Test ${runId}`,
      timezone: "Europe/Madrid",
      level: "B1",
      goals: [],
      isActive: true,
      activePlans: [{
        _id: voucherId,
        name: "Bono transaccional",
        billingType: "package",
        classType: "private",
        creditsTotal: 10,
        creditsRemaining: 10,
        validFrom: new Date("2026-09-01T00:00:00.000Z"),
        validUntil: new Date("2026-12-31T00:00:00.000Z"),
        status: "active",
        price: 160,
        priceTotal: 160,
        paymentStatus: "pending",
        amountPaid:0,
        currency: "EUR",
      }],
    });

    const command = {
        studentId: studentId.toString(),
        voucherId: voucherId.toString(),
        amountCents: 8000,
        paymentMethod: "bank_transfer" as const,

        idempotencyKey:
            "123e4567-e89b-42d3-a456-426614174099",

        actor: {
            id: teacherId.toString(),
            role: "teacher" as const,
        },
    };

    const service = createVoucherPaymentService(
        createMongooseVoucherPaymentRepository(),
    );

        /*
        * PRIMER INTENTO
        *
        * El pago es nuevo y debe registrarse.
        */
    await service.registerPayment(command);

        /*
        * SEGUNDO INTENTO
        *
        * Es exactamente el mismo pago lógico,
        * incluida la misma idempotencyKey.
        *
        * Mongo debe impedir que se registre
        * una segunda vez.
        */
    await assert.rejects(
        service.registerPayment(command),
        /Este cobro ya fue registrado/,
    );

    const count = await PaymentLedgerEntry.countDocuments({
        teacherId,
        idempotencyKey: command.idempotencyKey,
    })
      
    assert.equal(count, 1);

    const persisted = await StudentProfile.findById(studentId).lean();

    const voucher = persisted?.activePlans.find((item) => item._id.equals(voucherId),);

    assert.equal(voucher?.amountPaid, 80);

    assert.equal(voucher?.paymentStatus, "partial")
  } finally {

    await PaymentLedgerEntry.deleteMany({
      voucherId,
      teacherId
    });

    await StudentProfile.deleteOne({
      _id: studentId
    })

    await mongoose.disconnect();
  }
});
