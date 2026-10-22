/**
 * Pasting times copied from a spreadsheet, like Google Sheets, which puts
 * tab-separated rows on the clipboard.
 *
 * Rows that start with a date go to that day, wherever they're pasted, with
 * their columns matched to passes by a header row of column names if there
 * is one, and in order if not. Rows without dates fill the table like a
 * spreadsheet does, down and to the right from the cell they're pasted in.
 * Either way, an empty cell clears the time it lands on.
 */

import { fieldName, type Pass } from './passes';
import { parseTime } from './time';
import { timeKey, type Stamped } from './userData';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A time field: one end of a pass, with the column headings it goes by, like
 * "Förmiddag från" and the older "Började".
 */
type Field = { pass: string; edge: 'start' | 'end'; labels: string[] };

const fieldsOf = (passes: Pass[]): Field[] =>
    passes.flatMap((pass) =>
        (['start', 'end'] as const).map((edge) => ({
            pass: pass.id,
            edge,
            labels: [
                fieldName(pass, edge),
                ...(pass.headings ? [pass.headings[edge]] : []),
            ],
        }))
    );

/** Rows of cells from pasted text. */
export function parseTable(text: string): string[][] {
    const rows = text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.split('\t').map((cell) => cell.trim()));
    // A copied range ends with a line break.
    while (rows.length > 0 && rows.at(-1)!.every((cell) => cell === '')) {
        rows.pop();
    }
    return rows;
}

/** Whether pasted text is more than one cell, so it's ours to handle. */
export const isTable = (text: string) => /[\t\n]/.test(text.trim());

export type PasteResult = {
    changes: Record<string, Stamped[0]>;
    /** Days with a time set or cleared. */
    days: string[];
    /** Times set, not counting cleared ones. */
    times: number;
    /** Cells that weren't times. */
    invalid: number;
    /** Columns of a header row with times, that match no pass. */
    unknownColumns: string[];
};

const normalize = (label: string) => label.trim().toLowerCase();

function add(result: PasteResult, date: string, field: Field, cell: string) {
    const time = cell === '' ? null : parseTime(cell);
    if (cell !== '' && time === null) {
        result.invalid++;
        return;
    }
    result.changes[timeKey(date, field.pass, field.edge)] = time;
    if (time) result.times++;
    if (!result.days.includes(date)) result.days.push(date);
}

const empty = (): PasteResult => ({
    changes: {},
    days: [],
    times: 0,
    invalid: 0,
    unknownColumns: [],
});

/** Whether any row starts with a date, so rows go by date. */
export const hasDates = (rows: string[][]) =>
    rows.some((row) => DATE.test(row[0] ?? ''));

/** Rows that start with dates, each to its own day. */
export function pasteByDate(rows: string[][], passes: Pass[]): PasteResult {
    const result = empty();
    const fields = fieldsOf(passes);
    const byLabel = new Map(
        fields.flatMap((field) =>
            field.labels.map((label) => [normalize(label), field] as const)
        )
    );

    // Column index to field. A header row names the columns; without one,
    // they're the fields in order after the date.
    let columns = new Map<number, Field>(
        fields.map((field, index) => [index + 1, field])
    );
    // The first row with something in it, if it comes before the dates. One
    // that names no pass leaves nothing to paste, rather than putting times
    // in the wrong columns.
    const firstDate = rows.findIndex((row) => DATE.test(row[0] ?? ''));
    const header = rows
        .slice(0, firstDate)
        .find((row) => row.some((cell) => cell !== ''));
    if (header) {
        columns = new Map();
        header.forEach((cell, index) => {
            if (index === 0 || cell === '') return;
            const field = byLabel.get(normalize(cell));
            if (field) columns.set(index, field);
            // Only worth mentioning if it has times that are left out.
            else if (
                rows.some(
                    (row) =>
                        DATE.test(row[0] ?? '') && (row[index] ?? '') !== ''
                )
            ) {
                result.unknownColumns.push(cell);
            }
        });
    }

    for (const row of rows) {
        const date = row[0];
        if (!DATE.test(date ?? '')) continue;
        for (const [index, field] of columns) {
            add(result, date, field, row[index] ?? '');
        }
    }
    return result;
}

/**
 * Rows without dates, from a cell down and to the right, over `days` in the
 * order they're shown. What falls outside the table is left out.
 */
export function pasteFromCell(
    rows: string[][],
    passes: Pass[],
    days: string[],
    start: { date: string; pass: string; edge: 'start' | 'end' }
): PasteResult {
    const result = empty();
    const fields = fieldsOf(passes);
    const firstDay = days.indexOf(start.date);
    const firstField = fields.findIndex(
        (field) => field.pass === start.pass && field.edge === start.edge
    );
    if (firstDay < 0 || firstField < 0) return result;

    rows.forEach((row, y) => {
        const date = days[firstDay + y];
        if (!date) return;
        row.forEach((cell, x) => {
            const field = fields[firstField + x];
            if (field) add(result, date, field, cell);
        });
    });
    return result;
}
