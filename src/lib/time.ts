/**
 * Times of day ("08:10") and durations in minutes, and how they're typed and
 * shown.
 */

/**
 * A typed time of day as "HH:MM", or null if it isn't one. Takes what's quick
 * to type: "8", "810", "0810", "8.10", "8:10" or "8,10".
 */
export function parseTime(input: string): string | null {
    const text = input.trim();
    const match =
        /^(\d{1,2})(?:[.:,](\d{2}))?$/.exec(text) ??
        /^(\d{1,2})(\d{2})$/.exec(text);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2] ?? 0);
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Minutes since midnight of a "HH:MM" time. */
export const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/** The current time as "HH:MM". */
export const timeNow = (now = new Date()) =>
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

/** A duration like "8:00" or "169:35", with a sign if it's negative. */
export function formatDuration(minutes: number, { sign = false } = {}) {
    const whole = Math.round(Math.abs(minutes));
    const text = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    if (minutes < 0 && whole > 0) return `−${text}`;
    return sign && whole > 0 ? `+${text}` : text;
}

/**
 * A typed duration in minutes, or null if it isn't one: "7:30", "7.30",
 * "7,5" or "7" hours.
 */
export function parseDuration(input: string): number | null {
    const text = input.trim();
    const clock = /^(\d{1,2})[:.](\d{2})$/.exec(text);
    if (clock) {
        const minutes = Number(clock[2]);
        return minutes < 60 ? Number(clock[1]) * 60 + minutes : null;
    }
    const hours = /^\d{1,2}(,\d+)?$/.test(text)
        ? Number(text.replace(',', '.'))
        : NaN;
    return Number.isFinite(hours) && hours <= 24
        ? Math.round(hours * 60)
        : null;
}

const decimal = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Hours with decimals, like "169,58", as invoiced. */
export const formatHours = (minutes: number) => decimal.format(minutes / 60);

const kronor = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
});

export const formatKronor = (amount: number) => kronor.format(amount);
