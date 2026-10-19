/**
 * What the month view shows: each workday's time, how it compares to the
 * target, and the month's totals.
 *
 * A day without times counts as the target, so the totals are a forecast for
 * the whole month until every day is filled in. A day marked as off has no
 * target.
 */

import {
    addDays,
    daysOf,
    isWeekend,
    monthOf,
    weekNumber,
    weekStart,
    type Month,
} from './dates';
import { holidayOn } from './holidays';
import type { Pass } from './passes';
import { rateOn, type Settings } from './settings';
import { toMinutes } from './time';
import { offKey, textOf, timeKey, type UserData } from './userData';

/**
 * - `reported`: every pass with a time has both its times.
 * - `open`: a pass has a start but no end yet, or it's today and the day
 *   hasn't reached its target, like at lunch.
 * - `forecast`: no times yet.
 * - `off`: marked as off.
 */
export type DayStatus = 'reported' | 'open' | 'forecast' | 'off';

export type DayReport = {
    date: string;
    week: number;
    holiday: string | null;
    status: DayStatus;
    /** Minutes in passes with both times. */
    worked: number;
    /** Minutes counted in the totals: what's worked, or the target if unknown. */
    counted: number;
    target: number;
    /** Worked minus target, once the day is reported. */
    diff: number;
    /** The sum of the diffs up to and including this day. */
    flex: number;
    overMax: boolean;
    /** Ids of passes whose end is before their start. */
    invalid: string[];
};

export function dayReport(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    date: string,
    today: string
): Omit<DayReport, 'flex'> {
    let worked = 0;
    let open = false;
    let hasTimes = false;
    const invalid: string[] = [];
    for (const pass of passes) {
        const start = textOf(data, timeKey(date, pass.id, 'start'));
        const end = textOf(data, timeKey(date, pass.id, 'end'));
        if (start || end) hasTimes = true;
        if (start && end) {
            const minutes = toMinutes(end) - toMinutes(start);
            if (minutes > 0) worked += minutes;
            else invalid.push(pass.id);
        } else if (start || end) {
            open = true;
        }
    }

    const off = data[offKey(date)]?.[0] === 1;
    const target = off || isWeekend(date) ? 0 : settings.target;
    // Today isn't over until it reaches its target, so a morning that's done
    // doesn't count as a short day.
    const status: DayStatus = off
        ? 'off'
        : !hasTimes
          ? 'forecast'
          : open || (date === today && worked < target)
            ? 'open'
            : 'reported';
    const counted =
        status === 'forecast'
            ? target
            : status === 'open'
              ? Math.max(worked, target)
              : worked;

    return {
        date,
        week: weekNumber(date),
        holiday: holidayOn(date),
        status,
        worked,
        counted,
        target,
        diff: status === 'reported' || status === 'off' ? worked - target : 0,
        overMax: worked > settings.max,
        invalid,
    };
}

/** Flex from every day before a month, for when it carries over. */
function flexBefore(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    month: Month,
    today: string
) {
    const dates = new Set<string>();
    for (const key of Object.keys(data)) {
        if (key.startsWith('t:') || key.startsWith('x:')) {
            const date = key.slice(2, 12);
            if (monthOf(date) < month) dates.add(date);
        }
    }
    let flex = 0;
    for (const date of dates) {
        flex += dayReport(data, settings, passes, date, today).diff;
    }
    return flex;
}

export type Amounts = { counted: number; target: number; max: number };

export type MonthReport = {
    days: DayReport[];
    /** Minutes, as forecast, targeted and at most invoiced. */
    minutes: Amounts;
    /** Minutes in reported days so far. */
    reported: number;
    /** Flex carried over from earlier months. */
    flexIn: number;
    flex: number;
    /** Kronor excluding VAT, or null without an hourly rate. */
    revenue: Amounts | null;
    overMax: boolean;
};

export function monthReport(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    month: Month,
    today: string
): MonthReport {
    const flexIn = settings.carryFlex
        ? flexBefore(data, settings, passes, month, today)
        : 0;
    let flex = flexIn;
    const minutes: Amounts = { counted: 0, target: 0, max: 0 };
    const revenue: Amounts = { counted: 0, target: 0, max: 0 };
    let hasRate = false;
    let reported = 0;

    const days = daysOf(month)
        .filter((date) => !isWeekend(date))
        .map((date) => {
            const day = dayReport(data, settings, passes, date, today);
            flex += day.diff;
            const max = day.target > 0 ? settings.max : 0;
            minutes.counted += day.counted;
            minutes.target += day.target;
            minutes.max += max;
            if (day.status === 'reported' || day.status === 'off') {
                reported += day.worked;
            }
            const rate = rateOn(settings, date);
            if (rate !== null) {
                hasRate = true;
                revenue.counted += (day.counted / 60) * rate;
                revenue.target += (day.target / 60) * rate;
                revenue.max += (max / 60) * rate;
            }
            return { ...day, flex };
        });

    return {
        days,
        minutes,
        reported,
        flexIn,
        flex,
        revenue: hasRate ? revenue : null,
        overMax: minutes.counted > minutes.max,
    };
}

/** Minutes counted in a week, Monday to Friday, across months. */
export function weekMinutes(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    date: string,
    today: string
) {
    const monday = weekStart(date);
    let total = 0;
    for (let i = 0; i < 5; i++) {
        const day = addDays(monday, i);
        total += dayReport(data, settings, passes, day, today).counted;
    }
    return total;
}

export const withVat = (amount: number, settings: Settings) =>
    amount * (1 + settings.vat / 100);
