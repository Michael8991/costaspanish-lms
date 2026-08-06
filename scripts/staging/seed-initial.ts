import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";

import { assertStagingSeedEnvironment } from "./seed-guards";
import {
  DEMO_SEED_VERSION,
  demoCourseTemplate,
  demoLessons,
  demoStudents,
  demoVouchers,
} from "./seed-data";

import User from "../../models/User";
import { StudentProfile } from "../../models/StudentProfile";
import { CourseTemplate } from "../../models/CourseTemplate";
import Lesson from "../../models/Lesson";

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;

  return process.argv
    .find(argument => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

async function connectToStagingDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is not configured.");
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME,
  });
}

async function seedInitialData(): Promise<void> {
  const confirmation = getArgument("confirm");

  assertStagingSeedEnvironment({
    confirmation,
  });

  const teacherEmail = process.env.DEMO_TEACHER_EMAIL;
  const teacherPassword = process.env.DEMO_TEACHER_PASSWORD;

  if (!teacherEmail) {
    throw new Error("DEMO_TEACHER_EMAIL is missing.");
  }

  if (!teacherPassword) {
    throw new Error("DEMO_TEACHER_PASSWORD is missing.");
  }

  const normalizedTeacherEmail = teacherEmail.toLowerCase().trim();

  await connectToStagingDatabase();

  console.log("Connected to the staging database.");
  console.log(`Database: ${process.env.MONGODB_DB_NAME}`);
  console.log(`Seed version: ${DEMO_SEED_VERSION}`);

  await mongoose.connection.transaction(async session => {
    /*
     * 1. Demo teacher
     */

    // Authentication compares this field with bcrypt in lib/auth.ts.
    const passwordHash = await bcrypt.hash(teacherPassword, 12);

    const teacher = await User.findOneAndUpdate(
      {
        email: normalizedTeacherEmail,
      },
      {
        $set: {
          name: "CostaSpanish Demo Teacher",
          email: normalizedTeacherEmail,
          passwordHash,
          role: "teacher",
          preferredLanguage: "es",
          isActive: true,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    if (!teacher) {
      throw new Error("Could not create the demo teacher.");
    }

    const persistedTeacher = await User.findById(teacher._id)
      .select("+passwordHash")
      .session(session);

    if (!persistedTeacher?.passwordHash) {
      throw new Error("Demo teacher does not have a passwordHash.");
    }

    const storedPasswordMatches = await bcrypt.compare(
      teacherPassword,
      persistedTeacher.passwordHash,
    );

    if (!storedPasswordMatches) {
      throw new Error(
        "The persisted passwordHash does not match DEMO_TEACHER_PASSWORD.",
      );
    }

    /*
     * 2. Demo students
     */

    const studentBySeedKey = new Map<
      string,
      InstanceType<typeof StudentProfile>
    >();

    for (const studentData of demoStudents) {
      const student = await StudentProfile.findOneAndUpdate(
        {
          contactEmailLower: studentData.email.toLowerCase(),
        },
        {
          $set: {
            teacherId: teacher._id,
            contactEmail: studentData.email,
            contactEmailLower: studentData.email.toLowerCase(),
            fullName: studentData.fullName,
            level: studentData.level,
            nativeLanguage: studentData.nativeLanguage,
            timezone: "Europe/Madrid",
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      );

      if (!student) {
        throw new Error(
          `Could not create student ${studentData.seedKey}.`,
        );
      }

      studentBySeedKey.set(studentData.seedKey, student);
    }

    /*
     * 3. Course template
     */

    const courseTemplate =
      await CourseTemplate.findOneAndUpdate(
        {
          ownerTeacherId: teacher._id,
          code: demoCourseTemplate.code,
        },
        {
          $set: {
            ownerTeacherId: teacher._id,
            internalName: demoCourseTemplate.name,
            status: demoCourseTemplate.status,
            version: demoCourseTemplate.version,
            pedagogicalMeta: {
              level: "A2",
              category: "Conversation",
              objectives: [
                "Improve conversational fluency",
                "Build confidence in everyday situations",
              ],
            },
            storefront: {
              isPublished: false,
              publicTitle: demoCourseTemplate.name,
              shortDescription: demoCourseTemplate.description,
              benefits: [],
              priceMode: "package",
              priceOptions: [],
              currency: "EUR",
            },
          },
          $setOnInsert: {
            code: demoCourseTemplate.code,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      );

    if (!courseTemplate) {
      throw new Error(
        "Could not create the demo course template.",
      );
    }

    /*
     * 4. Vouchers
     */

    for (const voucherData of demoVouchers) {
      const student = studentBySeedKey.get(
        voucherData.studentSeedKey,
      );

      if (!student) {
        throw new Error(
          `Missing student ${voucherData.studentSeedKey}.`,
        );
      }

      const voucherObjectId = new Types.ObjectId(voucherData.id);
      const otherPlans = student.activePlans.filter(
        plan => !plan._id.equals(voucherObjectId),
      );

      student.set("activePlans", [
        ...otherPlans,
        {
          _id: voucherObjectId,
          name: voucherData.name,
          billingType: voucherData.billingType,
          classType: voucherData.classType,
          creditsTotal: voucherData.creditsTotal,
          creditsRemaining: voucherData.creditsRemaining,
          validFrom: voucherData.validFrom,
          validUntil: voucherData.validUntil,
          status: "active",
          price: voucherData.price,
          paymentStatus: "paid",
          amountPaid: voucherData.price,
          paidAt: voucherData.validFrom,
          paymentMethod: "bank_transfer",
          priceTotal: voucherData.price,
          currency: "EUR",
          unitCreditPriceSnapshot:
            voucherData.price / voucherData.creditsTotal,
          createdFrom: "manual",
        },
      ]);

      await student.save({ session });
    }

    /*
     * 5. Lessons
     */

    for (const lessonData of demoLessons) {
      const student = studentBySeedKey.get(
        lessonData.studentSeedKey,
      );

      if (!student) {
        throw new Error(
          `Missing student ${lessonData.studentSeedKey}.`,
        );
      }

      await Lesson.findOneAndUpdate(
        {
          teacherId: teacher._id,
          title: lessonData.title,
        },
        {
          $set: {
            teacherId: teacher._id,
            courseTemplateId: courseTemplate._id,
            courseTemplateVersion: demoCourseTemplate.version,
            title: lessonData.title,
            status: lessonData.status,
            preparationStatus: "prepared",
            scheduledStart: lessonData.startsAt,
            scheduledEnd: new Date(
              lessonData.startsAt.getTime() +
                lessonData.durationMinutes * 60 * 1000,
            ),
            timezone: "Europe/Madrid",
            classType: "private",
            isTrial: lessonData.isTrial,
            attendees: [
              {
                studentId: student._id,
                voucherId: lessonData.voucherId
                  ? new Types.ObjectId(lessonData.voucherId)
                  : undefined,
                attendanceStatus:
                  lessonData.status === "completed"
                    ? "attended"
                    : "pending",
                creditsToConsume: lessonData.isTrial ? 0 : 1,
                isTrial: lessonData.isTrial,
              },
            ],
            creationSource: "template",
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      );
    }
  });

  console.log("");
  console.log("Initial staging seed completed.");
  console.log(`Teacher: ${normalizedTeacherEmail}`);
  console.log(`Students: ${demoStudents.length}`);
  console.log(`Vouchers: ${demoVouchers.length}`);
  console.log(`Lessons: ${demoLessons.length}`);
  console.log("No production data was used.");
}

seedInitialData()
  .catch(error => {
    console.error("");
    console.error("Staging seed failed:");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
