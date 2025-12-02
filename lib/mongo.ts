import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI!;
const MONGO_DB = process.env.MONGO_DB!;

if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI environment variable");
}
if (!MONGO_DB) {
  throw new Error("Please define the MONGO_URI environment variable");
}

const fullUri = `${MONGO_URI}/${MONGO_DB}`

/**
 * Cached connection for MongoDB.
 */
const cached = global.mongooseCache ?? { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  global.mongooseCache = cached; // guardamos en global para HMR
  return cached.conn;
}

export default dbConnect;
