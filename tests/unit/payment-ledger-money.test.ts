import assert from "node:assert/strict";
import test from "node:test";

import { fromCents } from "../../lib/utils/money";
import {
  paymentLedgerAmountCents,
  paymentLedgerAmountCentsExpression,
} from "../../lib/utils/payment-ledger-money";

test("Mongo sum selects cents, falling back to rounded legacy euros", () => {
  assert.deepEqual(paymentLedgerAmountCentsExpression, {
    $ifNull: [
      "$amountCents",
      { $round: [{ $multiply: ["$amount", 100] }, 0] },
    ],
  });
});

test("sums 10 and 20 cents as 30 cents", () => {
  const rows = [{ amountCents: 10 }, { amountCents: 20 }];
  assert.equal(rows.reduce((sum, row) => sum + paymentLedgerAmountCents(row), 0), 30);
});

test("uses canonical cents once and converts the aggregate to euros at the API boundary", () => {
  const rows = [
    { amount: 80, amountCents: 8000 },
    { amount: 40 },
  ];
  const totalCents = rows.reduce((sum, row) => sum + paymentLedgerAmountCents(row), 0);
  assert.equal(totalCents, 12000);
  assert.equal(fromCents(totalCents), 120);
});

test("does not use floating-point euro addition for 0.1 plus 0.2", () => {
  const totalCents = [{ amount: 0.1 }, { amount: 0.2 }]
    .reduce((sum, row) => sum + paymentLedgerAmountCents(row), 0);
  assert.equal(totalCents, 30);
  assert.equal(fromCents(totalCents), 0.3);
});

test("invalid or missing amounts cannot masquerade as zero euros", () => {
  for (const row of [
    {},
    { amount: 0 },
    { amount: Number.NaN },
    { amount: Number.POSITIVE_INFINITY },
    { amountCents: 0, amount: 80 },
    { amountCents: 10.5, amount: 80 },
    { amountCents: Number.NaN, amount: 80 },
    { amountCents: Number.POSITIVE_INFINITY, amount: 80 },
    { amountCents: Number.MAX_SAFE_INTEGER + 1, amount: 80 },
  ]) {
    assert.throws(() => paymentLedgerAmountCents(row));
  }
  assert.equal(paymentLedgerAmountCents({ amountCents: null, amount: 40 }), 4000);
});
