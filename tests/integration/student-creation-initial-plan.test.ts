import assert from "node:assert/strict";
import test from "node:test";
import mongoose, { Types } from "mongoose";

import { buildInitialStudentPlan } from "../../lib/utils/student-initial-plan";
import { createStudentProfileSchema } from "../../lib/validators/student";
import { StudentProfile } from "../../models/StudentProfile";

const DATABASE = "costaspanish-lms-demo";

test("staging persists a canonical unpaid initial plan without a ledger entry", async () => {
  const uri = process.env.MONGODB_URI;
  if (process.env.APP_ENV !== "staging" || process.env.MONGODB_DB_NAME !== DATABASE || !uri) {
    throw new Error("Integration test requires the staging demo environment");
  }
  const parsedUri = new URL(uri);
  if (parsedUri.pathname !== `/${DATABASE}` || !parsedUri.hostname.includes("staging")) {
    throw new Error("Mongo URI must identify the staging demo database");
  }

  const studentId = new Types.ObjectId();
  const email = `initial-plan-${studentId}@example.test`;
  let connected = false;
  try {
    await mongoose.connect(uri, { dbName: DATABASE, autoIndex: false, autoCreate: false });
    connected = true;
    assert.equal(mongoose.connection.db?.databaseName, DATABASE);
    const payload = createStudentProfileSchema.parse({
      fullName: `Initial Plan Test ${studentId}`,
      contactEmail: email,
      name: "Plan inicial de prueba",
      billingType: "single",
      classType: "private",
      validUntil: "2027-12-31",
      price: 80,
    });
    const plan = buildInitialStudentPlan(payload);
    const student = await StudentProfile.create({
      _id: studentId,
      teacherId: new Types.ObjectId(),
      contactEmail: email,
      contactEmailLower: email,
      fullName: payload.fullName,
      activePlans: [plan],
    });
    const raw = await mongoose.connection.db!.collection("studentprofiles").findOne({ _id: studentId, contactEmail: email });
    assert.ok(raw);
    assert.equal(raw.activePlans.length, 1);
    assert.equal(raw.activePlans[0].price, 80);
    assert.equal(raw.activePlans[0].priceTotal, 80);
    assert.equal(raw.activePlans[0].priceTotalCents, 8000);
    assert.equal(raw.activePlans[0].amountPaid, 0);
    assert.equal(raw.activePlans[0].amountPaidCents, 0);
    assert.equal(raw.activePlans[0].paymentStatus, "pending");
    assert.equal(raw.activePlans[0].paidAt, null);
    assert.equal(raw.activePlans[0].paymentMethod, "");
    assert.equal(raw.activePlans[0].paymentNotes, "");
    assert.equal(await mongoose.connection.db!.collection("paymentledgerentries").countDocuments({ voucherId: student.activePlans[0]._id }), 0);
  } finally {
    if (connected) {
      await mongoose.connection.db!.collection("studentprofiles").deleteOne({ _id: studentId, contactEmail: email });
      await mongoose.disconnect();
    }
  }
});
