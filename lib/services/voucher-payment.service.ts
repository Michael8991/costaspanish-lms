import mongoose, { type ClientSession, type QueryFilter, Types } from "mongoose";

import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import { getStudentNameSnapshot, getVoucherNameSnapshot } from "@/lib/utils/ledger-snapshots";
import { PaymentLedgerEntry, type PaymentLedgerPaymentMethod } from "@/models/PaymentLedgerEntry";
import { StudentProfile, type StudentProfileDoc } from "@/models/StudentProfile";
import { fromCents, toCents } from "@/lib/utils/money";

export type VoucherPaymentActor = {
  id: string;
  role: "teacher" | "admin";
};

export type RegisterVoucherPaymentCommand = {
  studentId: string;
  voucherId: string;
  amountCents: number;
  paymentMethod: PaymentLedgerPaymentMethod;
  paidAt?: Date;
  notes?: string;
  idempotencyKey?: string;
  actor: VoucherPaymentActor;
};

export type VoucherPaymentResult = {
  paymentId: string;
  amountCents: number;
  amountPaidCents: number;
  outstandingAmountCents: number;
  paymentStatus: "partial" | "paid";
};

type VoucherRecord = {
  studentId: string;
  studentName: string;
  teacherId: string;
  voucherId: string;
  voucherName: string;
  courseId?: string | null;
  courseNameSnapshot?: string;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  priceCents: number;
  currency: "EUR";
};

export interface VoucherPaymentTransaction {
  findVoucher(command: RegisterVoucherPaymentCommand): Promise<VoucherRecord | null>;
  sumActivePaymentCents(teacherId: string, voucherId: string): Promise<number>;
  createPayment(input: {
    voucher: VoucherRecord;
    amountCents: number;
    totalPaidCents: number;
    paymentStatus: "partial" | "paid";
    paymentMethod: PaymentLedgerPaymentMethod;
    paidAt: Date;
    notes: string;
    createdBy: string;
    idempotencyKey?: string;
  }): Promise<string>;
  updateVoucherSummary(input: {
    studentId: string;
    voucherId: string;
    amountPaidCents: number;
    paymentStatus: "partial" | "paid";
    paidAt: Date;
    paymentMethod: PaymentLedgerPaymentMethod;
    notes: string;
  }): Promise<boolean>;
}

export interface VoucherPaymentRepository {
  withTransaction<T>(
    operation: (transaction: VoucherPaymentTransaction) => Promise<T>,
  ): Promise<T>;
}

export class VoucherPaymentError extends Error {
  constructor(
    public readonly code:
      | "VOUCHER_NOT_FOUND"
      | "INVALID_PRICE"
      | "OVERPAYMENT"
      | "DUPLICATE_PAYMENT"
      | "VOUCHER_UPDATE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "VoucherPaymentError";
  }
}

export function deriveVoucherPaymentStatus(totalPaidCents: number, priceCents: number) {
  return totalPaidCents >= priceCents ? "paid" as const : "partial" as const;
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === 11000,
  );
}

export function createVoucherPaymentService(repository: VoucherPaymentRepository) {
  return {
    async registerPayment(
      command: RegisterVoucherPaymentCommand,
    ): Promise<VoucherPaymentResult> {
      try {
        return await repository.withTransaction(async (transaction) => {
          const voucher = await transaction.findVoucher(command);
          if (!voucher) {
            throw new VoucherPaymentError(
              "VOUCHER_NOT_FOUND",
              "Alumno o bono no encontrado.",
              404,
            );
          }
          if (!Number.isSafeInteger(voucher.priceCents) || voucher.priceCents <= 0) {
            throw new VoucherPaymentError(
              "INVALID_PRICE",
              "El bono no tiene un precio válido para registrar cobros.",
              409,
            );
          }

          const currentPaidCents = await transaction.sumActivePaymentCents(
            voucher.teacherId,
            voucher.voucherId,
          );
          const outstandingAmountCents = Math.max(0, voucher.priceCents - currentPaidCents);
          if (command.amountCents > outstandingAmountCents) {
            throw new VoucherPaymentError(
              "OVERPAYMENT",
              "El importe supera la cantidad pendiente del bono.",
              409,
            );
          }

          const totalPaidCents = currentPaidCents + command.amountCents;
          const paymentStatus = deriveVoucherPaymentStatus(totalPaidCents, voucher.priceCents);
          const paidAt = command.paidAt ?? new Date();
          const paymentId = await transaction.createPayment({
            voucher,
            amountCents: command.amountCents,
            totalPaidCents,
            paymentStatus,
            paymentMethod: command.paymentMethod,
            paidAt,
            notes: command.notes?.trim() ?? "",
            createdBy: command.actor.id,
            idempotencyKey: command.idempotencyKey,
          });
          const updated = await transaction.updateVoucherSummary({
            studentId: voucher.studentId,
            voucherId: voucher.voucherId,
            amountPaidCents: totalPaidCents,
            paymentStatus,
            paidAt,
            paymentMethod: command.paymentMethod,
            notes: command.notes?.trim() ?? "",
          });
          if (!updated) {
            throw new VoucherPaymentError(
              "VOUCHER_UPDATE_FAILED",
              "No se pudo actualizar el resumen financiero del bono.",
              409,
            );
          }

          return {
            paymentId,
            amountCents: command.amountCents,
            amountPaidCents: totalPaidCents,
            outstandingAmountCents: Math.max(0, voucher.priceCents - totalPaidCents),
            paymentStatus,
          };
        });
      } catch (error) {
        if (error instanceof VoucherPaymentError) throw error;
        if (isDuplicateKeyError(error)) {
          throw new VoucherPaymentError(
            "DUPLICATE_PAYMENT",
            "Este cobro ya fue registrado.",
            409,
          );
        }
        throw error;
      }
    },
  };
}

class MongooseVoucherPaymentTransaction implements VoucherPaymentTransaction {
  constructor(
    private readonly session: ClientSession,
    private readonly afterCreatePayment?: () => Promise<void> | void,
  ) {}

  async findVoucher(command: RegisterVoucherPaymentCommand): Promise<VoucherRecord | null> {
    const studentObjectId = new Types.ObjectId(command.studentId);
    const voucherObjectId = new Types.ObjectId(command.voucherId);
    const filter = getStudentOwnershipFilter(command.actor, {
      _id: studentObjectId,
      "activePlans._id": voucherObjectId,
    }) as QueryFilter<StudentProfileDoc> | null;
    if (!filter) return null;
    const student = await StudentProfile.findOne(
      filter,
      { fullName: 1, teacherId: 1, activePlans: { $elemMatch: { _id: voucherObjectId } } },
    ).session(this.session).lean();
    const voucher = student?.activePlans?.[0];
    const teacherId = student?.teacherId ?? new Types.ObjectId(command.actor.id);
    if (!student || !voucher || !teacherId) return null;
    const price = voucher.priceTotal ?? voucher.price;
    return {
      studentId: student._id.toString(),
      studentName: getStudentNameSnapshot(student),
      teacherId: teacherId.toString(),
      voucherId: voucher._id.toString(),
      voucherName: getVoucherNameSnapshot(voucher),
      courseId: voucher.courseId?.toString() ?? null,
      courseNameSnapshot: voucher.courseNameSnapshot,
      billingPeriodStart: voucher.billingPeriodStart ?? null,
      billingPeriodEnd: voucher.billingPeriodEnd ?? null,
      priceCents: typeof price === "number" ? toCents(price) : Number.NaN,
      currency: voucher.currency ?? "EUR",
    };
  }

  async sumActivePaymentCents(teacherId: string, voucherId: string): Promise<number> {
    const [result] = await PaymentLedgerEntry.aggregate<{ total: number }>([
      {
        $match: {
          teacherId: new Types.ObjectId(teacherId),
          voucherId: new Types.ObjectId(voucherId),
          status: "active",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $ifNull: ["$amountCents", { $round: [{ $multiply: ["$amount", 100] }, 0] }] },
          },
        },
      },
    ]).session(this.session);
    return result?.total ?? 0;
  }

  async createPayment(input: Parameters<VoucherPaymentTransaction["createPayment"]>[0]) {
    const [created] = await PaymentLedgerEntry.create([
      {
        teacherId: new Types.ObjectId(input.voucher.teacherId),
        studentId: new Types.ObjectId(input.voucher.studentId),
        studentNameSnapshot: input.voucher.studentName,
        courseId: input.voucher.courseId ? new Types.ObjectId(input.voucher.courseId) : null,
        courseNameSnapshot: input.voucher.courseNameSnapshot ?? "",
        voucherId: new Types.ObjectId(input.voucher.voucherId),
        voucherNameSnapshot: input.voucher.voucherName,
        billingPeriodStart: input.voucher.billingPeriodStart ?? null,
        billingPeriodEnd: input.voucher.billingPeriodEnd ?? null,
        amount: fromCents(input.amountCents),
        amountCents: input.amountCents,
        currency: input.voucher.currency,
        paymentStatusSnapshot: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        paidAt: input.paidAt,
        source: "voucher_payment_registered",
        status: "active",
        notes: input.notes,
        createdBy: new Types.ObjectId(input.createdBy),
        idempotencyKey: input.idempotencyKey ?? null,
      },
    ], { session: this.session });
    await this.afterCreatePayment?.();
    return created._id.toString();
  }

  async updateVoucherSummary(input: Parameters<VoucherPaymentTransaction["updateVoucherSummary"]>[0]) {
    const result = await StudentProfile.updateOne(
      {
        _id: new Types.ObjectId(input.studentId),
        "activePlans._id": new Types.ObjectId(input.voucherId),
      },
      {
        $set: {
          "activePlans.$.amountPaid": fromCents(input.amountPaidCents),
          "activePlans.$.paymentStatus": input.paymentStatus,
          "activePlans.$.paidAt": input.paidAt,
          "activePlans.$.paymentMethod": input.paymentMethod,
          "activePlans.$.paymentNotes": input.notes,
        },
      },
      { session: this.session, runValidators: true },
    );
    return result.matchedCount === 1;
  }
}

export function createMongooseVoucherPaymentRepository(options?: {
  afterCreatePayment?: () => Promise<void> | void;
}): VoucherPaymentRepository {
  return {
  async withTransaction<T>(operation: (transaction: VoucherPaymentTransaction) => Promise<T>) {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await operation(
          new MongooseVoucherPaymentTransaction(session, options?.afterCreatePayment),
        );
      });
      if (result === undefined) throw new Error("Payment transaction did not complete");
      return result;
    } finally {
      await session.endSession();
    }
    },
  };
}

export const mongooseVoucherPaymentRepository =
  createMongooseVoucherPaymentRepository();

export const voucherPaymentService = createVoucherPaymentService(
  mongooseVoucherPaymentRepository,
);
