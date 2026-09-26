import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isJulianLeap,
  isGregorianLeap,
  julianToJdn,
  gregorianToJdn,
  jdnToJulian,
  jdnToGregorian,
  julianToGregorian,
  gregorianToJulian,
} from '../src/index.js';

// Leap-year rules ---------------------------------------------------------

test('isJulianLeap: every fourth year is leap, including centuries', () => {
  assert.equal(isJulianLeap(4), true);
  assert.equal(isJulianLeap(100), true);
  assert.equal(isJulianLeap(1900), true);
  assert.equal(isJulianLeap(3), false);
  assert.equal(isJulianLeap(2100), true);
});

test('isGregorianLeap: 4-year rule minus century exceptions plus 400', () => {
  assert.equal(isGregorianLeap(2000), true);  // divisible by 400
  assert.equal(isGregorianLeap(1996), true); // divisible by 4, not century
  assert.equal(isGregorianLeap(1900), false); // century, not 400
  assert.equal(isGregorianLeap(2100), false);
  assert.equal(isGregorianLeap(2001), false);
});

// JDN reference points --------------------------------------------------
// Known anchor: 1 January 2000 (Gregorian) = JDN 2451545.
test('gregorianToJdn: 2000-01-01 = 2451545', () => {
  assert.equal(gregorianToJdn(2000, 1, 1), 2451545);
});

// Known anchor: 1 January 2000 (Julian) = JDN 2451558 (13 days later
// because the Julian calendar is 13 days behind Gregorian by 2000).
test('julianToJdn: 2000-01-01 (Julian) = 2451558', () => {
  assert.equal(julianToJdn(2000, 1, 1), 2451558);
});

// Inverse round-trips ---------------------------------------------------

test('jdnToGregorian is the exact inverse of gregorianToJdn', () => {
  const cases = [
    [2000, 1, 1],
    [1582, 10, 15], // first Gregorian day
    [1582, 10, 4],  // last Julian day before reform, as a Gregorian date
    [1900, 2, 28],  // Gregorian non-leap century
    [2024, 2, 29],  // Gregorian leap day
    [1, 1, 1],      // deep proleptic past
    [-1, 12, 31],   // BC year
  ];
  for (const [y, m, d] of cases) {
    const jdn = gregorianToJdn(y, m, d);
    const back = jdnToGregorian(jdn);
    assert.deepEqual(back, { year: y, month: m, day: d });
  }
});

test('jdnToJulian is the exact inverse of julianToJdn', () => {
  const cases = [
    [2000, 1, 1],
    [1582, 10, 5], // Julian date that is "skipped" in Gregorian is still valid
    [1900, 2, 15],
    [2024, 2, 16], // Julian leap day 29 Feb 2024 maps to 16 Mar Gregorian
    [1, 1, 1],
    [-1, 12, 31],
  ];
  for (const [y, m, d] of cases) {
    const jdn = julianToJdn(y, m, d);
    const back = jdnToJulian(jdn);
    assert.deepEqual(back, { year: y, month: m, day: d });
  }
});

// Cross-calendar conversions -------------------------------------------

// The reform: 15 October 1582 (Gregorian) = 5 October 1582 (Julian).
// This is the defining 10-day gap.
test('julianToGregorian: 1582-10-05 (Julian) → 1582-10-15 (Gregorian)', () => {
  assert.deepEqual(julianToGregorian(1582, 10, 5), { year: 1582, month: 10, day: 15 });
});

test('gregorianToJulian: 1582-10-15 (Gregorian) → 1582-10-05 (Julian)', () => {
  assert.deepEqual(gregorianToJulian(1582, 10, 15), { year: 1582, month: 10, day: 5 });
});

// By the year 2000 the Julian calendar is 13 days behind Gregorian.
// 1 January 2000 Gregorian = 19 December 1999 Julian.
test('julianToGregorian: 1999-12-19 (Julian) → 2000-01-01 (Gregorian)', () => {
  assert.deepEqual(julianToGregorian(1999, 12, 19), { year: 2000, month: 1, day: 1 });
});

test('gregorianToJulian: 2000-01-01 (Gregorian) → 1999-12-19 (Julian)', () => {
  assert.deepEqual(gregorianToJulian(2000, 1, 1), { year: 1999, month: 12, day: 19 });
});

// The 10-day gap of 1582 grows to 11 days after 28 February 1700 (Julian),
// because 1700 is a Julian leap year but a Gregorian common year.
test('after 1700-02-19 (Julian) the gap widens to 11 days', () => {
  // 1700-03-01 Julian should map to 1700-03-12 Gregorian.
  assert.deepEqual(julianToGregorian(1700, 3, 1), { year: 1700, month: 3, day: 12 });
});

test('the day before the widening: 1700-02-19 (Julian) is still +10', () => {
  assert.deepEqual(julianToGregorian(1700, 2, 19), { year: 1700, month: 3, day: 1 });
});

// Round-trip identity for a set of Gregorian dates ---------------------
test('gregorianToJulian then julianToGregorian is identity', () => {
  const cases = [
    [1582, 10, 15],
    [1700, 3, 12],
    [1800, 1, 1],
    [1900, 2, 28],
    [2000, 2, 29],
    [2023, 11, 22],
  ];
  for (const [y, m, d] of cases) {
    const mid = gregorianToJulian(y, m, d);
    const back = julianToGregorian(mid.year, mid.month, mid.day);
    assert.deepEqual(back, { year: y, month: m, day: d });
  }
});
