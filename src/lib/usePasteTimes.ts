import { useEffect, useState, type ClipboardEvent } from 'react';
import type { Pass } from './passes';
import {
    hasDates,
    isTable,
    parseTable,
    pasteByDate,
    pasteFromCell,
    type PasteResult,
} from './paste';
import type { Stamped, UserData } from './userData';
import { setValues } from './userStore';

export type Pasted = {
    result: PasteResult;
    /** The values the paste replaced, for undoing it. */
    before: Record<string, Stamped[0]>;
    undone: boolean;
};

const isEditable = (element: Element | null) =>
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable);

/**
 * Pastes rows copied from a spreadsheet: into the table from the time cell
 * pasted in, or anywhere on the page if the rows start with dates. Returns
 * a handler for the table and what was last pasted, to show.
 */
export function usePasteTimes(data: UserData, passes: Pass[], days: string[]) {
    const [pasted, setPasted] = useState<Pasted | null>(null);

    const paste = (text: string, cell: HTMLElement | null) => {
        if (!isTable(text)) return false;
        const rows = parseTable(text);
        const start = cell?.dataset.date
            ? {
                  date: cell.dataset.date,
                  pass: cell.dataset.pass ?? '',
                  edge: (cell.dataset.edge === 'end' ? 'end' : 'start') as
                      'start' | 'end',
              }
            : null;
        let result: PasteResult;
        if (hasDates(rows)) result = pasteByDate(rows, passes);
        else if (start) result = pasteFromCell(rows, passes, days, start);
        // Rows without dates need a cell to start from.
        else return false;

        const before = Object.fromEntries(
            Object.keys(result.changes).map((key) => [
                key,
                data[key]?.[0] ?? null,
            ])
        );
        if (Object.keys(result.changes).length > 0) setValues(result.changes);
        setPasted({ result, before, undone: false });
        return true;
    };

    // Rows with dates can be pasted with nothing in particular selected.
    useEffect(() => {
        const onPaste = (event: globalThis.ClipboardEvent) => {
            if (isEditable(document.activeElement)) return;
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (hasDates(parseTable(text)) && paste(text, null)) {
                event.preventDefault();
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    });

    const onPaste = (event: ClipboardEvent<HTMLElement>) => {
        const target = event.target as HTMLElement;
        if (!target.dataset.time) return;
        if (paste(event.clipboardData.getData('text/plain'), target)) {
            event.preventDefault();
        }
    };

    const undo = () => {
        if (!pasted) return;
        setValues(pasted.before);
        setPasted({ ...pasted, undone: true });
    };

    return { onPaste, pasted, undo, dismiss: () => setPasted(null) };
}
