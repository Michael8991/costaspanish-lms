import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_MIGRATION !== "true") {
  throw new Error("Production migration requires ALLOW_PRODUCTION_MIGRATION=true");
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME });
try {
  const collection = mongoose.connection.collection("paymentledgerentries");
  const result = await collection.updateMany(
    { amountCents: { $exists: false }, amount: { $type: "number" } },
    [{ $set: { amountCents: { $round: [{ $multiply: ["$amount", 100] }, 0] } } }],
  );
  console.log(`Backfilled amountCents on ${result.modifiedCount} legacy entries.`);
} finally {
  await mongoose.disconnect();
}
