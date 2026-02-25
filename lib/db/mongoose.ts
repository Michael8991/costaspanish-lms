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

export async function connectMongo() {
    if (global.__mongooseConn!.conn) return global.__mongooseConn!.conn;

    if (!global.__mongooseConn!.promise) {
        global.__mongooseConn!.promise = mongoose.connect(MONGODB_URI!, {
            //Opciones de mongoose. //TODO: Leer documentación
        }).then((m) => m);
    }
    global.__mongooseConn!.conn = await global.__mongooseConn!.promise;
    return global.__mongooseConn!.conn;
}