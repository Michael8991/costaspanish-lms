import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI;
const courseIdArg = process.argv.find((value) => value.startsWith("--course-id="));
const apply = process.argv.includes("--apply");
if (!uri) throw new Error("MONGO_URI is not configured");
if (!courseIdArg) throw new Error("Usage: --course-id=<ObjectId> [--apply]");
const courseId = courseIdArg.slice("--course-id=".length);
if (!ObjectId.isValid(courseId)) throw new Error("Invalid course id");

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db();
  const course = await db.collection("courseprofiles").findOne({
    _id: new ObjectId(courseId),
  });
  if (!course) throw new Error("Course not found");
  if (!course.templateId) throw new Error("Course has no linked template");
  const template = await db.collection("coursetemplates").findOne({
    _id: course.templateId,
  });
  if (!template) throw new Error("Linked template not found");
  const participantPolicy = template.operationalDefaults?.participantPolicy;
  if (!participantPolicy?.maxStudents) {
    throw new Error("Template has no valid participant capacity");
  }

  const report = {
    mode: apply ? "apply" : "dry-run",
    courseId,
    courseName: course.name ?? course.internalName,
    classType: course.classType,
    before: course.policies?.participantPolicy ?? null,
    templateId: String(template._id),
    template: participantPolicy,
  };
  if (apply) {
    const result = await db.collection("courseprofiles").updateOne(
      { _id: course._id, templateId: template._id },
      {
        $set: {
          "policies.participantPolicy": participantPolicy,
          updatedAt: new Date(),
        },
      },
    );
    report.modifiedCount = result.modifiedCount;
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}
