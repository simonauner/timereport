import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import { addDays, weekNumber } from '@/lib/dates';
import type { Pass } from '@/lib/passes';
import { weekMinutes, withVat, type MonthReport } from '@/lib/report';
import type { Settings } from '@/lib/settings';
import { formatDuration, formatHours, formatKronor } from '@/lib/time';
import { WARN } from '@/lib/tone';
import type { UserData } from '@/lib/userData';
import { cn } from '@/lib/utils';

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

            <Tile title="Veckor">
                <Rows
                    rows={[
                        [
                            `Denna, v. ${weekNumber(today)}`,
                            formatDuration(
                                weekMinutes(data, settings, passes, today)
                            ),
                        ],
                        [
                            `Förra, v. ${weekNumber(lastWeek)}`,
                            formatDuration(
                                weekMinutes(data, settings, passes, lastWeek)
                            ),
                        ],
                    ]}
                />
            </Tile>

            <Tile title="Månaden">
                <Big>
                    {formatDuration(minutes.counted)}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                        ({formatHours(minutes.counted)} h)
                    </span>
                </Big>
                <CardDescription>
                    Mål {formatDuration(minutes.target)} · max{' '}
                    {formatDuration(minutes.max)} · rapporterat{' '}
                    {formatDuration(report.reported)}
                </CardDescription>
                {report.overMax && (
                    <p
                        className={cn(
                            'mt-1 flex items-center gap-1 text-sm font-medium',
                            WARN
                        )}
                    >
                        <TriangleAlert className="size-4" aria-hidden />
                        Prognosen är över max för månaden
                    </p>
                )}
            </Tile>

            <Tile title="Intäkt">
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
