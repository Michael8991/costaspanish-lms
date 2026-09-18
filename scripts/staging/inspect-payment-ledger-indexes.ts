import mongoose from "mongoose";
import { PaymentLedgerEntry } from '../../models/PaymentLedgerEntry';

const EXPECTED_DATABASE = "costaspanish-lms-demo";

async function main() {
    if (process.env.APP_ENV !== "staging") {
        throw new Error(`APP_ENV must be "staging".`)
    }

    if (process.env.MONGODB_DB_NAME !== EXPECTED_DATABASE) {
        throw new Error(`Expected databe "${EXPECTED_DATABASE}", got "${process.env.MONGODB_DB_NAME}.`);
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is required.");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME,
    },);

    try {
        
        const dbName = mongoose.connection.db?.databaseName;

        if (dbName !== EXPECTED_DATABASE) {
            throw new Error(`Connected to unsafe DB "${dbName}".`)
        }

        const indexes = await PaymentLedgerEntry.collection.indexes();

        console.dir(indexes, { depth: null });
    } finally {
        await mongoose.disconnect();
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});