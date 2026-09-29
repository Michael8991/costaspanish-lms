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
import {
    MongoNetworkError,
    MongoNetworkTimeoutError,
    MongoServerError,
    MongoServerSelectionError,
} from "mongodb";
import { assertStagingEnvironment } from "./env/assert-staging-environment";

function getMongoUri(): string {
    const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

    if (!uri) {
        throw new Error("Please define the MONGODB_URI environment variable");
    }

    return uri;
}

const MONGODB_URI = getMongoUri();
const mongoUriScheme = MONGODB_URI.startsWith("mongodb+srv://")
    ? "mongodb+srv"
    : MONGODB_URI.startsWith("mongodb://")
        ? "mongodb"
        : "unknown";

function getSafeStringOrNumber(value: unknown): string | number | null {
    return typeof value === "string" || typeof value === "number"
        ? value
        : null;
}

function getSafeErrorChain(error: unknown): unknown[] {
    const chain: unknown[] = [];
    const seen = new Set<unknown>();
    let current = error;

    while (
        typeof current === "object" &&
        current !== null &&
        !seen.has(current) &&
        chain.length < 4
    ) {
        chain.push(current);
        seen.add(current);
        current = (current as Record<string, unknown>).cause;
    }

    return chain;
}

function getSafeMongoErrorDiagnostic(error: unknown) {
    const errorChain = getSafeErrorChain(error);
    const errorRecord =
        typeof error === "object" && error !== null
            ? error as Record<string, unknown>
            : {};
    const causeRecord =
        typeof errorRecord.cause === "object" && errorRecord.cause !== null
            ? errorRecord.cause as Record<string, unknown>
            : {};
    const errorCode = getSafeStringOrNumber(errorRecord.code);
    const causeCode = getSafeStringOrNumber(causeRecord.code);
    const syscall = getSafeStringOrNumber(errorRecord.syscall);
    const diagnosticRecords = errorChain.map(
        value => value as Record<string, unknown>,
    );
    const diagnosticCodes = diagnosticRecords
        .flatMap(record => [record.code, record.errno])
        .filter((value): value is string => typeof value === "string");
    const diagnosticSyscalls = diagnosticRecords
        .map(record => record.syscall)
        .filter((value): value is string => typeof value === "string");

    return {
        errorName:
            typeof errorRecord.name === "string" ? errorRecord.name : null,
        errorCode,
        errorCodeName: getSafeStringOrNumber(errorRecord.codeName),
        errno: getSafeStringOrNumber(errorRecord.errno),
        syscall,
        causeName:
            typeof causeRecord.name === "string" ? causeRecord.name : null,
        causeCode,
        isMongoServerSelectionError:
            errorChain.some(value => value instanceof MongoServerSelectionError),
        isMongoNetworkError:
            errorChain.some(value => value instanceof MongoNetworkError),
        isMongoNetworkTimeoutError:
            errorChain.some(value => value instanceof MongoNetworkTimeoutError),
        isMongoServerError:
            errorChain.some(value => value instanceof MongoServerError),
        isAuthenticationError:
            diagnosticRecords.some(
                record =>
                    record.code === 18 ||
                    record.codeName === "AuthenticationFailed",
            ),
        isDnsError:
            diagnosticCodes.some(code =>
                ["ENOTFOUND", "ENODATA", "EAI_AGAIN"].includes(code),
            ) ||
            diagnosticSyscalls.some(value =>
                ["querySrv", "queryTxt", "getaddrinfo"].includes(value),
            ),
        isTlsError: diagnosticCodes.some(
            code => code.startsWith("ERR_SSL_") || code.startsWith("ERR_TLS_"),
        ),
        isTimeoutError:
            errorChain.some(value => value instanceof MongoNetworkTimeoutError) ||
            diagnosticCodes.some(code =>
                ["ETIMEDOUT", "ETIMEOUT"].includes(code),
            ),
        occurredDuringMongooseConnect: true,
        mongoUriScheme,
        nodeVersion: process.version,
        mongooseReadyState: mongoose.connection.readyState,
        connectedDb: mongoose.connection.db?.databaseName ?? null,
    };
}


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
    assertStagingEnvironment();
    const cached = mongooseCache;

    if (cached.conn) {
        return cached.conn;
    }

    try {
        if (!cached.promise) {
            cached.promise = mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME,
            }).then((m) => m);
        }
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        if (process.env.APP_ENV === "staging") {
            try {
                console.info(
                    "[staging-mongo-error-diagnostic]",
                    getSafeMongoErrorDiagnostic(error),
                );
            } catch {
                // Diagnostic logging must never replace the original error.
            }
        }
        throw error;
    }
}

export default dbConnect;
