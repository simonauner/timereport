/**
 * Reporting a week in Kleer (my.kleer.se), where the customer's time is
 * reported, as hours per day like "7:20".
 *
 * Kleer's week view has a text field per day and doesn't split pasted text
 * across them, so the week goes over in two steps: the app copies it, and a
 * bookmarklet on Kleer's page fills the fields from it. Nothing is saved
 * until "Lägg till rad" is clicked in Kleer.
 */

import { addDays, weekNumber, weekStart } from './dates';
import type { Pass } from './passes';
import { dayReport } from './report';
import type { Settings } from './settings';
import { formatDuration } from './time';
import type { UserData } from './userData';

/**
 * A week's worked time, Monday to Friday, as rows of a date and a time
 * after a header. Days without time are left out, so Kleer leaves them
 * empty.
 */
export function kleerWeek(
    data: UserData,
    settings: Settings,
    passes: Pass[],
    date: string,
    today: string
) {
    const monday = weekStart(date);
    const rows = [`Datum\tTid v. ${weekNumber(monday)}`];
    for (let i = 0; i < 5; i++) {
        const day = addDays(monday, i);
        const { worked } = dayReport(data, settings, passes, day, today);
        if (worked > 0) rows.push(`${day}\t${formatDuration(worked)}`);
    }
    return `${rows.join('\n')}\n`;
}

/**
 * Runs on Kleer's week page as a bookmarklet, so it can't use anything from
 * outside itself. Fills the row with the focused field, or the new row, from
 * a copied week, matching days by the dates in Kleer's form.
 */
export async function fillKleer() {
    const parse = (text: string) =>
        [...text.matchAll(/(\d{4}-\d{2}-\d{2})\t(\d{1,2}:\d{2})/g)].map(
            (match) => [match[1], match[2]] as const
        );
    const toast = (message: string) => {
        const element = document.createElement('div');
        element.textContent = message;
        element.style.cssText =
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 16px;border-radius:8px;background:#111;color:#fff;font:14px system-ui;box-shadow:0 4px 16px rgb(0 0 0/30%)';
        document.body.append(element);
        setTimeout(() => element.remove(), 4000);
    };

    let rows: (readonly [string, string])[] = [];
    try {
        rows = parse(await navigator.clipboard.readText());
    } catch {
        // Reading the clipboard wasn't allowed; ask for the week instead.
    }
    if (rows.length === 0) {
        rows = parse(
            prompt('Klistra in veckan från Tidrapport (Cmd+V):') ?? ''
        );
    }
    if (rows.length === 0) {
        toast('Hittade ingen vecka. Kopiera den i Tidrapport först.');
        return;
    }

    const forms = [...document.forms].filter((form) =>
        form.querySelector('input[name$=".hours.input"]')
    );
    const active = document.activeElement;
    const newRow = forms.find((form) =>
        [...form.querySelectorAll('button')].some(
            (button) => button.textContent?.trim() === 'Lägg till rad'
        )
    );
    const form =
        (active instanceof HTMLInputElement &&
            forms.find((candidate) => candidate === active.form)) ||
        newRow ||
        forms.at(-1);
    if (!form) {
        toast('Öppna veckovyn i Kleer först.');
        return;
    }

    // Kleer's fields are React's, which only notice values set this way.
    const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
    )!.set!;
    let filled = 0;
    for (const [date, time] of rows) {
        const dateInput = [
            ...form.querySelectorAll<HTMLInputElement>('input[name$=".date"]'),
        ].find((input) => input.value === date);
        const name = dateInput?.name.replace(/\.date$/, '.hours.input');
        const input = name
            ? form.querySelector<HTMLInputElement>(`input[name="${name}"]`)
            : null;
        if (!input || input.disabled || input.readOnly) continue;
        input.focus();
        setValue.call(input, time);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
        filled++;
    }
    toast(
        filled > 0
            ? `Fyllde i ${filled} ${filled === 1 ? 'dag' : 'dagar'}. Kontrollera och klicka Lägg till rad.`
            : 'Veckan i Kleer har inga av de kopierade dagarna.'
    );
}

/** The bookmarklet to drag to the bookmarks bar. */
export const kleerBookmarklet = `javascript:${encodeURIComponent(
    `(${fillKleer.toString()})()`
)}`;
