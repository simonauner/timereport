/**
 * The day's times in the order they're punched, and where the day is: which
 * time comes next, and whether a pass is running.
 */

import { addDays } from './dates';
import { fieldName, type Pass } from './passes';
import { dayReport } from './report';
import type { Settings } from './settings';
import { timeNow, toMinutes } from './time';
import { textOf, timeKey, type UserData } from './userData';

export type PunchField = {
    key: string;
    label: string;
    edge: 'start' | 'end';
    time: string | null;
    /** Whether it's an end after midnight, the day after its start. */
    nextDay: boolean;
};

/** A pass that has started but not ended. */
const runningPass = (
    data: UserData,
    passes: Pass[],
    date: string
): Pass | undefined =>
    passes.find(
        (pass) =>
            textOf(data, timeKey(date, pass.id, 'start')) &&
            !textOf(data, timeKey(date, pass.id, 'end'))
    );

export function punchOf(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    today: string,
    now: Date
) {
    // A pass still running from yesterday ends after midnight, so the punch
    // clock stays on yesterday until it's stopped.
    const yesterday = addDays(today, -1);
    const date = runningPass(data, passes, yesterday) ? yesterday : today;

    const fields: PunchField[] = passes.flatMap((pass) => {
        const start = textOf(data, timeKey(date, pass.id, 'start'));
        return (['start', 'end'] as const).map((edge) => {
            const key = timeKey(date, pass.id, edge);
            const label = fieldName(pass, edge);
            const time = textOf(data, key);
            const nextDay = edge === 'end' && !!start && !!time && time < start;
            return { key, label, edge, time, nextDay };
        });
    });
    // A pass that has started but not ended is stopped before the next one
    // starts, and counts until now.
    const running = runningPass(data, passes, date);
    const next = running
        ? fields.find((field) => field.key === timeKey(date, running.id, 'end'))
        : fields.find((field) => !field.time);
    const last = fields.findLast((field) => field.time);

    const runningStart = running
        ? textOf(data, timeKey(date, running.id, 'start'))
        : null;
    const nowMinutes = toMinutes(timeNow(now));
    const sinceStart = !runningStart
        ? 0
        : date === today
          ? Math.max(0, nowMinutes - toMinutes(runningStart))
          : nowMinutes + 24 * 60 - toMinutes(runningStart);
    // Running since yesterday for longer than a day's max is more likely a
    // stop that was forgotten than a night's work, so it doesn't count yet.
    const forgotten = date !== today && sinceStart > settings.max;
    const worked =
        dayReport(data, settings, passes, date, today).worked +
        (forgotten ? 0 : sinceStart);

    return { date, fields, next, last, runningStart, worked, forgotten };
}
