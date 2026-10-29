import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { fromIso, weekdayName } from '@/lib/dates';
import { needsReport, type DayReport } from '@/lib/report';
import type { Settings } from '@/lib/settings';
import { formatDuration } from '@/lib/time';
import { offKey, type UserData } from '@/lib/userData';
import { setValue } from '@/lib/userStore';
import { DayTimes } from './DayTimes';

export function MobileDay({
    data,
    settings,
    day,
    today,
}: {
    data: UserData;
    settings: Settings;
    day: DayReport;
    today: string;
}) {
    const [open, setOpen] = useState(day.date === today);
    return (
        <Card size="sm" id={`day-${day.date}`} tabIndex={-1}>
            <CardHeader>
                <Button
                    variant="ghost"
                    className="h-auto w-full justify-between whitespace-normal py-2 text-left"
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                >
                    <span>
                        <span className="block font-semibold">
                            {weekdayName(day.date)}{' '}
                            {fromIso(day.date).getDate()}/
                            {fromIso(day.date).getMonth() + 1}
                            {day.date === today && ' · Idag'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {needsReport(day, today)
                                ? 'Saknar rapportering · '
                                : ''}
                            {day.status === 'off' ? 'Ledig · ' : ''}
                            {formatDuration(day.worked)} rapporterat
                        </span>
                    </span>
                    <ChevronDown
                        aria-hidden
                        className={open ? 'rotate-180' : ''}
                    />
                </Button>
            </CardHeader>
            {open && (
                <CardContent className="grid gap-3">
                    <DayTimes data={data} settings={settings} day={day} />
                    <p className="text-sm text-muted-foreground">
                        Mål {formatDuration(day.target)} · flex{' '}
                        {formatDuration(day.flex, { sign: true })}
                    </p>
                    <Button
                        variant={day.status === 'off' ? 'secondary' : 'outline'}
                        aria-pressed={day.status === 'off'}
                        onClick={() =>
                            setValue(
                                offKey(day.date),
                                day.status === 'off' ? null : 1
                            )
                        }
                    >
                        Ledig
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}
