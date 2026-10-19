/**
 * Days as "YYYY-MM-DD" in local time, which is how they're stored and
 * compared: as text, they sort in date order.
 */

const pad = (number: number) => String(number).padStart(2, '0');

export const isoDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromIso = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const today = () => isoDate(new Date());

export const addDays = (iso: string, days: number) => {
    const date = fromIso(iso);
    date.setDate(date.getDate() + days);
    return isoDate(date);
};

/** 0 for Monday through 6 for Sunday. */
export const weekday = (iso: string) => (fromIso(iso).getDay() + 6) % 7;

export const isWeekend = (iso: string) => weekday(iso) >= 5;

/** The ISO week number, which is what Swedish calendars show. */
export function weekNumber(iso: string) {
    const date = fromIso(iso);
    // The Thursday of the same week decides which year the week belongs to.
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    return (
        1 +
        Math.round(
            ((date.getTime() - firstThursday.getTime()) / 86_400_000 -
                3 +
                ((firstThursday.getDay() + 6) % 7)) /
                7
        )
    );
}

/** The Monday of the week a day is in. */
export const weekStart = (iso: string) => addDays(iso, -weekday(iso));

/** A month as "YYYY-MM". */
export type Month = string;

export const monthOf = (iso: string): Month => iso.slice(0, 7);

export const addMonths = (month: Month, months: number): Month => {
    const [year, number] = month.split('-').map(Number);
    return isoDate(new Date(year, number - 1 + months, 1)).slice(0, 7);
};

/** Every day of a month. */
export function daysOf(month: Month) {
    const days: string[] = [];
    for (
        let day = `${month}-01`;
        monthOf(day) === month;
        day = addDays(day, 1)
    ) {
        days.push(day);
    }
    return days;
}

const weekdayNames = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];

export const weekdayName = (iso: string) => weekdayNames[weekday(iso)];

export const monthName = (month: Month) =>
    new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(
        fromIso(`${month}-01`)
    );
