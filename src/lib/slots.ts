/**
 * The parts of a day its times are in: the passes, or in a month with the
 * start and stop clock, each time the clock was started, in order.
 */

import { addMonths, monthOf, type Month } from './dates';
import type { Pass } from './passes';
import { modeIn, type Mode, type Settings } from './settings';
import { modeKey, textOf, timeKey, type UserData } from './userData';

/** A pass, or a time the clock ran, which has no name. */
export type Slot = { id: string; name: string | null };

/** The ids with times on each day, worked out once per version of the data. */
const idsByDate = new WeakMap<UserData, Map<string, Set<string>>>();

function idsOn(data: UserData, date: string) {
    let index = idsByDate.get(data);
    if (!index) {
        index = new Map();
        for (const [key, [value]] of Object.entries(data)) {
            if (!key.startsWith('t:') || value === null) continue;
            const [day, id] = key.slice(2).split('/');
            if (!index.has(day)) index.set(day, new Set());
            index.get(day)!.add(id);
        }
        idsByDate.set(data, index);
    }
    return index.get(date) ?? new Set<string>();
}

export function slotsOf(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    date: string
): Slot[] {
    if (modeIn(settings, monthOf(date)) === 'passes') return passes;
    // In order of start, and a time the clock stopped before one starting
    // the same minute that's still running.
    const sortKey = (id: string) => {
        const start = textOf(data, timeKey(date, id, 'start'));
        const end = textOf(data, timeKey(date, id, 'end'));
        return `${start ?? end} ${end ?? '~'} ${id}`;
    };
    return [...idsOn(data, date)]
        .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))
        .map((id) => ({ id, name: null }));
}

/** An id for the next time the clock is started. */
export const newSlotId = () => Math.random().toString(36).slice(2, 10);

/**
 * The keys that report time a new way from this month on, and the month it
 * starts. A pass's times are a time the clock ran too, so the clock can take
 * over at once. Times the clock ran have no pass to go in, though, so going
 * back to passes waits for next month if this one has any.
 */
export function switchMode(
    data: UserData,
    passes: Pass[],
    month: Month,
    mode: Mode
) {
    const ids = new Set(passes.map((pass) => pass.id));
    const unpassed = Object.entries(data).some(
        ([key, [value]]) =>
            key.startsWith(`t:${month}-`) &&
            value !== null &&
            !ids.has(key.split('/')[1])
    );
    const from = mode === 'passes' && unpassed ? addMonths(month, 1) : month;
    const changes: Record<string, Mode | null> = { [modeKey(from)]: mode };
    // A later choice would take over again.
    for (const [key, [value]] of Object.entries(data)) {
        if (key.startsWith('m:') && key.slice(2) > from && value !== null) {
            changes[key] = null;
        }
    }
    return { from, changes };
}
