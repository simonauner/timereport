import { useState, type ReactNode } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import { addDays, weekNumber } from '@/lib/dates';
import type { Pass } from '@/lib/passes';
import {
    needsReport,
    weekMinutes,
    withVat,
    type MonthReport,
} from '@/lib/report';
import type { Settings } from '@/lib/settings';
import { formatDuration, formatHours, formatKronor } from '@/lib/time';
import { WARN } from '@/lib/tone';
import type { UserData } from '@/lib/userData';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    report: MonthReport;
    today: string;
};

/** The month's totals, the weeks around today and what they invoice. */
export function Summary({ data, settings, passes, report, today }: Props) {
    const { minutes, revenue } = report;
    const lastWeek = addDays(today, -7);
    const missing = report.days.filter((day) => needsReport(day, today));
    return (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile title="Flex">
                <Big>{formatDuration(report.flex, { sign: true })}</Big>
                {settings.carryFlex && (
                    <CardDescription>
                        varav {formatDuration(report.flexIn, { sign: true })}{' '}
                        från tidigare månader
                    </CardDescription>
                )}
            </Tile>

            <Tile title="Rapporterat per vecka">
                <Rows
                    rows={[
                        [
                            `Denna, v. ${weekNumber(today)}`,
                            formatDuration(
                                weekMinutes(
                                    data,
                                    settings,
                                    passes,
                                    today,
                                    today
                                )
                            ),
                        ],
                        [
                            `Förra, v. ${weekNumber(lastWeek)}`,
                            formatDuration(
                                weekMinutes(
                                    data,
                                    settings,
                                    passes,
                                    lastWeek,
                                    today
                                )
                            ),
                        ],
                    ]}
                />
            </Tile>

            <Tile title="Rapporterat denna månad">
                <Big>
                    {formatDuration(report.reported)}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                        ({formatHours(report.reported)} h)
                    </span>
                </Big>
                <CardDescription>
                    Prognos {formatDuration(minutes.counted)} · mål{' '}
                    {formatDuration(minutes.target)} · max{' '}
                    {formatDuration(minutes.max)}
                </CardDescription>
                {missing.length > 0 && (
                    <Button
                        variant="link"
                        className="h-auto justify-start whitespace-normal p-0 text-left"
                        onClick={() => {
                            const cell = document.getElementById(
                                `day-${missing[0].date}`
                            );
                            cell?.querySelector<HTMLButtonElement>(
                                '[aria-expanded="false"]'
                            )?.click();
                            cell?.scrollIntoView({ block: 'center' });
                            cell?.focus({ preventScroll: true });
                        }}
                    >
                        {missing.length}{' '}
                        {missing.length === 1 ? 'dag saknar' : 'dagar saknar'}{' '}
                        rapportering
                    </Button>
                )}
                {report.overMax && <OverMax report={report} />}
            </Tile>

            <Tile title="Intäktsprognos">
                {revenue ? (
                    <>
                        <Big>
                            {formatKronor(revenue.counted)}{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                ex moms
                            </span>
                        </Big>
                        <CardDescription>
                            {formatKronor(withVat(revenue.counted, settings))}{' '}
                            inkl. moms
                        </CardDescription>
                        {report.unpriced > 0 && (
                            <p
                                className={cn(
                                    'mt-1 flex items-center gap-1 text-sm font-medium',
                                    WARN
                                )}
                            >
                                <TriangleAlert
                                    className="size-4 shrink-0"
                                    aria-hidden
                                />
                                {formatDuration(report.unpriced)} saknar timpris
                                och räknas som 0 kr
                            </p>
                        )}
                        <Rows
                            rows={[
                                [
                                    'Mål',
                                    `${formatKronor(revenue.target)} / ${formatKronor(withVat(revenue.target, settings))}`,
                                ],
                                [
                                    'Max',
                                    `${formatKronor(revenue.max)} / ${formatKronor(withVat(revenue.max, settings))}`,
                                ],
                            ]}
                        />
                    </>
                ) : (
                    <CardDescription>
                        Lägg till ett timpris under Inställningar.
                    </CardDescription>
                )}
            </Tile>
        </div>
    );
}

/** The warning, which tells how much is left per day when clicked. */
function OverMax({ report }: { report: MonthReport }) {
    const [open, setOpen] = useState(false);
    const warning = (
        <>
            <TriangleAlert className="size-4" aria-hidden />
            Prognosen är över max för månaden
        </>
    );
    const className = cn(
        'mt-1 flex items-center gap-1 text-left text-sm font-medium',
        WARN
    );
    const perDay = formatDuration(report.maxPerDay);
    return (
        <>
            <button
                type="button"
                className={cn(className, 'cursor-pointer')}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                {warning}
                <ChevronDown
                    className={cn(
                        'size-4 transition-transform',
                        open && 'rotate-180'
                    )}
                    aria-hidden
                />
            </button>
            {open && (
                <CardDescription>
                    {!report.daysLeft
                        ? `Prognosen ligger ${formatDuration(report.minutes.counted - report.minutes.max)} över månadens max. Inga arbetsdagar återstår att rapportera.`
                        : report.daysLeft === 1
                          ? `Du får jobba som mest ${perDay} totalt den återstående arbetsdagen`
                          : `Du får jobba i snitt ${perDay}/dag resten av månaden`}
                </CardDescription>
            )}
        </>
    );
}

function Tile({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card size="sm" className="tabular-nums">
            <CardHeader>
                <CardDescription>{title}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1">{children}</CardContent>
        </Card>
    );
}

const Big = ({ children }: { children: ReactNode }) => (
    <p className="text-2xl font-semibold">{children}</p>
);

function Rows({ rows }: { rows: [string, string][] }) {
    return (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
