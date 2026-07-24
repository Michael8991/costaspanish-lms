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

function getMongoUri(): string {
    const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

    if (!uri) {
        throw new Error("Please define the MONGODB_URI environment variable");
    }

    return uri;
}

const MONGODB_URI = getMongoUri();


//Evitamos múltiples conexiones en dev(HMR)
declare global { 
    var __mongooseConn: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    } | undefined;
}

const mongooseCache = global.__mongooseConn ?? {
    conn: null,
    promise: null,
};

global.__mongooseConn = mongooseCache;

export async function dbConnect() {
    const cached = mongooseCache;

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {
            //Opciones de mongoose. //TODO: Leer documentación
        }).then((m) => m);
    }
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
}

export default dbConnect;
