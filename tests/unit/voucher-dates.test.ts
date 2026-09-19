import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isDateOnlyExpired } from "@/lib/utils/date-only";
import { isPlanCompatible } from "@/lib/utils/lesson-voucher";
import { toStudentPlanListDTO } from "@/lib/dto/student.dto";

describe("isDateOnlyExpired", () => {
  it("keeps a voucher valid in the morning of its last day", () => {
    assert.equal(isDateOnlyExpired("2026-09-30T00:00:00.000Z", new Date("2026-09-30T08:00:00.000Z")), false);
  });
  it("keeps voucher valid during the whole validUntil day", () => {
    const validUntil =
      new Date("2026-09-30T00:00:00.000Z");

    const now =
      new Date("2026-09-30T23:59:59.999Z");

    assert.equal(
      isDateOnlyExpired(validUntil, now),
      false,
    );
  });

  it("expires voucher on the following UTC calendar day", () => {
    const validUntil =
      new Date("2026-09-30T00:00:00.000Z");

    const now =
      new Date("2026-10-01T00:00:00.000Z");

    assert.equal(
      isDateOnlyExpired(validUntil, now),
      true,
    );
  });

  it("does not expire before validUntil", () => {
    const validUntil =
      new Date("2026-09-30T00:00:00.000Z");

    const now =
      new Date("2026-09-29T23:59:59.999Z");

    assert.equal(
      isDateOnlyExpired(validUntil, now),
      false,
    );
  });

  it("handles year boundaries", () => {
    const validUntil =
      new Date("2026-12-31T00:00:00.000Z");

    assert.equal(
      isDateOnlyExpired(
        validUntil,
        new Date("2026-12-31T20:00:00.000Z"),
      ),
      false,
    );

    assert.equal(
      isDateOnlyExpired(
        validUntil,
        new Date("2027-01-01T00:00:00.000Z"),
      ),
      true,
    );
  });

  it("treats ISO strings and Date values identically around month boundaries", () => {
    for (const now of ["2026-09-30T12:00:00.000Z", "2026-10-01T00:00:00.000Z"]) {
      assert.equal(
        isDateOnlyExpired("2026-09-30T00:00:00.000Z", new Date(now)),
        isDateOnlyExpired(new Date("2026-09-30T00:00:00.000Z"), new Date(now)),
      );
    }
  });

  it("does not depend on Europe/Madrid daylight-saving offsets", () => {
    for (const day of ["2026-03-29", "2026-10-25"]) {
      assert.equal(isDateOnlyExpired(day, new Date(`${day}T23:59:59.999Z`)), false);
    }
  });

  it("does not treat invalid dates as expired", () => {
    assert.equal(isDateOnlyExpired("invalid", new Date("2026-10-01T00:00:00.000Z")), false);
  });
});

it("keeps DTO temporal status active through the final UTC day", () => {
  const dto = toStudentPlanListDTO({
    validFrom: new Date("2020-01-01T00:00:00.000Z"),
    validUntil: new Date(),
    status: "active",
    creditsRemaining: 1,
  });
  assert.equal(dto.temporalStatus, "active");
});

it("keeps lesson voucher compatibility through the final day", () => {
  const plan = { _id: "voucher", status: "active", classType: "private", creditsRemaining: 1, validUntil: "2026-09-30" };
  assert.equal(isPlanCompatible(plan, "private", new Date("2026-09-30T23:59:59.999Z")), true);
  assert.equal(isPlanCompatible(plan, "private", new Date("2026-10-01T00:00:00.000Z")), false);
});
