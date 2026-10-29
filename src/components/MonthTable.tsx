import { Fragment, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, TriangleAlert, X } from 'lucide-react';
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
import { fromIso, monthOf, weekdayName } from '@/lib/dates';
import { EDGE_NAMES, fieldName, type Pass } from '@/lib/passes';
import type { DayReport, MonthReport } from '@/lib/report';
import { modeIn, type Settings } from '@/lib/settings';
import { newSlotId } from '@/lib/slots';
import { formatDuration, parseTime, spanMinutes } from '@/lib/time';
import { toneOf, WARN } from '@/lib/tone';
import { offKey, textOf, timeKey, type UserData } from '@/lib/userData';
import { setValue, setValues } from '@/lib/userStore';
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
    const clock =
        modeIn(settings, monthOf(report.days[0]?.date ?? today)) === 'clock';
    const columns = clock ? 8 : 5 + passes.length * 2;
    return (
        <Card className="py-0">
            <Table className="tabular-nums">
                <TableHeader>
                    {clock ? (
                        <TableRow>
                            <TableHead className={cn(STICKY, 'min-w-28')}>
                                Dag
                            </TableHead>
                            <TableHead className="text-center">Från</TableHead>
                            <TableHead className="text-center">Till</TableHead>
                            <TableHead className="text-right">Rast</TableHead>
                            <TableHead className="text-right">Summa</TableHead>
                            <TableHead className="text-right">Diff</TableHead>
                            <TableHead className="text-right">Flex</TableHead>
                            <TableHead />
                        </TableRow>
                    ) : (
                        <PassHeader passes={passes} />
                    )}
                </TableHeader>
                <TableBody>
                    {report.days.map((day, index) => (
                        <Fragment key={day.date}>
                            {clock ? (
                                <ClockRow
                                    data={data}
                                    settings={settings}
                                    day={day}
                                    today={today}
                                    columns={columns}
                                />
                            ) : (
                                <DayRow
                                    data={data}
                                    settings={settings}
                                    passes={passes}
                                    day={day}
                                    today={today}
                                />
                            )}
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

/** Each pass's name over its from and to. */
function PassHeader({ passes }: { passes: Pass[] }) {
    return (
        <>
            <TableRow className="border-b-0">
                <TableHead rowSpan={2} className={cn(STICKY, 'min-w-28')}>
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
        </>
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
    return (
        <TableRow
            data-state={day.date === today ? 'selected' : undefined}
            className={cn(day.status === 'off' && 'text-muted-foreground')}
        >
            <DayCell day={day} today={today} />
            {passes.map((pass) =>
                (['start', 'end'] as const).map((edge) => (
                    <TableCell key={`${pass.id}-${edge}`} className="py-1">
                        <TimeInput
                            data={data}
                            day={day}
                            id={pass.id}
                            edge={edge}
                            label={fieldName(pass.name, edge)}
                        />
                    </TableCell>
                ))
            )}
            <Totals settings={settings} day={day} today={today} />
        </TableRow>
    );
}

/**
 * A day of a month with the start and stop clock: its first start, last stop
 * and the breaks between, and every time the clock ran when opened. A day
 * with at most one is typed straight into the row.
 */
function ClockRow({
    data,
    settings,
    day,
    today,
    columns,
}: {
    data: UserData;
    settings: Settings;
    day: DayReport;
    today: string;
    columns: number;
}) {
    const [open, setOpen] = useState(false);
    // The id for times typed in before there are any, kept so the start and
    // the stop end up together.
    const [newId, setNewId] = useState(newSlotId);
    const { times } = day;
    // Once they're typed in, the next ones get an id of their own.
    if (times.some((time) => time.id === newId)) setNewId(newSlotId());
    const first = times[0];
    const last = times.at(-1);
    const done = times.every((time) => time.start && time.end);
    const breaks =
        times.length > 1 && done && first?.start && last?.end
            ? spanMinutes(first.start, last.end) - day.worked
            : null;

    return (
        <>
            <TableRow
                data-state={day.date === today ? 'selected' : undefined}
                className={cn(day.status === 'off' && 'text-muted-foreground')}
            >
                <DayCell day={day} today={today}>
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-expanded={open}
                        aria-label={open ? 'Dölj tiderna' : 'Visa tiderna'}
                        onClick={() => setOpen(!open)}
                    >
                        <ChevronDown
                            className={cn(
                                'transition-transform',
                                open && 'rotate-180'
                            )}
                        />
                    </Button>
                </DayCell>
                {times.length > 1 ? (
                    <>
                        <TableCell className="text-center">
                            {first?.start}
                        </TableCell>
                        <TableCell className="text-center">
                            {last?.end}
                            {last && day.overnight.includes(last.id) && (
                                <NextDay />
                            )}
                        </TableCell>
                    </>
                ) : (
                    (['start', 'end'] as const).map((edge) => (
                        <TableCell key={edge} className="py-1">
                            <TimeInput
                                data={data}
                                day={day}
                                id={first?.id ?? newId}
                                edge={edge}
                                label={EDGE_NAMES[edge]}
                            />
                        </TableCell>
                    ))
                )}
                <TableCell className="text-right">
                    {breaks !== null && formatDuration(breaks)}
                </TableCell>
                <Totals settings={settings} day={day} today={today} />
            </TableRow>
            {open && (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns} className="py-2 pl-28">
                        <ul className="grid gap-1">
                            {[...times.map((time) => time.id), newId].map(
                                (id) => (
                                    <li
                                        key={id}
                                        className="flex w-fit items-center gap-1"
                                    >
                                        <TimeInput
                                            data={data}
                                            day={day}
                                            id={id}
                                            edge="start"
                                            label="Start"
                                            placeholder="Start"
                                        />
                                        –
                                        <TimeInput
                                            data={data}
                                            day={day}
                                            id={id}
                                            edge="end"
                                            label="Stopp"
                                            placeholder="Stopp"
                                        />
                                        {times.some(
                                            (time) => time.id === id
                                        ) && (
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Ta bort"
                                                onClick={() =>
                                                    setValues({
                                                        [timeKey(
                                                            day.date,
                                                            id,
                                                            'start'
                                                        )]: null,
                                                        [timeKey(
                                                            day.date,
                                                            id,
                                                            'end'
                                                        )]: null,
                                                    })
                                                }
                                            >
                                                <X />
                                            </Button>
                                        )}
                                    </li>
                                )
                            )}
                        </ul>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

/** The day's name, and its holiday if it's one. */
function DayCell({
    day,
    today,
    children,
}: {
    day: DayReport;
    today: string;
    children?: ReactNode;
}) {
    return (
        <TableCell
            className={cn(
                STICKY,
                'font-medium',
                day.date === today &&
                    'bg-muted shadow-[inset_3px_0_var(--primary)] [tr:hover>&]:bg-muted'
            )}
        >
            <div className="flex items-center justify-between gap-1">
                <div>
                    <span className={cn(day.holiday && 'text-destructive')}>
                        {weekdayName(day.date)} {fromIso(day.date).getDate()}
                    </span>
                    {day.holiday && (
                        <span className="block text-xs font-normal text-muted-foreground">
                            {day.holiday}
                        </span>
                    )}
                </div>
                {children}
            </div>
        </TableCell>
    );
}

/** One time of a day, typed in, with a mark if it's the day after. */
function TimeInput({
    data,
    day,
    id,
    edge,
    label,
    placeholder,
}: {
    data: UserData;
    day: DayReport;
    id: string;
    edge: 'start' | 'end';
    label: string;
    placeholder?: string;
}) {
    const key = timeKey(day.date, id, edge);
    const nextDay = edge === 'end' && day.overnight.includes(id);
    return (
        <div className="relative mx-auto w-fit">
            <CommitInput
                data-time
                className={cn(
                    'w-18 border-transparent bg-transparent text-center shadow-none hover:border-input dark:bg-transparent',
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
                        if (time) setValue(key, time);
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

/** The day's sum, how it compares to the target, the flex and "Ledig". */
function Totals({
    settings,
    day,
    today,
}: {
    settings: Settings;
    day: DayReport;
    today: string;
}) {
    const off = day.status === 'off';
    const missing = day.status === 'open' && day.date < today;
    return (
        <>
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
        </>
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
