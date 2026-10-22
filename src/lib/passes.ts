/**
 * Passes are the parts of a day the time is reported in, like "Förmiddag",
 * each with a time from and a time to. A day's time is the sum of its
 * passes.
 *
 * The two default passes exist without being stored, so a new device has
 * them too. Only what the user changes is stored, field by field, so changes
 * from two devices merge.
 */

import { numberOf, passKey, textOf, type UserData } from './userData';

export type Pass = {
    id: string;
    name: string;
    pos: number;
    /**
     * The column headings the pass had before passes had names, like
     * "Började" and "Lunch", which a pasted header row may still use.
     */
    headings: { start: string; end: string } | null;
};

const DEFAULT_PASSES: Pass[] = [
    {
        id: 'a',
        name: 'Förmiddag',
        pos: 0,
        headings: { start: 'Började', end: 'Lunch' },
    },
    {
        id: 'b',
        name: 'Eftermiddag',
        pos: 1,
        headings: { start: 'Lunch slut', end: 'Slutade' },
    },
];

export const EDGE_NAMES = { start: 'Från', end: 'Till' } as const;

/** One time of a pass, like "Förmiddag från". */
export const fieldName = (pass: Pass, edge: 'start' | 'end') =>
    `${pass.name} ${EDGE_NAMES[edge].toLowerCase()}`;

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
        const start =
            textOf(data, passKey(id, 'start')) ?? fallback?.headings?.start;
        const end = textOf(data, passKey(id, 'end')) ?? fallback?.headings?.end;
        const headings = start && end ? { start, end } : null;
        // A pass from before passes had names is named after its start.
        const name =
            textOf(data, passKey(id, 'name')) ??
            textOf(data, passKey(id, 'start')) ??
            fallback?.name;
        const pos = numberOf(data, passKey(id, 'pos')) ?? fallback?.pos;
        if (name && pos !== undefined) {
            passes.push({ id, name, pos, headings });
        }
    }
    return passes.sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id));
}

/** The keys that add a pass after the others. */
export function newPass(passes: Pass[]) {
    const id = Math.random().toString(36).slice(2, 10);
    const pos = Math.max(-1, ...passes.map((pass) => pass.pos)) + 1;
    return {
        [passKey(id, 'name')]: 'Extra',
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
