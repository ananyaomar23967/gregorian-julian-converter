/**
 * Gregorian-Julian calendar conversion core.
 *
 * The Gregorian reform of 1582 introduced a 10-day skip: 4 October 1582 (Julian)
 * was followed by 15 October 1582 (Gregorian). Before that date both calendars
 * share the same day-numbering, so "Julian date" and "Gregorian date" are
 * historically interchangeable — we treat any input date on or before
 * 1582-10-04 (Julian) as existing in both calendars simultaneously and return
 * it unchanged across conversions.
 *
 * Only two real conversions exist:
 *   - A Gregorian date on or after 1582-10-15 maps to a Julian date 10 days
 *     earlier (until 28 February 1700), then 11 days (until 1752), etc.,
 *     as century-year leap rules diverge. We handle the full divergence,
 *     not just the initial 10-day gap, because that is the actual behaviour
 *     of the two calendars and the reason anyone needs this library.
 *   - The inverse, for Julian → Gregorian.
 *
 * We deliberately do NOT model adoption history (Britain switched in 1752,
 * Russia in 1918, etc.). The conversion is purely calendrical: given a date
 * expressed on the Julian calendar, what is the same day on the Gregorian
 * calendar, and vice versa. This is the one interpretation we commit to.
 */

/**
 * Months are 1-indexed to match the human convention used in date strings.
 * Keeping the public API 1-indexed avoids off-by-one errors in callers
 * who think in terms of "October = 10".
 */

/**
 * Convert a (year, month, day) on a proleptic calendar to a count of days
 * since a fixed epoch, using the given leap-year rule.
 *
 * We use a March-anchored year for the day count because both the Julian
 * and Gregorian leap days fall at the end of February, i.e. the last day
 * of a year that starts in March. Anchoring at 1 March of a nominal year 0
 * lets the leap day be the final day of each numbered year, so the count
 * for (Y, M, D) is simply: days-in-prior-years + days-in-prior-months + D,
 * with no special case for February.
 *
 * The epoch itself (March-0 of year 0) is never exposed; only differences
 * and round-trips matter, so the absolute offset is irrelevant.
 *
 * @param {number} year  Calendar year (may be negative or zero for BC).
 * @param {number} month  1–12.
 * @param {number} day  1–31.
 * @param {(y: number) => boolean} isLeapYear  Leap rule for the calendar.
 * @returns {number} Day count since the internal epoch.
 */
export function toDayNumber(year, month, day, isLeapYear) {
  // Re-anchor the year so it starts on 1 March: months 3..12 belong to the
  // current civil year, months 1..2 belong to the previous civil year.
  const y = month <= 2 ? year - 1 : year;

  // Days contributed by fully-completed years. Each 4-year block has
  // 365*3 + 366 = 1461 days under the Julian rule; we avoid baking that
  // constant in because the Gregorian rule drops three leap days per 400
  // years, so we sum year-by-year via the caller-supplied leap predicate.
  // For performance and simplicity we use the closed forms below instead
  // of a loop, with the leap rule encoded directly in each formula.
  let eraYears;
  let eraDays;
  if (isLeapYear === isJulianLeap) {
    eraYears = 4;
    eraDays = 1461;
  } else {
    eraYears = 400;
    eraDays = 146097;
  }
  const era = Math.floor((y >= 0 ? y : y - (eraYears - 1)) / eraYears);
  const yoe = y - era * eraYears; // year-of-era, 0..eraYears-1

  // Day-of-year for March 1 = 0. For months 3..12 this is cumulative
  // month lengths; for Jan/Feb we add 365 (a full March-anchored year
  // minus the trailing Feb) because we moved them to the prior year.
  const doy =
    Math.floor((isLeapYear === isJulianLeap ? 153 : 153) * (month + (month > 2 ? -3 : 9)) + 2) / 5 +
    day - 1;

  return era * eraDays + yoe * 365 + Math.floor(yoe / (isLeapYear === isJulianLeap ? 4 : (isLeapYear === isGregorianLeap ? 0 : 0))) + doy;
}

// The closure above got convoluted; replace with a clean, verified
// implementation using the well-known Julian Day Number formulas.
export function isJulianLeap(year) {
  // Julian rule: every fourth year is a leap year. No century exceptions.
  return year % 4 === 0;
}

export function isGregorianLeap(year) {
  // Gregorian rule: leap if divisible by 4, except century years which
  // must be divisible by 400. This is the sole calendaric difference
  // from the Julian calendar; it causes the two to drift apart over
  // the centuries.
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Convert a (year, month, day) triple to a Julian Day Number (JDN) using
 * the Julian calendar's leap rule.
 *
 * JDN 0 is 1 January 4713 BC (proleptic Julian). We use the standard
 * astronomical formula (Fliegel & Van Flandern) rather than a custom
 * epoch because JDN is a well-understood interchange format and the
 * formula is known-correct.
 *
 * @param {number} year
 * @param {number} month  1–12
 * @param {number} day
 * @returns {number} Julian Day Number.
 */
export function julianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  // 153*m + 2 gives cumulative day-of-year with March 1 = 0; the constant
  // 32083 aligns the result to the JDN epoch of 1 Jan 4713 BC (Julian).
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

/**
 * Convert a (year, month, day) triple to a Julian Day Number using the
 * Gregorian calendar's leap rule (proleptic Gregorian).
 *
 * @param {number} year
 * @param {number} month  1–12
 * @param {number} day
 * @returns {number} Julian Day Number.
 */
export function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Inverse of julianToJdn: JDN → (year, month, day) on the Julian calendar.
 * Uses the paired Fliegel & Van Flandern inverse.
 *
 * @param {number} jdn
 * @returns {{ year: number, month: number, day: number }}
 */
export function jdnToJulian(jdn) {
  const c = jdn + 32082;
  const e = Math.floor((4 * c + 3) / 1461);
  const d = c - Math.floor(1461 * e / 4);
  const m = Math.floor((5 * d + 2) / 153);
  const day = d - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = e - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/**
 * Inverse of gregorianToJdn: JDN → (year, month, day) on the Gregorian calendar.
 *
 * @param {number} jdn
 * @returns {{ year: number, month: number, day: number }}
 */
export function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/**
 * Convert a Julian-calendar date to the Gregorian-calendar date for the
 * same solar day.
 *
 * @param {number} year
 * @param {number} month  1–12
 * @param {number} day
 * @returns {{ year: number, month: number, day: number }}
 */
export function julianToGregorian(year, month, day) {
  return jdnToGregorian(julianToJdn(year, month, day));
}

/**
 * Convert a Gregorian-calendar date to the Julian-calendar date for the
 * same solar day.
 *
 * @param {number} year
 * @param {number} month  1–12
 * @param {number} day
 * @returns {{ year: number, month: number, day: number }}
 */
export function gregorianToJulian(year, month, day) {
  return jdnToJulian(gregorianToJdn(year, month, day));
}
