import { Fragment, type KeyboardEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fromIso, weekdayName } from '@/lib/dates';
import { EDGE_NAMES, fieldName, type Pass } from '@/lib/passes';
import type { DayReport, MonthReport } from '@/lib/report';
import type { Settings } from '@/lib/settings';
import { formatDuration, parseTime } from '@/lib/time';
import { toneOf, WARN } from '@/lib/tone';
import { offKey, textOf, timeKey, type UserData } from '@/lib/userData';
import { setValue } from '@/lib/userStore';
import { cn } from '@/lib/utils';
import { CommitInput } from './CommitInput';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    report: MonthReport;
    today: string;
};

/** Enter moves on to the next time, like in a spreadsheet. */
function focusNext(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[data-time]'),
    ];
    inputs[inputs.indexOf(event.currentTarget) + 1]?.focus();
}

/**
 * The day column stays in view when the table scrolls sideways. It needs a
 * background of its own, so it takes on the row's when hovered.
 */
const STICKY =
    'sticky left-0 z-10 bg-card [tr:hover>&]:bg-[color-mix(in_oklch,var(--muted)_50%,var(--card))]';

export function MonthTable({ data, settings, passes, report, today }: Props) {
    const columns = 5 + passes.length * 2;
    return (
        <Card className="py-0">
            <Table className="tabular-nums">
                <TableHeader>
                    {/* Each pass's name over its from and to. */}
                    <TableRow className="border-b-0">
                        <TableHead
                            rowSpan={2}
                            className={cn(STICKY, 'min-w-28')}
                        >
                            Dag
                        </TableHead>
                        {passes.map((pass) => (
                            <TableHead
                                key={pass.id}
                                colSpan={2}
                                className="h-8 text-center"
                            >
                                {pass.name}
                            </TableHead>
                        ))}
                        <TableHead rowSpan={2} className="text-right">
                            Summa
                        </TableHead>
                        <TableHead rowSpan={2} className="text-right">
                            Diff
                        </TableHead>
                        <TableHead rowSpan={2} className="text-right">
                            Flex
                        </TableHead>
                        <TableHead rowSpan={2} />
                    </TableRow>
                    <TableRow>
                        {passes.map((pass) =>
                            (['start', 'end'] as const).map((edge) => (
                                <TableHead
                                    key={`${pass.id}-${edge}`}
                                    className="h-8 text-center font-normal text-muted-foreground"
                                >
                                    {EDGE_NAMES[edge]}
                                </TableHead>
                            ))
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {report.days.map((day, index) => (
                        <Fragment key={day.date}>
                            <DayRow
                                data={data}
                                settings={settings}
                                passes={passes}
                                day={day}
                                today={today}
                            />
                            {report.days[index + 1]?.week !== day.week && (
                                <WeekRow
                                    week={day.week}
                                    days={report.days.filter(
                                        (other) => other.week === day.week
                                    )}
                                    columns={columns}
                                />
                            )}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

function DayRow({
    data,
    settings,
    passes,
    day,
    today,
}: {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    day: DayReport;
    today: string;
}) {
    const off = day.status === 'off';
    const isToday = day.date === today;
    const missing = day.status === 'open' && day.date < today;

    return (
        <TableRow
            data-state={isToday ? 'selected' : undefined}
            className={cn(off && 'text-muted-foreground')}
        >
            <TableCell
                className={cn(
                    STICKY,
                    'font-medium',
                    isToday &&
                        'bg-muted shadow-[inset_3px_0_var(--primary)] [tr:hover>&]:bg-muted'
                )}
            >
                <span className={cn(day.holiday && 'text-destructive')}>
                    {weekdayName(day.date)} {fromIso(day.date).getDate()}
                </span>
                {day.holiday && (
                    <span className="block text-xs font-normal text-muted-foreground">
                        {day.holiday}
                    </span>
                )}
            </TableCell>
            {passes.map((pass) =>
                (['start', 'end'] as const).map((edge) => {
                    const key = timeKey(day.date, pass.id, edge);
                    return (
                        <TableCell key={`${pass.id}-${edge}`} className="py-1">
                            <CommitInput
                                data-time
                                data-date={day.date}
                                data-pass={pass.id}
                                data-edge={edge}
                                className={cn(
                                    'w-18 border-transparent bg-transparent text-center shadow-none hover:border-input dark:bg-transparent',
                                    off && 'opacity-50'
                                )}
                                inputMode="decimal"
                                autoComplete="off"
                                aria-label={`${fieldName(pass, edge)} ${day.date}`}
                                aria-invalid={day.invalid.includes(pass.id)}
                                value={textOf(data, key) ?? ''}
                                onCommit={(text) => {
                                    if (text.trim() === '') {
                                        setValue(key, null);
                                    } else {
                                        const time = parseTime(text);
                                        if (time) setValue(key, time);
                                    }
                                }}
                                onKeyDown={focusNext}
                            />
                        </TableCell>
                    );
                })
            )}
            <TableCell
                className={cn(
                    'text-right',
                    day.status === 'forecast' && 'text-muted-foreground italic',
                    day.overMax && cn(WARN, 'font-semibold')
                )}
                title={
                    day.overMax
                        ? `Över max ${formatDuration(settings.max)} per dag`
                        : day.status === 'forecast'
                          ? 'Prognos: målet tills tiderna är ifyllda'
                          : undefined
                }
            >
                <span className="inline-flex items-center gap-1">
                    {off && day.worked === 0
                        ? '–'
                        : formatDuration(
                              day.status === 'open' ? day.worked : day.counted
                          )}
                    {day.overMax && (
                        <TriangleAlert className="size-3.5" aria-hidden />
                    )}
                </span>
                {missing && (
                    <span className={cn('block text-xs', WARN)}>
                        Saknar tid
                    </span>
                )}
                {day.status === 'open' && !missing && (
                    <span className="block text-xs text-muted-foreground">
                        pågår
                    </span>
                )}
            </TableCell>
            <TableCell className={cn('text-right', toneOf(day.diff))}>
                {day.status === 'reported' || (off && day.worked > 0)
                    ? formatDuration(day.diff, { sign: true })
                    : ''}
            </TableCell>
            <TableCell className={cn('text-right', toneOf(day.flex))}>
                {formatDuration(day.flex, { sign: true })}
            </TableCell>
            <TableCell className="py-1">
                <Button
                    size="sm"
                    variant={off ? 'secondary' : 'ghost'}
                    aria-pressed={off}
                    onClick={() => setValue(offKey(day.date), off ? null : 1)}
                >
                    Ledig
                </Button>
            </TableCell>
        </TableRow>
    );
}

function WeekRow({
    week,
    days,
    columns,
}: {
    week: number;
    days: DayReport[];
    columns: number;
}) {
    const total = days.reduce((sum, day) => sum + day.counted, 0);
    return (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableCell
                colSpan={columns}
                className="py-1 text-xs text-muted-foreground"
            >
                Vecka {week}:{' '}
                <strong className="text-foreground">
                    {formatDuration(total)}
                </strong>
            </TableCell>
        </TableRow>
    );
}
