/**
 * Swedish public holidays, and the eves most workplaces treat as one. They're
 * only pointed out: the user marks a day as off themselves.
 */

import { addDays, isoDate } from './dates';

/** Easter Sunday, by the anonymous Gregorian algorithm. */
function easter(year: number) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return isoDate(new Date(year, month - 1, day));
}

/** The Friday from 19 to 25 June. */
function midsummerEve(year: number) {
    const date = new Date(year, 5, 19);
    date.setDate(19 + ((5 - date.getDay() + 7) % 7));
    return isoDate(date);
}

const cache = new Map<number, Map<string, string>>();

function holidaysOf(year: number) {
    let holidays = cache.get(year);
    if (!holidays) {
        const easterSunday = easter(year);
        holidays = new Map([
            [`${year}-01-01`, 'Nyårsdagen'],
            [`${year}-01-06`, 'Trettondedag jul'],
            [addDays(easterSunday, -2), 'Långfredagen'],
            [addDays(easterSunday, 1), 'Annandag påsk'],
            [`${year}-05-01`, 'Första maj'],
            [addDays(easterSunday, 39), 'Kristi himmelsfärdsdag'],
            [`${year}-06-06`, 'Nationaldagen'],
            [midsummerEve(year), 'Midsommarafton'],
            [`${year}-12-24`, 'Julafton'],
            [`${year}-12-25`, 'Juldagen'],
            [`${year}-12-26`, 'Annandag jul'],
            [`${year}-12-31`, 'Nyårsafton'],
        ]);
        cache.set(year, holidays);
    }
    return holidays;
}

/** The holiday a day is, if any. */
export const holidayOn = (iso: string) =>
    holidaysOf(Number(iso.slice(0, 4))).get(iso) ?? null;
