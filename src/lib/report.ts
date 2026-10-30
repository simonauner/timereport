/**
 * What the month view shows: each recorded day's time, how it compares to the
 * target, and the month's totals.
 *
 * A day without times counts as the target, so the totals are a forecast for
 * the whole month until every day is filled in. A day marked as off has no
 * target.
 */

import {
    addDays,
    daysOf,
    monthOf,
    weekNumber,
    weekStart,
    type Month,
} from './dates';
import { holidayOn } from './holidays';
import type { Pass } from './passes';
import { isWorkday, rateOn, type Settings } from './settings';
import { slotsOf } from './slots';
import { spanMinutes, toMinutes } from './time';
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
    /**
     * Minutes in passes with both times. A pass that ends after midnight
     * counts on the day it started.
     */
    worked: number;
    /** Minutes counted in the totals: what's worked, or the target if unknown. */
    counted: number;
    target: number;
    /** Worked minus target, once the day is reported. */
    diff: number;
    /** The sum of the diffs up to and including this day. */
    flex: number;
    overMax: boolean;
    longPass: boolean;
    overlaps: boolean;
    /** A pass has a start but no end yet. */
    running: boolean;
    /** Ids of passes that end the next day. */
    overnight: string[];
    /** The day's passes, or the times the clock ran, with their times. */
    times: { id: string; start: string | null; end: string | null }[];
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
    const overnight: string[] = [];
    const times: DayReport['times'] = [];
    for (const pass of slotsOf(data, settings, passes, date)) {
        const start = textOf(data, timeKey(date, pass.id, 'start'));
        const end = textOf(data, timeKey(date, pass.id, 'end'));
        times.push({ id: pass.id, start, end });
        if (start || end) hasTimes = true;
        if (start && end) {
            worked += spanMinutes(start, end);
            if (end < start) overnight.push(pass.id);
        } else if (start || end) {
            open = true;
        }
    }

    const intervals = times
        .flatMap(({ start, end }) => {
            if (!start || !end || start === end) return [];
            const from = toMinutes(start);
            return [{ from, to: from + spanMinutes(start, end) }];
        })
        .sort((a, b) => a.from - b.from);
    let latestEnd = 0;
    let overlaps = intervals.some((interval) => {
        const overlap = interval.from < latestEnd;
        latestEnd = Math.max(latestEnd, interval.to);
        return overlap;
    });
    // Overnight work can also overlap a pass filed under a neighbouring date.
    for (const offset of [-1, 1]) {
        if (overlaps || !intervals.length) break;
        const neighbour = addDays(date, offset);
        overlaps = slotsOf(data, settings, passes, neighbour).some((slot) => {
            const start = textOf(data, timeKey(neighbour, slot.id, 'start'));
            const end = textOf(data, timeKey(neighbour, slot.id, 'end'));
            if (!start || !end || start === end) return false;
            const from = toMinutes(start) + offset * 24 * 60;
            const to = from + spanMinutes(start, end);
            return intervals.some(
                (interval) => interval.from < to && from < interval.to
            );
        });
    }
    const longPass = intervals.some(
        (interval) => interval.to - interval.from > settings.max
    );

    const off = data[offKey(date)]?.[0] === 1;
    const target = off || !isWorkday(settings, date) ? 0 : settings.target;
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
        longPass,
        overlaps,
        running: open,
        overnight,
        times,
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
    /** Minutes in passes with both times so far, today's included. */
    reported: number;
    /** Flex carried over from earlier months. */
    flexIn: number;
    flex: number;
    /** Kronor excluding VAT, or null without an hourly rate. */
    revenue: Amounts | null;
    /** Minutes counted on days before the first hourly rate. */
    unpriced: number;
    overMax: boolean;
    /** Workdays without complete times, plus today while it can still be edited. */
    daysLeft: number;
    /** Minutes per day left that keep the month within max. */
    maxPerDay: number;
};

export function monthReport(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    month: Month,
    today: string,
    showAllDays = false
): MonthReport {
    const flexIn = settings.carryFlex
        ? flexBefore(data, settings, passes, month, today)
        : 0;
    let flex = flexIn;
    const minutes: Amounts = { counted: 0, target: 0, max: 0 };
    const revenue: Amounts = { counted: 0, target: 0, max: 0 };
    let hasRate = false;
    let unpriced = 0;
    let reported = 0;
    let daysLeft = 0;
    let workedBefore = 0;

    const days = daysOf(month)
        .map((date) => dayReport(data, settings, passes, date, today))
        .filter(
            (day) =>
                showAllDays ||
                isWorkday(settings, day.date) ||
                day.times.some((time) => time.start || time.end)
        )
        .map((day) => {
            const date = day.date;
            flex += day.diff;
            const max = day.target > 0 ? settings.max : 0;
            minutes.counted += day.counted;
            minutes.target += day.target;
            minutes.max += max;
            reported += day.worked;
            if (
                day.target > 0 &&
                (day.status === 'forecast' || day.running || date === today)
            ) {
                daysLeft++;
            } else {
                workedBefore += day.worked;
            }
            const rate = rateOn(settings, date);
            if (rate !== null) {
                hasRate = true;
                revenue.counted += (day.counted / 60) * rate;
                revenue.target += (day.target / 60) * rate;
                revenue.max += (max / 60) * rate;
            } else {
                unpriced += day.counted;
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
        unpriced,
        overMax: minutes.counted > minutes.max,
        daysLeft,
        maxPerDay: daysLeft
            ? Math.max(0, minutes.max - workedBefore) / daysLeft
            : 0,
    };
}

/** Calendar workdays left, including today, when the monthly forecast needs a warning. */
export function monthEndWarningDays(report: MonthReport, today: string) {
    if (
        !report.overMax ||
        !report.days.some((day) => monthOf(day.date) === monthOf(today))
    )
        return 0;
    // Missing reports from earlier dates must not delay the warning.
    const days = report.days.filter(
        (day) => day.date >= today && day.target > 0
    ).length;
    return days <= 3 ? days : 0;
}

/** Completed work in a week, across months, without forecast hours. */
export function weekMinutes(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    date: string,
    today: string
) {
    const monday = weekStart(date);
    let total = 0;
    for (let i = 0; i < 7; i++) {
        const day = addDays(monday, i);
        total += dayReport(data, settings, passes, day, today).worked;
    }
    return total;
}

export const withVat = (amount: number, settings: Settings) =>
    amount * (1 + settings.vat / 100);

/** Past workdays without a complete report need attention, even when blank. */
export const needsReport = (day: DayReport, today: string) =>
    day.date < today &&
    (day.status === 'open' || (day.status === 'forecast' && day.target > 0));

/** Recorded days with a missing start or stop, across the entire history. */
export function unfinishedDays(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    today: string
) {
    const dates = new Set<string>();
    for (const [key, [value]] of Object.entries(data)) {
        if (
            key.startsWith('t:') &&
            value !== null &&
            key.slice(2, 12) < today
        ) {
            dates.add(key.slice(2, 12));
        }
    }
    return [...dates]
        .sort()
        .map((date) => dayReport(data, settings, passes, date, today))
        .filter((day) => day.running);
}
