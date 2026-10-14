import mongoose, {
  type AnyBulkWriteOperation,
  type ClientSession,
  type QueryFilter,
  Types,
} from "mongoose";

import {
  preflightCourseVoucherEnrollments,
  type VoucherEnrollmentRecord,
} from "@/lib/utils/voucher-enrollment";
import { CourseProfile, type ICourseProfile } from "@/models/CourseProfile";
import {
  StudentProfile,
  type PlanDoc,
  type StudentProfileDoc,
} from "@/models/StudentProfile";

export type CourseVoucherWrite = {
  studentFilter: QueryFilter<StudentProfileDoc>;
  plan: PlanDoc;
};

export type CourseMemberBillingOperation =
  AnyBulkWriteOperation<ICourseProfile>;

export interface CourseVoucherGenerationTransaction {
  persistVoucher(write: CourseVoucherWrite): Promise<number>;
  persistBilling(
    operations: CourseMemberBillingOperation[],
  ): Promise<number>;
}

export interface CourseVoucherGenerationRepository {
  withTransaction<T>(
    work: (transaction: CourseVoucherGenerationTransaction) => Promise<T>,
  ): Promise<T>;
}

export type CourseVoucherGenerationErrorCode =
  | "VOUCHER_WRITE_CONFLICT"
  | "BILLING_PROJECTION_MISSING";

export class CourseVoucherGenerationError extends Error {
  constructor(
    readonly code: CourseVoucherGenerationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CourseVoucherGenerationError";
  }
}

class MongooseCourseVoucherGenerationTransaction
  implements CourseVoucherGenerationTransaction
{
  constructor(private readonly session: ClientSession) {}

  async persistVoucher(write: CourseVoucherWrite) {
    const result = await StudentProfile.updateOne(
      write.studentFilter,
      { $push: { activePlans: write.plan } },
      { runValidators: true, session: this.session },
    );
    return result.modifiedCount;
  }

  async persistBilling(operations: CourseMemberBillingOperation[]) {
    const result = await CourseProfile.bulkWrite(operations, {
      ordered: true,
      session: this.session,
    });
    return result.matchedCount;
  }
}

export const mongooseCourseVoucherGenerationRepository:
  CourseVoucherGenerationRepository = {
    async withTransaction(work) {
      const session = await mongoose.startSession();
      try {
        return await session.withTransaction(async () =>
          work(new MongooseCourseVoucherGenerationTransaction(session)),
        );
      } finally {
        await session.endSession();
      }
    },
  };

export async function persistCourseVouchersAfterEnrollmentPreflight<
  TEnrollment extends VoucherEnrollmentRecord,
  TResult,
>(args: {
  courseId: Types.ObjectId;
  studentIds: string[];
  enrollments: TEnrollment[];
  prepare: (enrollmentByStudent: Map<string, TEnrollment>) => {
    voucherWrites: CourseVoucherWrite[];
    billingOperations: CourseMemberBillingOperation[];
    result: TResult;
  };
  repository?: CourseVoucherGenerationRepository;
}): Promise<
  | { ok: false; missingStudentIds: string[] }
  | { ok: true; value: TResult }
> {
  const { enrollmentByStudent, missingStudentIds } =
    preflightCourseVoucherEnrollments(args);

  if (missingStudentIds.length > 0) {
    return { ok: false, missingStudentIds };
  }

  const prepared = args.prepare(enrollmentByStudent);
  const repository =
    args.repository ?? mongooseCourseVoucherGenerationRepository;

  await repository.withTransaction(async (transaction) => {
    for (const write of prepared.voucherWrites) {
      const modifiedCount = await transaction.persistVoucher(write);
      if (modifiedCount !== 1) {
        throw new CourseVoucherGenerationError(
          "VOUCHER_WRITE_CONFLICT",
          "Otro proceso creó uno de los bonos para el mismo periodo.",
        );
      }
    }

    const matchedCount = await transaction.persistBilling(
      prepared.billingOperations,
    );
    if (matchedCount !== prepared.billingOperations.length) {
      throw new CourseVoucherGenerationError(
        "BILLING_PROJECTION_MISSING",
        "Some course member billing projections were not found",
      );
    }
  });

  return { ok: true, value: prepared.result };
}
