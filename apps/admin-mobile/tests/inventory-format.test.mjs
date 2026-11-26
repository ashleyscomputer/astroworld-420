import test from "node:test";
import assert from "node:assert/strict";
import {
  formatHalfUnitsAsGrams,
  parseGramsToHalfUnits,
} from "../src/lib/inventory-format.ts";

test("parses whole grams into integer half-units", () => {
  assert.equal(parseGramsToHalfUnits("0"), 0);
  assert.equal(parseGramsToHalfUnits("1"), 2);
  assert.equal(parseGramsToHalfUnits("2"), 4);
});

test("parses exact half-gram quantities without floating point", () => {
  assert.equal(parseGramsToHalfUnits("0.5"), 1);
  assert.equal(parseGramsToHalfUnits("2.5"), 5);
  assert.equal(parseGramsToHalfUnits("2,5"), 5);
});

test("rejects invalid precision, negatives, empty values and unsafe quantities", () => {
  for (const value of ["", " ", "-1", "1.25", "1.50", "abc", "5000000.5"]) {
    assert.throws(() => parseGramsToHalfUnits(value), Error, value);
  }
});

test("formats half-units as exact decimal gram strings", () => {
  assert.equal(formatHalfUnitsAsGrams(0), "0");
  assert.equal(formatHalfUnitsAsGrams(1), "0.5");
  assert.equal(formatHalfUnitsAsGrams(2), "1");
  assert.equal(formatHalfUnitsAsGrams(5), "2.5");
});

test("rejects invalid stored half-unit values", () => {
  assert.throws(() => formatHalfUnitsAsGrams(-1), Error);
  assert.throws(() => formatHalfUnitsAsGrams(1.5), Error);
  assert.throws(() => formatHalfUnitsAsGrams(Number.MAX_SAFE_INTEGER + 1), Error);
});
