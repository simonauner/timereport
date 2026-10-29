import { weekday, type Month } from './dates';
import { numberOf, optionKey, type UserData } from './userData';

/**
 * How time is reported: in the named passes, or by starting and stopping the
 * clock as many times a day as it takes.
 */
export type Mode = 'passes' | 'clock';

export type Settings = {
    /** Minutes a day is expected to have. */
    target: number;
    /** Minutes a day can be invoiced at most. */
    max: number;
    /** VAT in percent. */
    vat: number;
    /** Whether flex carries over from one month to the next. */
    carryFlex: boolean;
    /** Minutes the punch clock rounds to, 1 for none. */
    punchRound: number;
    /** Which weekdays are workdays, one bit each from Monday. */
    workdays: number;
    /** Hourly rates, each from its day on, earliest first. */
    rates: { from: string; rate: number }[];
    /** How time is reported, each from its month on, earliest first. */
    modes: { from: Month; mode: Mode }[];
};

export const DEFAULTS = {
    target: 7 * 60,
    max: 8 * 60,
    vat: 25,
    punchRound: 5,
    workdays: 0b0011111,
};

export function settingsOf(data: UserData): Settings {
    const rates: Settings['rates'] = [];
    for (const [key, [value]] of Object.entries(data)) {
        if (key.startsWith('r:') && typeof value === 'number') {
            rates.push({ from: key.slice('r:'.length), rate: value });
        }
    }
    rates.sort((a, b) => a.from.localeCompare(b.from));
    const modes: Settings['modes'] = [];
    for (const [key, [value]] of Object.entries(data)) {
        if (key.startsWith('m:') && (value === 'passes' || value === 'clock')) {
            modes.push({ from: key.slice('m:'.length), mode: value });
        }
    }
    modes.sort((a, b) => a.from.localeCompare(b.from));
    return {
        target: numberOf(data, optionKey('target')) ?? DEFAULTS.target,
        max: numberOf(data, optionKey('max')) ?? DEFAULTS.max,
        vat: numberOf(data, optionKey('vat')) ?? DEFAULTS.vat,
        carryFlex: numberOf(data, optionKey('carryFlex')) === 1,
        punchRound:
            numberOf(data, optionKey('punchRound')) ?? DEFAULTS.punchRound,
        workdays: numberOf(data, optionKey('workdays')) ?? DEFAULTS.workdays,
        rates,
        modes,
    };
}

/** The hourly rate on a day: the latest one from that day or before. */
export function rateOn(settings: Settings, iso: string) {
    let rate: number | null = null;
    for (const entry of settings.rates) {
        if (entry.from > iso) break;
        rate = entry.rate;
    }
    return rate;
}

/** How time is reported in a month: the latest choice from then or before. */
export function modeIn(settings: Settings, month: Month): Mode {
    let mode: Mode = 'passes';
    for (const entry of settings.modes) {
        if (entry.from > month) break;
        mode = entry.mode;
    }
    return mode;
}

export const isWorkday = (settings: Settings, iso: string) =>
    ((settings.workdays >> weekday(iso)) & 1) === 1;
