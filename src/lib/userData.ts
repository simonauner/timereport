/**
 * Everything the user has entered: times, days off, columns and settings.
 *
 * Every value is stored under its own key together with when it was set, and
 * the latest change to a key wins. That makes two copies, e.g. from two
 * devices, safe to merge in any order without losing changes to different
 * days or fields.
 *
 * Keys:
 * - `t:<date>/<pass>/start` and `t:<date>/<pass>/end` are the times of a
 *   pass on a day, like "08:10".
 * - `x:<date>` is 1 when the day is marked as off.
 * - `p:<pass>/start` and `p:<pass>/end` are a pass's column headings,
 *   `p:<pass>/pos` where it goes among the others, and `p:<pass>/off` is 1
 *   once it has been removed (lib/passes.ts).
 * - `r:<date>` is the hourly rate in kronor from that day on.
 * - `o:target` and `o:max` are minutes per day, `o:vat` is a percentage,
 *   `o:carryFlex` is 1 when flex carries over from one month to the next, and
 *   `o:punchRound` is the minutes the punch clock rounds to
 *   (lib/settings.ts).
 */

/** A value and when it was set (ms since epoch). Null means it was cleared. */
export type Stamped = [value: number | string | null, updatedAt: number];

export type UserData = Record<string, Stamped>;

const DATE = String.raw`\d{4}-\d{2}-\d{2}`;
const PASS = '[a-z0-9]{1,12}';

export const timeKey = (date: string, pass: string, edge: 'start' | 'end') =>
    `t:${date}/${pass}/${edge}`;

export const offKey = (date: string) => `x:${date}`;

export const passKey = (pass: string, field: 'start' | 'end' | 'pos' | 'off') =>
    `p:${pass}/${field}`;

export const rateKey = (date: string) => `r:${date}`;

export const optionKey = (
    option: 'target' | 'max' | 'vat' | 'carryFlex' | 'punchRound'
): string => `o:${option}`;

export const MAX_LABEL_LENGTH = 40;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const KEY_PATTERN = new RegExp(
    [
        `t:${DATE}/${PASS}/(start|end)`,
        `x:${DATE}`,
        `p:${PASS}/(start|end|pos|off)`,
        `r:${DATE}`,
        'o:(target|max|vat|carryFlex|punchRound)',
    ]
        .map((pattern) => `^${pattern}$`)
        .join('|')
);

const isLabel = (value: unknown): value is string =>
    typeof value === 'string' &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= MAX_LABEL_LENGTH;

const isAmount = (value: unknown, max: number): value is number =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max;

function isValue(key: string, value: unknown) {
    if (key.startsWith('t:'))
        return typeof value === 'string' && TIME.test(value);
    if (key.startsWith('x:') || key === 'o:carryFlex') {
        return value === 0 || value === 1;
    }
    if (key.startsWith('p:')) {
        if (key.endsWith('/pos')) return Number.isInteger(value);
        if (key.endsWith('/off')) return value === 0 || value === 1;
        return isLabel(value);
    }
    if (key.startsWith('r:')) return isAmount(value, 1_000_000);
    if (key === 'o:vat') return isAmount(value, 100);
    if (key === 'o:punchRound') {
        return Number.isInteger(value) && isAmount(value, 60) && value !== 0;
    }
    // o:target and o:max, in minutes.
    return Number.isInteger(value) && isAmount(value, 24 * 60);
}

const isStamped = (key: string, stamped: unknown): stamped is Stamped => {
    if (!Array.isArray(stamped) || stamped.length !== 2) return false;
    const [value, updatedAt] = stamped as unknown[];
    if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
        return false;
    }
    return value === null || isValue(key, value);
};

/** Keeps the well-formed entries of untrusted data, e.g. from storage. */
export function sanitize(input: unknown): UserData {
    if (typeof input !== 'object' || input === null) return {};
    return Object.fromEntries(
        Object.entries(input).filter(
            ([key, stamped]) => KEY_PATTERN.test(key) && isStamped(key, stamped)
        )
    );
}

/** Whether `incoming` should replace `current` for the same key. */
const isNewer = (incoming: Stamped, current: Stamped | undefined) =>
    !current || incoming[1] > current[1];

/** Merges `incoming` into `current`. The latest change to each key wins. */
export function merge(current: UserData, incoming: UserData) {
    const merged = { ...current };
    let changed = 0;
    for (const [key, stamped] of Object.entries(incoming)) {
        if (isNewer(stamped, merged[key])) {
            if (merged[key]?.[0] !== stamped[0]) changed++;
            merged[key] = stamped;
        }
    }
    return { merged, changed };
}

/** A stored text, or null if there's none. */
export const textOf = (data: UserData, key: string) => {
    const value = data[key]?.[0];
    return typeof value === 'string' ? value : null;
};

/** A stored number, or null if there's none. */
export const numberOf = (data: UserData, key: string) => {
    const value = data[key]?.[0];
    return typeof value === 'number' ? value : null;
};

export const toBase64Url = (bytes: Uint8Array) => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
};

export const fromBase64Url = (text: string) => {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
