import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { fromIso, weekdayName } from '@/lib/dates';
import type { Pass } from '@/lib/passes';
import { punchOf } from '@/lib/punch';
import type { Settings } from '@/lib/settings';
import { formatDuration, timeNow } from '@/lib/time';
import type { UserData } from '@/lib/userData';
import { punchNow } from '@/lib/punchNow';
import { cn } from 'cn';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    today: string;
    now: Date;
};

/** Fills in today's next time with the time now, for one click a time. */
export function Punch({ data, settings, passes, today, now }: Props) {
    const { date, clock, next, runningStart, worked, forgotten } = punchOf(
        data,
        settings,
        passes,
        today,
        now
    );
    const time = timeNow(now, settings.punchRound);

    return (
        <Card className="mb-3 bg-muted/50 tabular-nums">
            <CardHeader>
                <CardTitle>
                    {date === today ? 'Idag' : 'I går'}, {weekdayName(date)}{' '}
                    {fromIso(date).getDate()}/{fromIso(date).getMonth() + 1}
                </CardTitle>
                <CardDescription>
                    {formatDuration(worked)} av{' '}
                    {formatDuration(settings.target)}
                    {runningStart && ' · pågår'}
                    {forgotten &&
                        ` sedan ${runningStart}, glömde du stoppa? Fyll i när passet slutade i tabellen.`}
                </CardDescription>
                <CardAction>
                    {next ? (
                        <Button
                            size="lg"
                            className={cn(
                                'text-white',
                                next.edge === 'start'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-rose-600 hover:bg-rose-700'
                            )}
                            onClick={() => punchNow()}
                        >
                            {next.edge === 'start' ? (
                                <Play
                                    data-icon="inline-start"
                                    className="fill-current"
                                />
                            ) : (
                                <Square
                                    data-icon="inline-start"
                                    className="fill-current"
                                />
                            )}
                            {clock
                                ? next.edge === 'start'
                                    ? 'Starta'
                                    : 'Stoppa'
                                : `${next.edge === 'start' ? 'Påbörja' : 'Avsluta'} ${next.label}`}{' '}
                            {time}
                        </Button>
                    ) : (
                        <CardDescription>
                            Allt är ifyllt för idag.
                        </CardDescription>
                    )}
                </CardAction>
            </CardHeader>
        </Card>
    );
}
