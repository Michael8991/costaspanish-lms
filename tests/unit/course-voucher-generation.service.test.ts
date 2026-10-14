import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import {
  CourseVoucherGenerationError,
  persistCourseVouchersAfterEnrollmentPreflight,
  type CourseMemberBillingOperation,
  type CourseVoucherGenerationRepository,
  type CourseVoucherGenerationTransaction,
  type CourseVoucherWrite,
} from "../../lib/services/course-voucher-generation.service";

class FakeCourseVoucherGenerationRepository
  implements CourseVoucherGenerationRepository
{
  vouchers: string[] = [];
  billing: number[] = [];
  transactionCalls = 0;
  voucherWriteAttempts = 0;
  billingWriteAttempts = 0;

  constructor(private readonly failure?: {
    voucherIndex?: number;
    billingIndex?: number;
    billingMatchedCount?: number;
  }) {}

  async withTransaction<T>(
    work: (transaction: CourseVoucherGenerationTransaction) => Promise<T>,
  ): Promise<T> {
    this.transactionCalls += 1;
    const stagedVouchers = [...this.vouchers];
    const stagedBilling = [...this.billing];
    const transaction: CourseVoucherGenerationTransaction = {
      persistVoucher: async (write) => {
        const index = this.voucherWriteAttempts++;
        if (this.failure?.voucherIndex === index) {
          throw new Error(`voucher ${index} failed`);
        }
        stagedVouchers.push(write.plan._id.toString());
        return 1;
      },
      persistBilling: async (operations) => {
        for (const [index] of operations.entries()) {
          this.billingWriteAttempts += 1;
          if (this.failure?.billingIndex === index) {
            throw new Error(`billing ${index} failed`);
          }
          stagedBilling.push(index);
        }
        return this.failure?.billingMatchedCount ?? operations.length;
      },
    };

    const result = await work(transaction);
    this.vouchers = stagedVouchers;
    this.billing = stagedBilling;
    return result;
  }
}

function plan(courseId: Types.ObjectId, enrollmentId: Types.ObjectId) {
  return {
    _id: new Types.ObjectId(),
    name: "Bono",
    billingType: "subscription" as const,
    classType: "group_regular" as const,
    validFrom: new Date("2026-10-01T00:00:00.000Z"),
    validUntil: new Date("2026-10-31T00:00:00.000Z"),
    status: "active" as const,
    price: 100,
    enrollmentId,
    courseId,
  };
}

function runBatch(args: {
  repository: CourseVoucherGenerationRepository;
  includeSecondEnrollment?: boolean;
  onPrepare?: () => void;
}) {
  const courseId = new Types.ObjectId();
  const studentIds = [new Types.ObjectId(), new Types.ObjectId()];
  const enrollments = studentIds
    .slice(0, args.includeSecondEnrollment === false ? 1 : 2)
    .map((studentId) => ({
      _id: new Types.ObjectId(),
      courseId,
      studentId,
      status: "active",
    }));

  return persistCourseVouchersAfterEnrollmentPreflight({
    courseId,
    studentIds: studentIds.map(String),
    enrollments,
    repository: args.repository,
    prepare: (enrollmentByStudent) => {
      args.onPrepare?.();
      const voucherWrites: CourseVoucherWrite[] = studentIds.map((studentId) => ({
        studentFilter: { _id: studentId },
        plan: plan(
          courseId,
          enrollmentByStudent.get(studentId.toString())!._id,
        ),
      }));
      const billingOperations: CourseMemberBillingOperation[] = studentIds.map(
        (studentId, index) => ({
          updateOne: {
            filter: { _id: courseId, "members.studentId": studentId },
            update: {
              $set: {
                "members.$.billing.lastVoucherId":
                  voucherWrites[index]!.plan._id,
              },
            },
          },
        }),
      );

      return {
        voucherWrites,
        billingOperations,
        result: voucherWrites.map((write) => write.plan._id.toString()),
      };
    },
  });
}

test("A: two vouchers and their billing projections commit together", async () => {
  const repository = new FakeCourseVoucherGenerationRepository();

  const result = await runBatch({ repository });

  assert.equal(result.ok, true);
  assert.equal(repository.vouchers.length, 2);
  assert.deepEqual(repository.billing, [0, 1]);
  assert.equal(repository.transactionCalls, 1);
});

test("B: failure on the second voucher rolls back vouchers and billing", async () => {
  const repository = new FakeCourseVoucherGenerationRepository({
    voucherIndex: 1,
  });

  await assert.rejects(runBatch({ repository }), /voucher 1 failed/);
  assert.deepEqual(repository.vouchers, []);
  assert.deepEqual(repository.billing, []);
});

test("C: missing billing projection rolls back already persisted vouchers", async () => {
  const repository = new FakeCourseVoucherGenerationRepository({
    billingMatchedCount: 1,
  });

  await assert.rejects(
    runBatch({ repository }),
    (error: unknown) =>
      error instanceof CourseVoucherGenerationError &&
      error.code === "BILLING_PROJECTION_MISSING",
  );
  assert.equal(repository.voucherWriteAttempts, 2);
  assert.deepEqual(repository.vouchers, []);
  assert.deepEqual(repository.billing, []);
});

test("D: a later billing failure rolls back the first billing update too", async () => {
  const repository = new FakeCourseVoucherGenerationRepository({
    billingIndex: 1,
  });

  await assert.rejects(runBatch({ repository }), /billing 1 failed/);
  assert.equal(repository.billingWriteAttempts, 2);
  assert.deepEqual(repository.vouchers, []);
  assert.deepEqual(repository.billing, []);
});

test("E: failed enrollment preflight invokes neither prepare nor transaction", async () => {
  const repository = new FakeCourseVoucherGenerationRepository();
  let prepareCalls = 0;

  const result = await runBatch({
    repository,
    includeSecondEnrollment: false,
    onPrepare: () => {
      prepareCalls += 1;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(prepareCalls, 0);
  assert.equal(repository.transactionCalls, 0);
  assert.equal(repository.voucherWriteAttempts, 0);
  assert.equal(repository.billingWriteAttempts, 0);
  assert.deepEqual(repository.vouchers, []);
  assert.deepEqual(repository.billing, []);
});
