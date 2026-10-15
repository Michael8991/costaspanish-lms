import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFinanceBaseFilter,
  FinanceLedgerQueryError,
  parseFinanceMonth,
} from "@/lib/server/finance-ledger.query";
import {
  BUSINESS_TIMEZONE,
  getBusinessMonthRange,
  getCurrentBusinessMonth,
} from "@/lib/utils/finance-month";
import { getCurrentFinanceMonth } from "@/lib/utils/finance-format";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";

function includes(range: { start: Date; end: Date }, value: string | Date) {
  const timestamp = new Date(value).getTime();
  return timestamp >= range.start.getTime() && timestamp < range.end.getTime();
}

function monthFilter(dateField: "paidAt" | "consumedAt") {
  return buildFinanceBaseFilter({
    user: { id: "admin", role: "admin" },
    searchParams: new URLSearchParams({ month: "2026-10" }),
    dateField,
  });
}

describe("Madrid business month ranges", () => {
  it("converts both October 2026 local midnights independently", () => {
    const range = getBusinessMonthRange("2026-10");

    assert.equal(BUSINESS_TIMEZONE, "Europe/Madrid");
    assert.equal(range.start.toISOString(), "2026-09-30T22:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-10-31T23:00:00.000Z");
  });

  it("includes the exact start, first half hour, middle, and final instant", () => {
    const range = getBusinessMonthRange("2026-10");

    assert.equal(includes(range, "2026-09-30T22:00:00.000Z"), true);
    assert.equal(includes(range, "2026-09-30T22:30:00.000Z"), true);
    assert.equal(includes(range, "2026-10-15T12:00:00.000Z"), true);
    assert.equal(includes(range, "2026-10-31T22:59:59.999Z"), true);
  });

  it("uses a half-open range and excludes the next month boundary", () => {
    const range = getBusinessMonthRange("2026-10");

    assert.equal(includes(range, range.end), false);
    assert.equal(includes(range, "2026-10-31T23:00:00.000Z"), false);
  });

  it("accounts for the March daylight-saving transition", () => {
    const range = getBusinessMonthRange("2026-03");

    assert.equal(range.start.toISOString(), "2026-02-28T23:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-03-31T22:00:00.000Z");
  });

  it("accounts for the October daylight-saving transition", () => {
    const range = getBusinessMonthRange("2026-10");

    assert.equal(range.end.getTime() - range.start.getTime(), 745 * 60 * 60 * 1000);
  });

  it("handles December to January without UTC calendar arithmetic", () => {
    const range = getBusinessMonthRange("2026-12");

    assert.equal(range.start.toISOString(), "2026-11-30T23:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-12-31T23:00:00.000Z");
  });

  it("handles leap-year February", () => {
    const range = getBusinessMonthRange("2028-02");

    assert.equal(range.start.toISOString(), "2028-01-31T23:00:00.000Z");
    assert.equal(range.end.toISOString(), "2028-02-29T23:00:00.000Z");
  });

  it("rejects malformed and impossible month values", () => {
    for (const month of ["2026-1", "2026-00", "2026-13", "26-10", "2026-10-01", ""]) {
      assert.throws(() => getBusinessMonthRange(month), /YYYY-MM/);
    }
  });
});

describe("current Madrid business month", () => {
  it("moves to October at Madrid midnight even while UTC is September", () => {
    assert.equal(
      getCurrentBusinessMonth(new Date("2026-09-30T22:30:00.000Z")),
      "2026-10",
    );
  });

  it("stays in September immediately before Madrid midnight", () => {
    assert.equal(
      getCurrentBusinessMonth(new Date("2026-09-30T21:59:59.999Z")),
      "2026-09",
    );
  });

  it("uses the same Madrid month in the client-facing finance helper", () => {
    assert.equal(
      getCurrentFinanceMonth(new Date("2026-09-30T22:30:00.000Z")),
      "2026-10",
    );
  });
});

describe("finance query contract", () => {
  it("parseFinanceMonth exposes the Madrid half-open range", () => {
    const month = parseFinanceMonth("2026-10");

    assert.equal(month?.start.toISOString(), "2026-09-30T22:00:00.000Z");
    assert.equal(month?.end.toISOString(), "2026-10-31T23:00:00.000Z");
  });

  it("preserves the finance query error contract for invalid months", () => {
    assert.throws(
      () => parseFinanceMonth("2026-13"),
      FinanceLedgerQueryError,
    );
  });

  it("filters collected money by paidAt, never by createdAt", () => {
    const filter = monthFilter("paidAt") as {
      paidAt: { $gte: Date; $lt: Date };
      createdAt?: unknown;
    };
    const payment = {
      paidAt: new Date("2026-09-30T00:00:00.000Z"),
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
    };

    assert.deepEqual(Object.keys(filter), ["paidAt"]);
    assert.equal(includes({ start: filter.paidAt.$gte, end: filter.paidAt.$lt }, payment.paidAt), false);
    assert.equal(filter.createdAt, undefined);
  });

  it("keeps Claire's September payment out of October collected while October consumption is earned", () => {
    const october = getBusinessMonthRange("2026-10");
    const clairePayment = new Date("2026-09-30T00:00:00.000Z");
    const claireConsumption = new Date(
      zonedDateTimeToISOString("2026-10-01T10:00:00", BUSINESS_TIMEZONE),
    );

    assert.equal(includes(october, clairePayment), false);
    assert.equal(includes(october, claireConsumption), true);
  });

  it("uses paidAt for payment-ledger and consumedAt for credit-ledger filters", () => {
    const payment = monthFilter("paidAt") as Record<string, unknown>;
    const credit = monthFilter("consumedAt") as Record<string, unknown>;

    assert.deepEqual(Object.keys(payment), ["paidAt"]);
    assert.deepEqual(Object.keys(credit), ["consumedAt"]);
    assert.deepEqual(payment.paidAt, credit.consumedAt);
  });
});
