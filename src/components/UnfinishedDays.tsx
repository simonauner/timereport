import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { unfinishedDays } from '@/lib/report';
import { weekdayName } from '@/lib/dates';
import type { Pass } from '@/lib/passes';
import type { Settings } from '@/lib/settings';
import type { UserData } from '@/lib/userData';
import { DayTimes } from './DayTimes';

export function UnfinishedDays({
    data,
    settings,
    passes,
    today,
}: {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    today: string;
}) {
    const [open, setOpen] = useState<string | null>(null);
    const days = unfinishedDays(data, settings, passes, today);
    const editing = days.find((day) => day.date === open);
    if (!days.length) return null;
    return (
        <Alert className="mb-4">
            <TriangleAlert />
            <AlertTitle>
                {days.length === 1
                    ? 'En dag har ofullständiga tider'
                    : `${days.length} dagar har ofullständiga tider`}
            </AlertTitle>
            <AlertDescription>
                En start- eller stopptid saknas. Öppna dagen för att rätta den.
            </AlertDescription>
            <div className="col-start-2 mt-2 grid min-w-0 gap-3">
                <div className="flex flex-wrap gap-2">
                    {days.map((day) => (
                        <Button
                            key={day.date}
                            variant="outline"
                            aria-expanded={open === day.date}
                            onClick={() =>
                                setOpen(open === day.date ? null : day.date)
                            }
                        >
                            {weekdayName(day.date)} {day.date}
                        </Button>
                    ))}
                </div>
                {editing && (
                    <DayTimes
                        key={editing.date}
                        data={data}
                        settings={settings}
                        day={{ ...editing, flex: 0 }}
                    />
                )}
            </div>
        </Alert>
    );
}
