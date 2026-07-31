import mongoose, { Types } from "mongoose";

const MICHAEL_ADMIN_ID = "699eb94ad2769e5315da4794";
const MICHAEL_NAME = "Michael";
const MARIA_TEACHER_ID = "699eb94ad2769e5315da4797";
const MARIA_NAME = "María Godoy";
const MICHAEL_TEST_STUDENT_ID = "6a5a4bc15ed1a4ba8989e9e6";

type UserRecord = {
  _id: Types.ObjectId;
  name?: string;
  role?: string;
};

type StudentRecord = {
  _id: Types.ObjectId;
  fullName?: string;
  contactEmail?: string;
  teacherId?: Types.ObjectId | null;
};

type MigrationAction =
  | "already_correct"
  | "will_update"
  | "would_overwrite";

type MigrationRow = {
  studentId: string;
  student: string;
  currentTeacherId: string | null;
  targetTeacherId: string;
  action: MigrationAction;
};

function readBoolean(name: string, defaultValue: boolean) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either "true" or "false".`);
}

function validateKnownObjectIds() {
  const ids = {
    MICHAEL_ADMIN_ID,
    MARIA_TEACHER_ID,
    MICHAEL_TEST_STUDENT_ID,
  };

  for (const [name, value] of Object.entries(ids)) {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error(`${name} is not a valid ObjectId.`);
    }
  }
}

function getTargetTeacherIdForStudent(studentId: string) {
  return studentId === MICHAEL_TEST_STUDENT_ID
    ? MICHAEL_ADMIN_ID
    : MARIA_TEACHER_ID;
}

function assertKnownUser(
  user: UserRecord | undefined,
  expected: { id: string; name: string; role: "admin" | "teacher" },
) {
  if (!user) {
    throw new Error(`User ${expected.name} (${expected.id}) was not found.`);
  }
  if (user.name !== expected.name) {
    throw new Error(
      `User ${expected.id} has name "${user.name ?? ""}", expected "${expected.name}".`,
    );
  }
  if (user.role !== undefined && user.role !== expected.role) {
    throw new Error(
      `User ${expected.name} has role "${user.role}", expected "${expected.role}".`,
    );
  }
}

async function run() {
  validateKnownObjectIds();

  const dryRun = readBoolean("DRY_RUN", true);
  const allowOverwrite = readBoolean("ALLOW_OVERWRITE", false);
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is required.");
  }

  await mongoose.connect(mongoUri);

  try {
    const usersCollection = mongoose.connection.collection<UserRecord>("users");
    const studentsCollection =
      mongoose.connection.collection<StudentRecord>("studentprofiles");
    const knownUserIds = [
      new Types.ObjectId(MICHAEL_ADMIN_ID),
      new Types.ObjectId(MARIA_TEACHER_ID),
    ];
    const users = await usersCollection
      .find({ _id: { $in: knownUserIds } })
      .toArray();
    const usersById = new Map(
      users.map((user) => [user._id.toString(), user]),
    );

    assertKnownUser(usersById.get(MICHAEL_ADMIN_ID), {
      id: MICHAEL_ADMIN_ID,
      name: MICHAEL_NAME,
      role: "admin",
    });
    assertKnownUser(usersById.get(MARIA_TEACHER_ID), {
      id: MARIA_TEACHER_ID,
      name: MARIA_NAME,
      role: "teacher",
    });

    const students = await studentsCollection.find({}).sort({ _id: 1 }).toArray();
    const rows: MigrationRow[] = students.map((student) => {
      const studentId = student._id.toString();
      const currentTeacherId = student.teacherId?.toString() ?? null;
      const targetTeacherId = getTargetTeacherIdForStudent(studentId);
      const action: MigrationAction =
        currentTeacherId === targetTeacherId
          ? "already_correct"
          : currentTeacherId
            ? "would_overwrite"
            : "will_update";

      return {
        studentId,
        student:
          student.fullName?.trim() ||
          student.contactEmail?.trim() ||
          "Unnamed student",
        currentTeacherId,
        targetTeacherId,
        action,
      };
    });
    const alreadyCorrect = rows.filter(
      (row) => row.action === "already_correct",
    ).length;
    const wouldOverwrite = rows.filter(
      (row) => row.action === "would_overwrite",
    ).length;
    const toUpdate = rows.length - alreadyCorrect;
    const assignedToMaria = rows.filter(
      (row) => row.targetTeacherId === MARIA_TEACHER_ID,
    ).length;
    const assignedToMichael = rows.filter(
      (row) => row.targetTeacherId === MICHAEL_ADMIN_ID,
    ).length;

    console.table(rows);
    console.log({
      dryRun,
      allowOverwrite,
      totalStudentsFound: rows.length,
      totalAlreadyCorrect: alreadyCorrect,
      totalToUpdate: toUpdate,
      totalWouldOverwrite: wouldOverwrite,
      totalAssignedToMaria: assignedToMaria,
      totalAssignedToMichael: assignedToMichael,
    });

    if (dryRun) {
      console.log("DRY_RUN=true: no StudentProfile documents were modified.");
      return;
    }

    if (wouldOverwrite > 0 && !allowOverwrite) {
      throw new Error(
        "Some students already have a different teacherId. Re-run with ALLOW_OVERWRITE=true if this is expected.",
      );
    }

    const operations = rows
      .filter((row) => row.action !== "already_correct")
      .map((row) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(row.studentId) },
          update: {
            $set: { teacherId: new Types.ObjectId(row.targetTeacherId) },
          },
        },
      }));

    if (operations.length === 0) {
      console.log("All StudentProfiles already have the expected teacherId.");
      return;
    }

    const result = await studentsCollection.bulkWrite(operations, {
      ordered: true,
    });
    console.log(`Updated ${result.modifiedCount} StudentProfile documents.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown migration error",
  );
  process.exitCode = 1;
});

/*
Manual mongosh alternative (more dangerous; the script above is recommended):

db.studentprofiles.find({}, {
  fullName: 1, name: 1, contactName: 1, contactEmail: 1, teacherId: 1
})

db.studentprofiles.updateOne(
  { _id: ObjectId("6a5a4bc15ed1a4ba8989e9e6") },
  { $set: { teacherId: ObjectId("699eb94ad2769e5315da4794") } }
)

db.studentprofiles.updateMany(
  { _id: { $ne: ObjectId("6a5a4bc15ed1a4ba8989e9e6") } },
  { $set: { teacherId: ObjectId("699eb94ad2769e5315da4797") } }
)

Generic missing-owner form:
db.studentprofiles.updateMany(
  { $or: [{ teacherId: { $exists: false } }, { teacherId: null }] },
  { $set: { teacherId: ObjectId("TEACHER_ID") } }
)

TODO: create seed script for test students assigned to developer teacherId.
*/
