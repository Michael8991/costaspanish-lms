import assert from "node:assert/strict";
import test from "node:test";

import {
  createVoucherPaymentService,
  type RegisterVoucherPaymentCommand,
  VoucherPaymentError,
  type VoucherPaymentRepository,
  type VoucherPaymentTransaction,
} from "../../lib/services/voucher-payment.service";
import { registerVoucherPaymentSchema } from "../../lib/validators/voucher-payment";
import { updateStudentVoucherSchema } from "../../lib/validators/voucher";

const baseCommand: RegisterVoucherPaymentCommand = {
  studentId: "64b000000000000000000001",
  voucherId: "64b000000000000000000002",
  amountCents: 8000,
  paymentMethod: "bank_transfer",
  paidAt: new Date("2026-09-16T00:00:00.000Z"),
  notes: "Transferencia",
  idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
  actor: { id: "64b000000000000000000003", role: "teacher" },
};

class FakePaymentRepository implements VoucherPaymentRepository, VoucherPaymentTransaction {
  voucher: Awaited<ReturnType<VoucherPaymentTransaction["findVoucher"]>> = {
    studentId: baseCommand.studentId,
    studentName: "María",
    teacherId: baseCommand.actor.id,
    voucherId: baseCommand.voucherId,
    voucherName: "Bono",
    priceCents: 16000,
    currency: "EUR",
  };
  payments: Array<{ id: string; amountCents: number; idempotencyKey?: string }> = [];
  summary = { amountPaidCents: 0, paymentStatus: "pending" as "pending" | "partial" | "paid" };
  failSummaryUpdate = false;

  async withTransaction<T>(operation: (transaction: VoucherPaymentTransaction) => Promise<T>) {
    const paymentSnapshot = this.payments.map((payment) => ({ ...payment }));
    const summarySnapshot = { ...this.summary };
    try {
      return await operation(this);
    } catch (error) {
      this.payments = paymentSnapshot;
      this.summary = summarySnapshot;
      throw error;
    }
  }

  async findVoucher(command: RegisterVoucherPaymentCommand) {
    if (
      !this.voucher ||
      command.studentId !== this.voucher.studentId ||
      command.voucherId !== this.voucher.voucherId
    ) return null;
    return this.voucher;
  }

  async sumActivePaymentCents() {
    return this.payments.reduce((total, payment) => total + payment.amountCents, 0);
  }

  async createPayment(input: Parameters<VoucherPaymentTransaction["createPayment"]>[0]) {
    if (
      input.idempotencyKey &&
      this.payments.some((payment) => payment.idempotencyKey === input.idempotencyKey)
    ) throw { code: 11000 };
    const id = `payment-${this.payments.length + 1}`;
    this.payments.push({ id, amountCents: input.amountCents, idempotencyKey: input.idempotencyKey });
    return id;
  }

  async updateVoucherSummary(input: Parameters<VoucherPaymentTransaction["updateVoucherSummary"]>[0]) {
    if (this.failSummaryUpdate) return false;
    this.summary = { amountPaidCents: input.amountPaidCents, paymentStatus: input.paymentStatus };
    return true;
  }
}

async function expectPaymentError(operation: Promise<unknown>, code: VoucherPaymentError["code"]) {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof VoucherPaymentError);
    assert.equal(error.code, code);
    return true;
  });
}

test("a complete payment creates one movement and marks the voucher paid", async () => {
  const repository = new FakePaymentRepository();
  const result = await createVoucherPaymentService(repository).registerPayment({
    ...baseCommand,
    amountCents: 16000,
  });
  assert.deepEqual(repository.payments.map(({ amountCents }) => amountCents), [16000]);
  assert.deepEqual(repository.summary, { amountPaidCents: 16000, paymentStatus: "paid" });
  assert.equal(result.outstandingAmountCents, 0);
});

test("a partial payment creates an individual movement and marks the voucher partial", async () => {
  const repository = new FakePaymentRepository();
  await createVoucherPaymentService(repository).registerPayment(baseCommand);
  assert.deepEqual(repository.payments.map(({ amountCents }) => amountCents), [8000]);
  assert.deepEqual(repository.summary, { amountPaidCents: 8000, paymentStatus: "partial" });
});

test("three payments remain distinct movements and complete the voucher", async () => {
  const repository = new FakePaymentRepository();
  const service = createVoucherPaymentService(repository);
  await service.registerPayment(baseCommand);
  const second = await service.registerPayment({
    ...baseCommand,
    amountCents: 4000,
    idempotencyKey: "123e4567-e89b-42d3-a456-426614174010",
  });
  assert.equal(second.paymentStatus, "partial");
  const result = await service.registerPayment({
    ...baseCommand,
    amountCents: 4000,
    idempotencyKey: "123e4567-e89b-42d3-a456-426614174011",
  });
  assert.deepEqual(repository.payments.map(({ amountCents }) => amountCents), [8000, 4000, 4000]);
  assert.equal(result.amountPaidCents, 16000);
  assert.equal(repository.summary.paymentStatus, "paid");
});

test("an overpayment creates no movement and leaves the voucher intact", async () => {
  const repository = new FakePaymentRepository();
  repository.payments.push({ id: "payment-1", amountCents: 8000 });
  await expectPaymentError(
    createVoucherPaymentService(repository).registerPayment({ ...baseCommand, amountCents: 10000 }),
    "OVERPAYMENT",
  );
  assert.deepEqual(repository.payments.map(({ amountCents }) => amountCents), [8000]);
  assert.deepEqual(repository.summary, { amountPaidCents: 0, paymentStatus: "pending" });
});

test("a voucher that does not belong to the student returns not found without writes", async () => {
  const repository = new FakePaymentRepository();
  await expectPaymentError(
    createVoucherPaymentService(repository).registerPayment({
      ...baseCommand,
      voucherId: "64b000000000000000000099",
    }),
    "VOUCHER_NOT_FOUND",
  );
  assert.equal(repository.payments.length, 0);
});

test("the command schema rejects client-controlled financial summaries", () => {
  const result = registerVoucherPaymentSchema.safeParse({
    amountCents: 1000,
    paymentMethod: "cash",
    idempotencyKey: baseCommand.idempotencyKey,
    paymentStatus: "paid",
    amountPaid: 9999,
  });
  assert.equal(result.success, false);
});

test("a failed voucher summary update rolls back the payment movement", async () => {
  const repository = new FakePaymentRepository();
  repository.failSummaryUpdate = true;
  await expectPaymentError(
    createVoucherPaymentService(repository).registerPayment(baseCommand),
    "VOUCHER_UPDATE_FAILED",
  );
  assert.equal(repository.payments.length, 0);
  assert.deepEqual(repository.summary, { amountPaidCents: 0, paymentStatus: "pending" });
});

test("reusing an idempotency key cannot create a duplicate movement", async () => {
  const repository = new FakePaymentRepository();
  const service = createVoucherPaymentService(repository);
  await service.registerPayment(baseCommand);
  await expectPaymentError(service.registerPayment(baseCommand), "DUPLICATE_PAYMENT");
  assert.deepEqual(repository.payments.map(({ amountCents }) => amountCents), [8000]);
  assert.deepEqual(repository.summary, { amountPaidCents: 8000, paymentStatus: "partial" });
});

test("the operational voucher PATCH rejects financial fields and preserves field absence", () => {
  assert.equal(updateStudentVoucherSchema.safeParse({ creditsRemaining: 1 }).success, true);
  assert.deepEqual(updateStudentVoucherSchema.parse({ creditsRemaining: 1 }), {
    creditsRemaining: 1,
  });
  assert.equal(
    updateStudentVoucherSchema.safeParse({ creditsRemaining: 1, paymentStatus: "pending" }).success,
    false,
  );
});
