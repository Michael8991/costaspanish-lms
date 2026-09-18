import mongoose from "mongoose";

const EXPECTED_DATABASE =
  "costaspanish-lms-demo";

const uri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI or MONGO_URI is required",
  );
}

if (process.env.APP_ENV !== "staging") {
  throw new Error(
    'APP_ENV must be "staging".',
  );
}

if (
  process.env.MONGODB_DB_NAME !==
  EXPECTED_DATABASE
) {
  throw new Error(
    `Expected database "${EXPECTED_DATABASE}", ` +
      `got "${process.env.MONGODB_DB_NAME}".`,
  );
}

await mongoose.connect(uri, {
  dbName: process.env.MONGODB_DB_NAME,
});

try {
  const actualDatabase =
    mongoose.connection.db?.databaseName;

  if (actualDatabase !== EXPECTED_DATABASE) {
    throw new Error(
      `Connected to unsafe database "${actualDatabase}".`,
    );
  }

  const collection =
    mongoose.connection.collection(
      "paymentledgerentries",
    );

  /*
   * Estado físico antes de migrar.
   */
  const indexesBefore =
    await collection.indexes();

  console.log(
    `Database: ${actualDatabase}`,
  );

  console.log(
    "Indexes before migration:",
  );

  console.dir(indexesBefore, {
    depth: null,
  });

  /*
   * Comprobar que podemos crear
   * el índice unique de idempotencia.
   */
  const duplicateIdempotencyKeys =
    await collection
      .aggregate([
        {
          $match: {
            idempotencyKey: {
              $type: "string",
            },
          },
        },
        {
          $group: {
            _id: {
              teacherId: "$teacherId",
              idempotencyKey:
                "$idempotencyKey",
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $match: {
            count: {
              $gt: 1,
            },
          },
        },
      ])
      .toArray();

  if (
    duplicateIdempotencyKeys.length > 0
  ) {
    throw new Error(
      `Cannot create idempotency index: ` +
        `${duplicateIdempotencyKeys.length} duplicate keys found.`,
    );
  }

  /*
   * El índice legacy impedía tener
   * varios movimientos activos
   * para el mismo voucher.
   */
  const legacyName =
    "unique_active_payment_per_voucher";

  if (
    indexesBefore.some(
      (index) =>
        index.name === legacyName,
    )
  ) {
    await collection.dropIndex(
      legacyName,
    );

    console.log(
      `Dropped legacy index: ${legacyName}`,
    );
  } else {
    console.log(
      `Legacy index not present: ${legacyName}`,
    );
  }

  /*
   * Índice de consulta.
   * NO es unique:
   * un voucher puede tener muchos pagos.
   */
  const voucherIndex =
    await collection.createIndex(
      {
        teacherId: 1,
        voucherId: 1,
        status: 1,
      },
      {
        name:
          "teacherId_1_voucherId_1_status_1",
      },
    );

  console.log(
    `Ensured index: ${voucherIndex}`,
  );

  /*
   * Idempotencia.
   * El mismo intento lógico de pago
   * solo puede existir una vez.
   */
  const idempotencyIndex =
    await collection.createIndex(
      {
        teacherId: 1,
        idempotencyKey: 1,
      },
      {
        unique: true,

        partialFilterExpression: {
          idempotencyKey: {
            $type: "string",
          },
        },

        name:
          "unique_payment_idempotency_key_per_teacher",
      },
    );

  console.log(
    `Ensured index: ${idempotencyIndex}`,
  );

  /*
   * Verificación física final.
   */
  const indexesAfter =
    await collection.indexes();

  console.log(
    "Indexes after migration:",
  );

  console.dir(indexesAfter, {
    depth: null,
  });
} finally {
  await mongoose.disconnect();
}