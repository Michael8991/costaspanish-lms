import assert from "node:assert/strict";
import test from "node:test";
import mongoose, { Types } from "mongoose";

import { fromCents } from "../../lib/utils/money";
import { paymentLedgerAmountCentsExpression } from "../../lib/utils/payment-ledger-money";

const DATABASE = "costaspanish-lms-demo";

test("Mongo aggregates canonical and raw legacy payments exactly once in cents", async () => {
  const uri = process.env.MONGODB_URI;
  if (process.env.APP_ENV !== "staging" || process.env.MONGODB_DB_NAME !== DATABASE || !uri) {
    throw new Error("Integration test requires the explicit staging demo environment");
  }
  const parsedUri = new URL(uri);
  if (parsedUri.pathname !== `/${DATABASE}` || !parsedUri.hostname.includes("staging")) {
    throw new Error("Mongo URI must identify the staging demo database");
  }

  const runId = new Types.ObjectId();
  const canonicalId = new Types.ObjectId();
  const legacyId = new Types.ObjectId();
  let connected = false;
  try {
    await mongoose.connect(uri, { dbName: DATABASE, autoIndex: false });
    connected = true;
    const db = mongoose.connection.db;
    assert.equal(db?.databaseName, DATABASE);
    const collection = db.collection("paymentledgerentries");

    // Raw insertion leaves amountCents genuinely absent on the legacy row.
    await collection.insertMany([
      { _id: canonicalId, auditRunId: runId, amount: 80, amountCents: 8000 },
      { _id: legacyId, auditRunId: runId, amount: 40 },
    ]);
    const legacy = await collection.findOne({ _id: legacyId, auditRunId: runId });
    assert.equal(Object.hasOwn(legacy ?? {}, "amountCents"), false);

    const rows = await collection.aggregate<{ totalCents: number }>([
      { $match: { auditRunId: runId, _id: { $in: [canonicalId, legacyId] } } },
      { $group: { _id: null, totalCents: { $sum: paymentLedgerAmountCentsExpression } } },
    ]).toArray();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].totalCents, 12000);
    assert.equal(fromCents(rows[0].totalCents), 120);
  } finally {
    if (connected) {
      await mongoose.connection.db!.collection("paymentledgerentries").deleteMany({
        auditRunId: runId,
        _id: { $in: [canonicalId, legacyId] },
      });
      await mongoose.disconnect();
    }
  }
});
