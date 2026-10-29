import { Clock } from 'lucide-react';
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
import { setValue } from '@/lib/userStore';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    today: string;
    now: Date;
};

/** Fills in today's next time with the time now, for one click a time. */
export function Punch({ data, settings, passes, today, now }: Props) {
    const { date, next, runningStart, worked, forgotten } = punchOf(
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
                            onClick={() =>
                                // The time when clicked, not when last drawn.
                                setValue(
                                    next.key,
                                    timeNow(new Date(), settings.punchRound)
                                )
                            }
                        >
                            <Clock data-icon="inline-start" />
                            {next.label} {time}
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
