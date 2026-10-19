import { numberOf, optionKey, type UserData } from './userData';

export type Settings = {
    /** Minutes a day is expected to have. */
    target: number;
    /** Minutes a day can be invoiced at most. */
    max: number;
    /** VAT in percent. */
    vat: number;
    /** Whether flex carries over from one month to the next. */
    carryFlex: boolean;
    /** Hourly rates, each from its day on, earliest first. */
    rates: { from: string; rate: number }[];
};

export const DEFAULTS = { target: 7 * 60, max: 8 * 60, vat: 25 };

export function settingsOf(data: UserData): Settings {
    const rates: Settings['rates'] = [];
    for (const [key, [value]] of Object.entries(data)) {
        if (key.startsWith('r:') && typeof value === 'number') {
            rates.push({ from: key.slice('r:'.length), rate: value });
        }
    }
    rates.sort((a, b) => a.from.localeCompare(b.from));
    return {
        target: numberOf(data, optionKey('target')) ?? DEFAULTS.target,
        max: numberOf(data, optionKey('max')) ?? DEFAULTS.max,
        vat: numberOf(data, optionKey('vat')) ?? DEFAULTS.vat,
        carryFlex: numberOf(data, optionKey('carryFlex')) === 1,
        rates,
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
