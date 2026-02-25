// import mongoose from "mongoose";

// const MONGO_URI = process.env.MONGO_URI!;
// const MONGO_DB = process.env.MONGO_DB!;

// if (!MONGO_URI) {
//   throw new Error("Please define the MONGO_URI environment variable");
// }
// if (!MONGO_DB) {
//   throw new Error("Please define the MONGO_URI environment variable");
// }

// const fullUri = `${MONGO_URI}/${MONGO_DB}`

// /**
//  * Cached connection for MongoDB.
//  */
// const cached = global.mongooseCache ?? { conn: null, promise: null };

// async function dbConnect() {
//   if (cached.conn) {
//     return cached.conn;
//   }

//   if (!cached.promise) {
//     cached.promise = mongoose.connect(fullUri).then((mongoose) => {
//       return mongoose;
//     });
//   }
//   cached.conn = await cached.promise;
//   global.mongooseCache = cached; // guardamos en global para HMR
//   return cached.conn;
// }

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment variables");
}


//Evitamos múltiples conexiones en dev(HMR)
declare global { 
    var __mongooseConn: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    } | undefined;
}

global.__mongooseConn ||= { conn: null, promise: null };

export async function dbConnect() {
    if (global.__mongooseConn!.conn) return global.__mongooseConn!.conn;

    if (!global.__mongooseConn!.promise) {
        global.__mongooseConn!.promise = mongoose.connect(MONGODB_URI!, {
            //Opciones de mongoose. //TODO: Leer documentación
        }).then((m) => m);
    }
    global.__mongooseConn!.conn = await global.__mongooseConn!.promise;
    return global.__mongooseConn!.conn;
}

export default dbConnect;
