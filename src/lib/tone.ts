/** Text colors for numbers above and below what's expected. */
export const UP = 'text-emerald-600 dark:text-emerald-400';
export const DOWN = 'text-destructive';
export const WARN = 'text-amber-600 dark:text-amber-400';

/** The tone of a difference in minutes. */
export const toneOf = (minutes: number) =>
    minutes > 0 ? UP : minutes < 0 ? DOWN : '';
