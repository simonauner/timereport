import type { KeyboardEvent } from 'react';
import { CommitInput } from './CommitInput';
import type { DayReport } from '@/lib/report';
import { parseTime } from '@/lib/time';
import { textOf, timeKey, type UserData } from '@/lib/userData';
import { setValue } from '@/lib/userStore';
import { cn } from 'cn';

/** Enter moves on to the next time, like in a spreadsheet. */
function focusNext(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[data-time]'),
    ];
    inputs[inputs.indexOf(event.currentTarget) + 1]?.focus();
}

/** One time of a day, typed in, with a mark if it's the day after. */
export function TimeInput({
    data,
    day,
    id,
    edge,
    label,
    placeholder,
    compact = true,
}: {
    data: UserData;
    day: DayReport;
    id: string;
    edge: 'start' | 'end';
    label: string;
    placeholder?: string;
    compact?: boolean;
}) {
    const key = timeKey(day.date, id, edge);
    const nextDay = edge === 'end' && day.overnight.includes(id);
    return (
        <div className="relative mx-auto w-fit">
            <CommitInput
                data-time
                className={cn(
                    compact
                        ? 'w-18 border-transparent bg-transparent text-center shadow-none hover:border-input dark:bg-transparent'
                        : 'w-24 text-center',
                    day.status === 'off' && 'opacity-50'
                )}
                inputMode="decimal"
                autoComplete="off"
                placeholder={placeholder}
                aria-label={`${label} ${day.date}${nextDay ? ', nästa dag' : ''}`}
                value={textOf(data, key) ?? ''}
                onCommit={(text) => {
                    if (text.trim() === '') {
                        setValue(key, null);
                    } else {
                        const time = parseTime(text);
                        if (!time)
                            return 'Ange en giltig tid, till exempel 08:00.';
                        setValue(key, time);
                    }
                }}
                onKeyDown={focusNext}
            />
            {nextDay && (
                <span className="pointer-events-none absolute top-0.5 right-1">
                    <NextDay />
                </span>
            )}
        </div>
    );
}

function NextDay() {
    return (
        <sup
            className="ml-0.5 text-[10px] text-muted-foreground"
            title="Nästa dag"
        >
            +1
        </sup>
    );
}
