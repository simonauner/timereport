/**
 * Passes are the pairs of columns a day's time is reported in, each with a
 * start and an end, like "Började" to "Lunch". A day's time is the sum of its
 * passes.
 *
 * The two default passes exist without being stored, so a new device has
 * them too. Only what the user changes is stored, field by field, so changes
 * from two devices merge.
 */

import { numberOf, passKey, textOf, type UserData } from './userData';

export type Pass = {
    id: string;
    start: string;
    end: string;
    pos: number;
};

const DEFAULT_PASSES: Pass[] = [
    { id: 'a', start: 'Började', end: 'Lunch', pos: 0 },
    { id: 'b', start: 'Lunch slut', end: 'Slutade', pos: 1 },
];

/** The passes in use, in order. */
export function passesOf(data: UserData): Pass[] {
    const ids = new Set(DEFAULT_PASSES.map((pass) => pass.id));
    for (const key of Object.keys(data)) {
        if (key.startsWith('p:')) ids.add(key.slice(2, key.indexOf('/')));
    }
    const passes: Pass[] = [];
    for (const id of ids) {
        if (numberOf(data, passKey(id, 'off')) === 1) continue;
        const fallback = DEFAULT_PASSES.find((pass) => pass.id === id);
        const start = textOf(data, passKey(id, 'start')) ?? fallback?.start;
        const end = textOf(data, passKey(id, 'end')) ?? fallback?.end;
        const pos = numberOf(data, passKey(id, 'pos')) ?? fallback?.pos;
        if (start && end && pos !== undefined) {
            passes.push({ id, start, end, pos });
        }
    }
    return passes.sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id));
}

/** The keys that add a pass after the others. */
export function newPass(passes: Pass[]) {
    const id = Math.random().toString(36).slice(2, 10);
    const pos = Math.max(-1, ...passes.map((pass) => pass.pos)) + 1;
    return {
        [passKey(id, 'start')]: 'Extra',
        [passKey(id, 'end')]: 'Extra slut',
        [passKey(id, 'pos')]: pos,
    };
}

/** The keys that move a pass one step up (-1) or down (1). */
export function movePass(passes: Pass[], index: number, step: -1 | 1) {
    const order = [...passes];
    [order[index], order[index + step]] = [order[index + step], order[index]];
    // Numbers every pass, in case two got the same place on two devices.
    return Object.fromEntries(
        order.map((pass, pos) => [passKey(pass.id, 'pos'), pos])
    );
}
