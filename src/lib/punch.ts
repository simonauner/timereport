/**
 * Today's times in the order they're punched, and where the day is: which
 * time comes next, and whether a pass is running.
 */

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
};

export function punchOf(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    today: string,
    now: Date
) {
    const fields: PunchField[] = passes.flatMap((pass) =>
        (['start', 'end'] as const).map((edge) => {
            const key = timeKey(today, pass.id, edge);
            const label = fieldName(pass, edge);
            return { key, label, edge, time: textOf(data, key) };
        })
    );
    const next = fields.find((field) => !field.time);
    const last = fields.findLast((field) => field.time);

    // A pass that has started but not ended counts until now.
    const running = passes.find(
        (pass) =>
            textOf(data, timeKey(today, pass.id, 'start')) &&
            !textOf(data, timeKey(today, pass.id, 'end'))
    );
    const runningStart = running
        ? textOf(data, timeKey(today, running.id, 'start'))
        : null;
    const sinceStart = runningStart
        ? Math.max(0, toMinutes(timeNow(now)) - toMinutes(runningStart))
        : 0;
    const worked =
        dayReport(data, settings, passes, today, today).worked + sinceStart;

    return { fields, next, last, runningStart, worked };
}
