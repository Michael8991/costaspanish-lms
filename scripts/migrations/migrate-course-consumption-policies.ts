import { MongoClient, type Document } from "mongodb";
import type { ConsumptionByAttendance } from "../../lib/types/course-policies";

import { STAGING_DATABASE_NAME } from "../../lib/env/assert-staging-environment";
import {
  buildCourseConsumptionPolicyPlanItem,
  type CourseConsumptionPolicyDocument,
} from "./course-consumption-policy-plan";

type TargetEnvironment = "staging" | "production";

function readEnvironment(): TargetEnvironment {
  const argument = process.argv.find((value) =>
    value.startsWith("--environment="),
  );
  const value = argument?.slice("--environment=".length);
  if (value !== "staging" && value !== "production") {
    throw new Error(
      "Migration blocked: pass --environment=staging or --environment=production.",
    );
  }
  return value;
}

function formatPolicy(
  policy: Partial<ConsumptionByAttendance> | null,
): string {
  if (!policy) return "(missing)";
  return (
    ["attended", "no_show", "canceled_late", "canceled_early"] as const
  )
    .map((key) => `${key}=${String(policy[key])}`)
    .join(" ");
}

async function main(): Promise<void> {
  const environment = readEnvironment();
  const apply = process.argv.includes("--apply");
  if (apply && process.argv.includes("--plan")) {
    throw new Error("Migration blocked: choose either --plan or --apply.");
  }
  const databaseName = process.env.MONGODB_DB_NAME;
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (!databaseName || !mongoUri) {
    throw new Error(
      "Migration blocked: MONGODB_DB_NAME and MONGODB_URI/MONGO_URI are required.",
    );
  }
  if (process.env.APP_ENV !== environment) {
    throw new Error(
      `Migration blocked: APP_ENV must equal explicit environment "${environment}".`,
    );
  }
  if (environment === "staging" && databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      `Migration blocked: staging database must be "${STAGING_DATABASE_NAME}".`,
    );
  }
  if (environment === "production" && databaseName === STAGING_DATABASE_NAME) {
    throw new Error(
      "Migration blocked: production cannot target the staging database.",
    );
  }

  const expectedConfirmation =
    `APPLY_COURSE_CONSUMPTION_POLICIES_${environment.toUpperCase()}_${databaseName}`;
  const confirmation = process.argv
    .find((value) => value.startsWith("--confirm="))
    ?.slice("--confirm=".length);
  if (apply && confirmation !== expectedConfirmation) {
    throw new Error(
      `Apply blocked: pass --confirm=${expectedConfirmation} exactly.`,
    );
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const database = client.db(databaseName);
    const actualDatabaseName = database.databaseName;
    if (actualDatabaseName !== databaseName) {
      throw new Error(
        `Migration blocked: connected database "${actualDatabaseName}" does not match "${databaseName}".`,
      );
    }

    const collection = database.collection<CourseConsumptionPolicyDocument>(
      "courseprofiles",
    );
    const courses = await collection
      .find(
        {},
        {
          projection: {
            _id: 1,
            code: 1,
            name: 1,
            internalName: 1,
            classType: 1,
            "policies.creditPolicy.consumptionByAttendance": 1,
          },
        },
      )
      .toArray();
    const plan = courses.map(buildCourseConsumptionPolicyPlanItem);

    console.log(`mode: ${apply ? "APPLY" : "PLAN (READ-ONLY)"}`);
    console.log(`environment: ${environment}`);
    console.log(`dbName: ${actualDatabaseName}`);
    console.log("");
    for (const item of plan) {
      console.log(`Course: ${item.code} ${item.name}`);
      console.log(`id: ${item.id}`);
      console.log(`classType: ${item.classType}`);
      console.log(`actual: ${formatPolicy(item.current)}`);
      console.log(`proposed: ${formatPolicy(item.proposed)}`);
      console.log(`action: ${item.action}`);
      console.log("");
    }

    const updates = plan.filter(
      (item) => item.action === "UPDATE" && item.proposed,
    );
    let matchedCount = 0;
    let modifiedCount = 0;
    if (apply && updates.length > 0) {
      const courseIds = new Map(
        courses.map((course) => [String(course._id), course._id]),
      );
      const operations = updates.map((item) => {
        const courseId = courseIds.get(item.id);
        if (!courseId) {
          throw new Error(`Apply blocked: course ${item.id} left the plan.`);
        }
        return {
          updateOne: {
            filter: { _id: courseId },
            update: {
              $set: {
                "policies.creditPolicy.consumptionByAttendance":
                  item.proposed,
              },
            } as Document,
          },
        };
      });
      const result = await collection.bulkWrite(
        operations,
        { ordered: true },
      );
      matchedCount = result.matchedCount;
      modifiedCount = result.modifiedCount;
    }

    console.log("Summary:");
    console.log(`scanned=${plan.length}`);
    console.log(
      `withMap=${plan.filter((item) => item.hasExplicitMap).length}`,
    );
    console.log(
      `withoutMap=${plan.filter((item) => !item.hasExplicitMap).length}`,
    );
    console.log(`wouldChange=${updates.length}`);
    console.log(
      `unsupportedClassType=${plan.filter((item) => item.action === "SKIP_UNSUPPORTED_CLASS_TYPE").length}`,
    );
    console.log(`matched=${matchedCount}`);
    console.log(`writes=${modifiedCount}`);
    if (!apply) {
      console.log("READ-ONLY CONFIRMATION: 0 writes; --apply was not supplied.");
      console.log(`Apply requires: --confirm=${expectedConfirmation}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
