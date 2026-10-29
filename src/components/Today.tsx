import { useId, useState, type ReactNode } from 'react';
import { CircleCheck, Minus, Play, Plus, Square, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { fromIso, weekdayName } from '@/lib/dates';
import type { Pass } from '@/lib/passes';
import { punchOf, type PunchField } from '@/lib/punch';
import { punchNow } from '@/lib/punchNow';
import { weekMinutes, type MonthReport } from '@/lib/report';
import { isWorkday, type Settings } from '@/lib/settings';
import {
    addMinutes,
    formatDuration,
    parseTime,
    timeNow,
    toMinutes,
} from '@/lib/time';
import { toneOf } from '@/lib/tone';
import type { UserData } from '@/lib/userData';
import { setValue } from '@/lib/userStore';
import { cn } from 'cn';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    report: MonthReport;
    today: string;
    now: Date;
};

/**
 * The phone's start screen: one big button that starts and stops the time
 * running now, like Milslukaren's trip button.
 */
export function Today({ data, settings, passes, report, today, now }: Props) {
    const { date, fields, next, last, runningStart, worked, forgotten } =
        punchOf(data, settings, passes, today, now);
    // Minutes to move the next time by, for when it happened a while ago.
    const [offset, setOffset] = useState(0);
    const time = addMinutes(timeNow(now, settings.punchRound), offset);
    // Earlier than the time before would end a pass before it started. After
    // midnight, the time before was yesterday.
    const canGoBack =
        toMinutes(time) - STEP >=
        (last?.time && date === today ? toMinutes(last.time) : 0);
    const punch = (key: string, value: string | null) => {
        setValue(key, value);
        setOffset(0);
    };
    const filled = fields.filter((field) => field.time);
    const progress = settings.target
        ? Math.min(1, worked / settings.target)
        : 0;

    return (
        <div className="flex flex-col gap-3 tabular-nums">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {date === today ? 'Idag' : 'I går'}, {weekdayName(date)}{' '}
                        {fromIso(date).getDate()}/{fromIso(date).getMonth() + 1}
                    </CardTitle>
                    <CardDescription>
                        <Status
                            running={runningStart}
                            sinceYesterday={date !== today}
                            last={last}
                            done={!next}
                            dayOff={!isWorkday(settings, today)}
                        />
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <div>
                        <p className="text-3xl font-semibold">
                            {formatDuration(worked)}{' '}
                            <span className="text-base font-normal text-muted-foreground">
                                av {formatDuration(settings.target)}
                            </span>
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                    </div>
                    {filled.length > 0 && (
                        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                            {filled.map((field) => (
                                <div key={field.key} className="contents">
                                    <dt className="text-muted-foreground">
                                        {field.label}
                                    </dt>
                                    <dd className="text-right font-medium">
                                        {field.time}
                                        {field.nextDay && <NextDay />}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </CardContent>
            </Card>

            {forgotten && next ? (
                <Forgotten
                    label={next.label}
                    start={runningStart}
                    date={date}
                    now={time}
                    stop={(value) => punch(next.key, value)}
                />
            ) : next ? (
                <>
                    <BigButton
                        edge={next.edge}
                        label={next.edge === 'start' ? 'Starta' : 'Stoppa'}
                        hint={`${next.label} ${time}${offset ? ` (${offsetText(offset)})` : ''}`}
                        idle={!last}
                        onClick={() => {
                            punchNow(offset);
                            setOffset(0);
                        }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="h-12 text-base"
                            disabled={!canGoBack}
                            aria-label={`${STEP} minuter tidigare`}
                            onClick={() => setOffset((o) => o - STEP)}
                        >
                            <Minus data-icon="inline-start" />
                            {STEP} min
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 text-base"
                            aria-label={`${STEP} minuter senare`}
                            onClick={() => setOffset((o) => o + STEP)}
                        >
                            <Plus data-icon="inline-start" />
                            {STEP} min
                        </Button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <CircleCheck
                        className="size-12 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                    />
                    <p className="text-lg font-semibold">Klart för idag!</p>
                    <p className="text-muted-foreground">Allt är ifyllt.</p>
                </div>
            )}

            {last && (
                <Button
                    variant="ghost"
                    className="self-center text-muted-foreground"
                    onClick={() => punch(last.key, null)}
                >
                    <Undo2 data-icon="inline-start" />
                    Ångra {last.label.toLowerCase()} {last.time}
                </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Stat label="Flex">
                    <span className={toneOf(report.flex)}>
                        {formatDuration(report.flex, { sign: true })}
                    </span>
                </Stat>
                <Stat label="Rapporterat i veckan">
                    {formatDuration(
                        weekMinutes(data, settings, passes, today, today)
                    )}
                </Stat>
            </div>
        </div>
    );
}

const STEP = 5;

const offsetText = (minutes: number) =>
    minutes < 0 ? `för ${-minutes} min sedan` : `om ${minutes} min`;

function Status({
    running,
    sinceYesterday,
    last,
    done,
    dayOff,
}: {
    running: string | null;
    sinceYesterday: boolean;
    last: PunchField | undefined;
    done: boolean;
    dayOff: boolean;
}) {
    if (running) {
        return (
            <span className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                <span className="relative flex size-2.5" aria-hidden>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                Pågår sedan {running}
                {sinceYesterday && ' i går'}
            </span>
        );
    }
    if (done) return 'Dagen är slut';
    if (last) return `${last.label} ${last.time}`;
    return dayOff ? 'Ledig dag' : 'Inte startad än';
}

/** Marks a time as the day after the pass started. */
function NextDay() {
    return (
        <span className="ml-1 text-xs text-muted-foreground" title="Nästa dag">
            +1
        </span>
    );
}

/**
 * A pass that has run since yesterday for longer than a day, which is more
 * likely a stop forgotten than worked. It's stopped at the time it really
 * ended, or now if that's right after all.
 */
function Forgotten({
    label,
    start,
    date,
    now,
    stop,
}: {
    label: string;
    start: string | null;
    date: string;
    now: string;
    stop: (time: string) => void;
}) {
    const id = useId();
    const [text, setText] = useState('');
    const time = parseTime(text);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Glömde du stoppa?</CardTitle>
                <CardDescription>
                    Passet har pågått sedan {weekdayName(date)}{' '}
                    {fromIso(date).getDate()}/{fromIso(date).getMonth() + 1}{' '}
                    {start}.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
                <form
                    className="flex items-end gap-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (time) stop(time);
                    }}
                >
                    <Field>
                        <FieldLabel htmlFor={id}>{label}</FieldLabel>
                        <Input
                            id={id}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="17:00"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                        />
                    </Field>
                    <Button type="submit" disabled={!time}>
                        Spara
                    </Button>
                </form>
                <Button variant="outline" onClick={() => stop(now)}>
                    <Square data-icon="inline-start" />
                    Stoppa nu, {now}
                </Button>
            </CardContent>
        </Card>
    );
}

function BigButton({
    edge,
    label,
    hint,
    idle,
    onClick,
}: {
    edge: 'start' | 'end';
    label: string;
    hint: string;
    idle: boolean;
    onClick: () => void;
}) {
    const Icon = edge === 'start' ? Play : Square;
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex min-h-56 w-full flex-col items-center justify-center gap-1 rounded-3xl border px-5 py-6 text-white shadow-sm outline-none transition-transform select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]',
                edge === 'start'
                    ? 'border-emerald-600 bg-linear-160 from-emerald-600 to-emerald-900'
                    : 'border-rose-600 bg-linear-160 from-rose-600 to-rose-900'
            )}
        >
            <span
                className={cn(
                    'mb-2.5 grid size-23 place-items-center rounded-full border-10 border-white/7 bg-white/14',
                    idle && 'animate-breathe'
                )}
            >
                <Icon className="size-10 fill-current" aria-hidden />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
                {label}
            </span>
            <span className="text-sm font-semibold opacity-75">{hint}</span>
        </button>
    );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Card size="sm">
            <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-xl font-semibold">
                    {children}
                </CardTitle>
            </CardHeader>
        </Card>
    );
}
