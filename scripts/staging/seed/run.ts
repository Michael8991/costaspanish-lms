import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose, { Types, type ClientSession } from "mongoose";
import User from "../../../models/User";
import { StudentProfile } from "../../../models/StudentProfile";
import { CourseTemplate } from "../../../models/CourseTemplate";
import { CourseProfile } from "../../../models/CourseProfile";
import { CourseEnrollment } from "../../../models/CourseEnrollment";
import { Resource } from "../../../models/ResourceProfile";
import { PaymentLedgerEntry } from "../../../models/PaymentLedgerEntry";
import { CreditLedgerEntry } from "../../../models/CreditLedgerEntry";
import Lesson from "../../../models/Lesson";
import { assertStagingSeedEnvironment } from "../seed-guards";
import { buildDataset, type SeedDataset } from "./dataset";
import { auditDataset, canonicalJson } from "./audit";
import { SEED_NAME, seedId, utcDay } from "./identity";
import { toStudentDetailDTO, toStudentListDTO } from "../../../lib/dto/student.dto";
import { toCourseProfileListItemDTO } from "../../../lib/utils/course-profile.mapper";
import { toResourceListItemDTO } from "../../../lib/dto/resource.dto";
import { toLessonListDTO } from "../../../lib/utils/lesson.mapper";
import { toPaymentLedgerEntryDTO } from "../../../lib/utils/payment-ledger.mapper";
import { toClassBookRowDTO } from "../../../lib/utils/class-book.mapper";

const DATABASE = "costaspanish-lms-demo";
const teacherName = "CostaSpanish Demo Teacher";
const models = { students: StudentProfile, templates: CourseTemplate, courses: CourseProfile,
  enrollments: CourseEnrollment, resources: Resource, payments: PaymentLedgerEntry, lessons: Lesson, credits: CreditLedgerEntry };
type Group = keyof typeof models;
const groups = Object.keys(models) as Group[];

function connectionUri() {
  assert.equal(process.env.APP_ENV, "staging", "Seed requires APP_ENV=staging");
  assert.equal(process.env.MONGODB_DB_NAME, DATABASE, "Seed requires the staging demo database");
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  assert.ok(uri, "Missing Mongo URI");
  const parsed = new URL(uri);
  assert.ok(["mongodb:", "mongodb+srv:"].includes(parsed.protocol));
  assert.ok(parsed.hostname.includes("staging"), "URI hostname must identify staging");
  assert.equal(parsed.pathname, `/${DATABASE}`, "URI database must also be the staging demo database");
  console.log(JSON.stringify({ environment: "staging", database: DATABASE, uriSource: process.env.MONGODB_URI ? "MONGODB_URI" : "MONGO_URI", host: parsed.hostname }));
  return uri;
}

function owned(group: Group, row: Record<string, unknown>) {
  if (group === "students" || group === "courses") return row.internalNotes === SEED_NAME;
  if (group === "templates") return String(row.code).startsWith("DEMO2-TEMPLATE-");
  if (group === "resources") return Array.isArray(row.tags) && row.tags.includes(SEED_NAME);
  if (group === "lessons") return row.teacherNotes === SEED_NAME;
  if (group === "payments" || group === "credits") return row.notes === SEED_NAME;
  return true; // Enrollment ownership is checked by its exact course/student identity below.
}

async function preflight(data: SeedDataset, session?: ClientSession) {
  const db = mongoose.connection.db!;
  const changes: Record<string, unknown>[] = [];
  for (const group of groups) {
    const collection = db.collection(models[group].collection.name);
    for (const document of data[group]) {
      const existing = await collection.findOne({ _id: document._id }, { session });
      if (existing) {
        assert.ok(owned(group, existing), `ID collision with non-seed ${group}/${document._id}`);
        if (group === "enrollments") {
          const expected = document.toObject() as Record<string, unknown>;
          assert.equal(String(existing.courseId), String(expected.courseId));
          assert.equal(String(existing.studentId), String(expected.studentId));
        }
        if (group === "students") {
          const ids = new Set(data.students.flatMap(student => student.activePlans.map(plan => String(plan._id))));
          for (const plan of existing.activePlans ?? []) assert.ok(ids.has(String(plan._id)), "Seed student has a non-seed voucher; aborting");
        }
      }
      changes.push({ collection: collection.collectionName, id: String(document._id), action: existing ? "replace_seed_document" : "insert" });
    }
  }
  const studentIds = data.students.map(row => row._id), courseIds = data.courses.map(row => row._id);
  const voucherIds = data.students.flatMap(row => row.activePlans.map(plan => plan._id));
  const foreignReferences = [
    { group: "payments" as const, filter: { $or: [{ studentId: { $in: studentIds } }, { voucherId: { $in: voucherIds } }] } },
    { group: "credits" as const, filter: { $or: [{ studentId: { $in: studentIds } }, { voucherId: { $in: voucherIds } }] } },
    { group: "lessons" as const, filter: { $or: [{ "attendees.studentId": { $in: studentIds } }, { courseId: { $in: courseIds } }] } },
    { group: "enrollments" as const, filter: { $or: [{ studentId: { $in: studentIds } }, { courseId: { $in: courseIds } }] } },
  ];
  for (const { group, filter } of foreignReferences) {
    const foreign = await db.collection(models[group].collection.name).findOne({
      ...filter, _id: { $nin: data[group].map(row => row._id) },
    }, { session });
    assert.ok(!foreign, `Non-seed ${group} references seed entities; aborting without overwriting related data`);
  }
  return changes;
}

async function outsideFingerprint(data: SeedDataset) {
  const hashes: Record<string, string> = {};
  for (const group of groups) {
    const rows = await mongoose.connection.db!.collection(models[group].collection.name)
      .find({ _id: { $nin: data[group].map(document => document._id) } }).sort({ _id: 1 }).toArray();
    hashes[group] = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  }
  return hashes;
}

async function readDataset(expected: SeedDataset): Promise<SeedDataset> {
  const result = { ...expected };
  for (const group of groups) {
    const rows = await mongoose.connection.db!.collection(models[group].collection.name)
      .find({ _id: { $in: expected[group].map(document => document._id) } }).sort({ _id: 1 }).toArray();
    assert.equal(rows.length, expected[group].length, `Persisted count mismatch: ${group}`);
    // Check raw amounts first; hydration defaults must not hide missing canonical fields.
    if (group === "payments") for (const row of rows) {
      assert.ok(Number.isSafeInteger(row.amountCents) && row.amountCents > 0);
      assert.equal(row.amount, row.amountCents / 100);
    }
    if (group === "students") for (const row of rows) for (const plan of row.activePlans) {
      assert.ok(Number.isSafeInteger(plan.priceTotalCents) && plan.priceTotalCents >= 0);
      assert.ok(Number.isSafeInteger(plan.amountPaidCents) && plan.amountPaidCents >= 0);
    }
    Object.assign(result, { [group]: rows.map(row => models[group].hydrate(row)) });
  }
  return result;
}

function assertScreenMappings(data: SeedDataset) {
  const teacherId = String(data.students[0].teacherId);
  for (const student of data.students) {
    assert.equal(toStudentListDTO(student).id, String(student._id));
    assert.equal(toStudentDetailDTO(student).activePlans.length, student.activePlans.length);
  }
  for (const course of data.courses) assert.equal(toCourseProfileListItemDTO(course).id, String(course._id));
  for (const resource of data.resources) assert.equal(toResourceListItemDTO(resource.toObject(), teacherId).id, String(resource._id));
  for (const lesson of data.lessons) assert.equal(toLessonListDTO(lesson.toObject()).id, String(lesson._id));
  for (const payment of data.payments) assert.equal(toPaymentLedgerEntryDTO(payment.toObject()).amountCents, payment.amountCents);
  const coursesById = new Map(data.courses.map(course => [String(course._id), course.name ?? course.internalName]));
  const studentsById = new Map(data.students.map(student => [String(student._id), {
    id: String(student._id), name: student.fullName,
    activePlans: student.activePlans.map(plan => ({ id: String(plan._id), creditsTotal: plan.creditsTotal ?? null,
      price: plan.price, priceTotal: plan.priceTotal ?? null, unitCreditPriceSnapshot: plan.unitCreditPriceSnapshot ?? null })),
  }]));
  const ledgerByLessonId = new Map<string, { creditsConsumed: number; estimatedRevenue: number }[]>();
  for (const credit of data.credits) {
    const key = String(credit.lessonId);
    ledgerByLessonId.set(key, [...ledgerByLessonId.get(key) ?? [], { creditsConsumed: credit.creditsConsumed,
      estimatedRevenue: credit.estimatedRevenue }]);
  }
  for (const lesson of data.lessons) {
    const dto = toClassBookRowDTO(lesson.toObject(), { coursesById, studentsById, ledgerByLessonId });
    assert.equal(dto.lessonId, String(lesson._id));
    assert.ok(Number.isFinite(dto.estimatedRevenue));
  }
  return { students: data.students.length, courses: data.courses.length, lessons: data.lessons.length,
    resources: data.resources.length, payments: data.payments.length, classBookRows: data.lessons.length };
}

export async function runSeed() {
  const planOnly = process.argv.includes("--plan");
  const auditOnly = process.argv.includes("--audit");
  if (!planOnly && !auditOnly) assertStagingSeedEnvironment({
    confirmation: process.argv.find(value => value.startsWith("--confirm="))?.slice("--confirm=".length),
  });
  const email = process.env.DEMO_TEACHER_EMAIL?.trim().toLowerCase();
  assert.ok(email, "DEMO_TEACHER_EMAIL is required");
  const anchorInput = process.argv.find(value => value.startsWith("--date="))?.slice(7);
  if (anchorInput) assert.match(anchorInput, /^\d{4}-\d{2}-\d{2}$/);
  const anchor = utcDay(anchorInput ? new Date(`${anchorInput}T00:00:00.000Z`) : new Date());
  assert.ok(Number.isFinite(anchor.getTime()), "Invalid reference date");
  mongoose.set("autoIndex", false); mongoose.set("autoCreate", false);
  await mongoose.connect(connectionUri(), { dbName: DATABASE, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
  try {
    assert.equal(mongoose.connection.db!.databaseName, DATABASE);
    const server = await mongoose.connection.db!.admin().command({ hello: 1 });
    assert.ok(server.setName, "Seed requires a replica set for atomic writes");
    const teacher = await User.findOne({ email });
    if (teacher) {
      assert.equal(teacher.name, teacherName, "Configured email belongs to a non-demo user; aborting");
      assert.equal(teacher.role, "teacher");
    }
    const teacherId: Types.ObjectId = teacher?._id ?? seedId("teacher", 0);
    if (!teacher) assert.ok(!await User.exists({ _id: teacherId }), "Teacher ID collision");
    const data = buildDataset(teacherId, anchor);
    for (const group of groups) for (const document of data[group]) await document.validate();
    const expectedAudit = auditDataset(data);
    const changes = await preflight(data);
    const changeCounts = changes.reduce<Record<string, number>>((totals, change) => {
      const key = `${change.collection}:${change.action}`;
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {});
    console.log(JSON.stringify({ mode: planOnly ? "PLAN_READ_ONLY" : auditOnly ? "AUDIT_READ_ONLY" : "APPLY_SEED",
      seed: SEED_NAME, referenceDate: anchor.toISOString(), teacher: { id: String(teacherId), email, action: teacher ? "reuse_unchanged" : "insert" },
      delete: [], changes: planOnly ? changes : undefined, changeCounts, expected: expectedAudit }, null, 2));
    if (planOnly) return;
    const before = await outsideFingerprint(data);
    if (!auditOnly) {
      const password = process.env.DEMO_TEACHER_PASSWORD;
      assert.ok(teacher || password, "DEMO_TEACHER_PASSWORD is required for a new teacher");
      const passwordHash = teacher ? undefined : await bcrypt.hash(password!, 12);
      // About 100 small documents: one bounded transaction keeps the complete graph atomic.
      await mongoose.connection.transaction(async session => {
        await preflight(data, session);
        if (!teacher) await User.create([{ _id: teacherId, email, name: teacherName, passwordHash,
          role: "teacher", preferredLanguage: "es", isActive: true }], { session });
        for (const group of groups) {
          const collection = mongoose.connection.db!.collection(models[group].collection.name);
          for (const document of data[group]) {
            const existing = await collection.findOne({ _id: document._id }, { session });
            const row = document.toObject();
            await collection.replaceOne({ _id: document._id }, { ...row,
              createdAt: existing?.createdAt ?? anchor, updatedAt: new Date() }, { upsert: true, session });
          }
        }
      });
    }
    const persisted = await readDataset(data);
    const audit = auditDataset(persisted);
    const screenMappings = assertScreenMappings(persisted);
    assert.equal(audit.fingerprint, expectedAudit.fingerprint, "Persisted graph differs from validated dataset");
    assert.equal(canonicalJson(await outsideFingerprint(data)), canonicalJson(before), "Non-seed documents changed during run");
    console.log(JSON.stringify({ result: "PASS", ...audit, screenMappings, unrelatedDocumentsUnchanged: true,
      databaseCounts: Object.fromEntries(await Promise.all(groups.map(async group => [group, await mongoose.connection.db!.collection(models[group].collection.name).countDocuments()]))),
      students: persisted.students.map(student => ({ name: student.fullName, vouchers: student.activePlans.map(plan => ({ id: String(plan._id),
        course: plan.courseNameSnapshot, status: plan.status, paymentStatus: plan.paymentStatus,
        priceTotalCents: plan.priceTotalCents, amountPaidCents: plan.amountPaidCents, credits: `${plan.creditsRemaining}/${plan.creditsTotal}` })) })) }, null, 2));
  } finally { await mongoose.disconnect(); }
}
