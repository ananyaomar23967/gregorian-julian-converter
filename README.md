# Gregorian Julian Converter

Converts dates between the Julian and Gregorian calendars, using the Julian Day Number as a stable intermediate and the standard Fliegel & Van Flandern formulas. The conversion is purely calendrical (same solar day, two numbering schemes); it does not model national adoption history.

```js
import { julianToGregorian, gregorianToJulian } from 'gregorian-julian-converter';

// The reform: 5 October 1582 (Julian) is the same day as 15 October 1582 (Gregorian).
julianToGregorian(1582, 10, 5);   // { year: 1582, month: 10, day: 15 }
gregorianToJulian(2000, 1, 1);    // { year: 1999, month: 12, day: 19 }
```

## Why this exists

The two calendars count years and days the same way but disagree on which years are leap years. The Julian calendar adds a leap day every fourth year without exception; the Gregorian reform of 1582 dropped three leap days every 400 years to realign with the solar year. That single rule difference causes the two calendars to drift apart by one day per century (roughly), so there is no constant offset — the gap was 10 days in 1582, 11 days from 1700, 12 from 1800, 13 from 1900, and stays at 13 through 2100.

Because the offset changes at the end of February in Gregorian non-leap centuries, any conversion library that hardcodes a fixed gap is wrong for a century at a time. This library converts via the Julian Day Number, so it handles the full divergence without special cases.

## Interpretation chosen

The conversion is calendrical, not historical. `gregorianToJulian(1582, 10, 10)` returns a valid Julian date even though that day never existed on the Gregorian calendar in the regions that adopted the reform in 1582 — it is the date you would have written down if you were using the Julian calendar and someone else was using the Gregorian one on the same solar day. Likewise, proleptic dates before either calendar existed are computed by extending the rule backward. If you need per-country adoption logic, this is the wrong library.

## Awkward edge

The leap-day divergence lands on 29 February. For example, the Julian leap day of 29 February 1900 (which exists, because 1900 is a Julian leap year) maps to 13 March 1900 Gregorian (1900 is not a Gregorian leap year, so March 1 is reached before the +13-day shift is applied). This is correct but surprising if you expect the offset to be a constant 13 across the whole of 1900 — it is 13 for January and February, then 13 again from March onward, but the Julian leap day itself pushes into March on the other side.
