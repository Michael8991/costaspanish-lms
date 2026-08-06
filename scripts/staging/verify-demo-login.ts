import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";
import User from "../../models/User";

async function verifyDemoLogin(): Promise<void> {
  const databaseName = process.env.MONGODB_DB_NAME;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  const teacherEmail = process.env.DEMO_TEACHER_EMAIL;
  const teacherPassword = process.env.DEMO_TEACHER_PASSWORD;

  if (process.env.APP_ENV !== "staging") {
    throw new Error('APP_ENV must be "staging".');
  }

  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Expected staging database "${STAGING_DATABASE_NAME}".`,
    );
  }

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is missing.");
  }

  if (!teacherEmail) {
    throw new Error("DEMO_TEACHER_EMAIL is missing.");
  }

  if (!teacherPassword) {
    throw new Error("DEMO_TEACHER_PASSWORD is missing.");
  }

  const normalizedEmail = teacherEmail.trim().toLowerCase();

  await mongoose.connect(mongoUri, { dbName: databaseName });

  const user = await User.findOne({ email: normalizedEmail })
    .select("+passwordHash")
    .lean();

  const hasPasswordHash = Boolean(user?.passwordHash);
  const passwordMatches = user?.passwordHash
    ? await bcrypt.compare(teacherPassword, user.passwordHash)
    : false;

  console.log({
    databaseName,
    normalizedEmail,
    userFound: Boolean(user),
    userId: user?._id.toString() ?? null,
    role: user?.role ?? null,
    isActive: user?.isActive ?? null,
    hasPasswordHash,
    passwordMatches,
  });

  if (!user || !user.isActive || !passwordMatches) {
    throw new Error("Demo credentials verification failed.");
  }
}

verifyDemoLogin()
  .catch(error => {
    console.error(
      error instanceof Error
        ? error.message
        : "Demo login verification failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
