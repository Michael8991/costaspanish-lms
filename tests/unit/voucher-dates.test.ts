import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getVoucherEffectiveStatus,
  getVoucherTemporalStatus,
  isDateOnlyExpired,
} from "@/lib/utils/date-only";
import { isPlanCompatible } from "@/lib/utils/lesson-voucher";
import { toStudentPlanListDTO } from "@/lib/dto/student.dto";
import {
  resolveCourseVoucherDatePatch,
  resolveManualVoucherDates,
  resolveVoucherDatePatch,
  validateVoucherDateState,
  VoucherDatePolicyError,
} from "@/lib/utils/voucher-date-policy";

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

describe("voucher date-only UTC policy", () => {
  const current = {
    validFrom: new Date("2026-10-12T12:30:00.000Z"),
    validUntil: new Date("2026-10-19T23:45:00.000Z"),
    billingPeriodStart: new Date("2026-10-12T12:30:00.000Z"),
    billingPeriodEnd: new Date("2026-10-19T23:45:00.000Z"),
  };

  it("rejects a manual create without validFrom when validUntil is before today", () => {
    assert.throws(
      () => resolveManualVoucherDates({
        validUntil: "2026-10-11",
        now: new Date("2026-10-12T15:00:00.000Z"),
      }),
      VoucherDatePolicyError,
    );
  });

  it("rejects validUntil before an explicit validFrom", () => {
    assert.throws(
      () => resolveManualVoucherDates({
        validFrom: "2026-10-12",
        validUntil: "2026-10-11",
      }),
      /validUntil cannot be before validFrom/,
    );
  });

  it("normalizes new validity and billing dates to UTC midnight", () => {
    const resolved = resolveManualVoucherDates({
      validFrom: "2026-10-12T19:30:00.000Z",
      validUntil: "2026-10-19T23:59:59.999Z",
      billingPeriodStart: "2026-10-12T08:00:00.000Z",
      billingPeriodEnd: "2026-10-19T18:00:00.000Z",
    });
    assert.equal(resolved.validFrom.toISOString(), "2026-10-12T00:00:00.000Z");
    assert.equal(resolved.validUntil.toISOString(), "2026-10-19T00:00:00.000Z");
    assert.equal(resolved.billingPeriodStart?.toISOString(), "2026-10-12T00:00:00.000Z");
    assert.equal(resolved.billingPeriodEnd?.toISOString(), "2026-10-19T00:00:00.000Z");
  });

  it("keeps all four persisted dates byte-equivalent for a price-only edit", () => {
    const resolved = resolveCourseVoucherDatePatch({ current, patch: {} });
    assert.equal(resolved.changed, false);
    assert.equal(resolved.validityChanged, false);
    assert.equal(resolved.billingPeriodChanged, false);
    assert.deepEqual(resolved.patch, {});
    assert.strictEqual(resolved.state.validFrom, current.validFrom);
    assert.strictEqual(resolved.state.validUntil, current.validUntil);
    assert.strictEqual(resolved.state.billingPeriodStart, current.billingPeriodStart);
    assert.strictEqual(resolved.state.billingPeriodEnd, current.billingPeriodEnd);
  });

  it("keeps all four persisted dates byte-equivalent for a notes-only edit", () => {
    const resolved = resolveCourseVoucherDatePatch({ current, patch: {} });
    assert.deepEqual(resolved.patch, {});
    assert.deepEqual(resolved.state, current);
  });

  it("normalizes and applies an explicit validity PATCH only to supplied fields", () => {
    const resolved = resolveVoucherDatePatch({
      current: { ...current, billingPeriodStart: null, billingPeriodEnd: null },
      patch: { validUntil: "2026-10-21T18:00:00.000Z" },
    });
    assert.equal(resolved.validityChanged, true);
    assert.equal(resolved.billingPeriodChanged, false);
    assert.deepEqual(Object.keys(resolved.patch), ["validUntil"]);
    assert.equal(resolved.patch.validUntil?.toISOString(), "2026-10-21T00:00:00.000Z");
    assert.strictEqual(resolved.state.validFrom, current.validFrom);
  });

  it("rejects an invalid billing period", () => {
    assert.throws(
      () => resolveVoucherDatePatch({
        current,
        patch: {
          billingPeriodStart: "2026-10-18",
          billingPeriodEnd: "2026-10-17",
        },
      }),
      /billingPeriodEnd cannot be before billingPeriodStart/,
    );
  });

  it("allows a financial billing cycle outside the operational validity window", () => {
    const legacyDistinctState = {
      validFrom: new Date("2026-09-30T00:00:00.000Z"),
      validUntil: new Date("2026-10-29T00:00:00.000Z"),
      billingPeriodStart: new Date("2026-09-04T00:00:00.000Z"),
      billingPeriodEnd: new Date("2026-10-03T00:00:00.000Z"),
    };

    assert.doesNotThrow(() => validateVoucherDateState(
      legacyDistinctState,
      { requireCompleteBillingPeriod: true },
    ));
  });

  it("edits only the financial billing cycle and preserves validity byte-equivalent", () => {
    const legacyDistinctState = {
      validFrom: new Date("2026-09-30T00:00:00.000Z"),
      validUntil: new Date("2026-10-29T00:00:00.000Z"),
      billingPeriodStart: new Date("2026-09-04T00:00:00.000Z"),
      billingPeriodEnd: new Date("2026-10-03T00:00:00.000Z"),
    };
    const resolved = resolveCourseVoucherDatePatch({
      current: legacyDistinctState,
      patch: {
        billingPeriodStart: "2026-10-04T18:30:00.000Z",
        billingPeriodEnd: "2026-11-03T23:59:59.999Z",
      },
    });

    assert.equal(resolved.changed, true);
    assert.equal(resolved.validityChanged, false);
    assert.equal(resolved.billingPeriodChanged, true);
    assert.deepEqual(Object.keys(resolved.patch), [
      "billingPeriodStart",
      "billingPeriodEnd",
    ]);
    assert.equal(
      resolved.patch.billingPeriodStart?.toISOString(),
      "2026-10-04T00:00:00.000Z",
    );
    assert.equal(
      resolved.patch.billingPeriodEnd?.toISOString(),
      "2026-11-03T00:00:00.000Z",
    );
    assert.strictEqual(resolved.state.validFrom, legacyDistinctState.validFrom);
    assert.strictEqual(resolved.state.validUntil, legacyDistinctState.validUntil);
    assert.equal(Object.hasOwn(resolved.patch, "validFrom"), false);
    assert.equal(Object.hasOwn(resolved.patch, "validUntil"), false);
  });
});

describe("central voucher temporal status", () => {
  const validity = { validFrom: "2026-10-12", validUntil: "2026-10-19" };

  it("derives a future voucher as upcoming", () => {
    assert.equal(
      getVoucherTemporalStatus(validity, new Date("2026-10-11T23:59:59.999Z")),
      "upcoming",
    );
  });

  it("keeps the inclusive final day active", () => {
    assert.equal(
      getVoucherTemporalStatus(validity, new Date("2026-10-19T23:59:59.999Z")),
      "active",
    );
  });

  it("expires on the following UTC calendar day", () => {
    assert.equal(
      getVoucherTemporalStatus(validity, new Date("2026-10-20T00:00:00.000Z")),
      "expired",
    );
  });

  it("keeps canceled and exhausted states ahead of temporal dates", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    assert.equal(getVoucherEffectiveStatus({ ...validity, status: "canceled" }, now), "canceled");
    assert.equal(getVoucherEffectiveStatus({ ...validity, status: "exhausted" }, now), "exhausted");
    assert.equal(getVoucherEffectiveStatus({ ...validity, status: "active", creditsRemaining: 0 }, now), "exhausted");
  });

  it("does not expose a future persisted-active voucher as lesson-compatible", () => {
    assert.equal(isPlanCompatible({
      _id: "future",
      status: "active",
      classType: "private",
      creditsRemaining: 2,
      ...validity,
    }, "private", new Date("2026-10-11T12:00:00.000Z")), false);
  });
});
