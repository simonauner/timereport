import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fieldName, passesOf } from '@/lib/passes';
import type { DayReport } from '@/lib/report';
import { modeIn, type Settings } from '@/lib/settings';
import { monthOf } from '@/lib/dates';
import { newSlotId, slotsOf } from '@/lib/slots';
import { timeKey, type UserData } from '@/lib/userData';
import { setValues } from '@/lib/userStore';
import { TimeInput } from './TimeInput';

/** The same editor on today's card, mobile days and expanded desktop rows. */
export function DayTimes({
    data,
    settings,
    day,
}: {
    data: UserData;
    settings: Settings;
    day: DayReport;
}) {
    const [newId, setNewId] = useState(newSlotId);
    if (day.times.some((time) => time.id === newId)) setNewId(newSlotId());
    const clock = modeIn(settings, monthOf(day.date)) === 'clock';
    const slots = slotsOf(data, settings, passesOf(data), day.date);
    const rows = clock ? [...slots, { id: newId, name: null }] : slots;
    return (
        <div className="grid gap-3">
            <p className="text-xs text-muted-foreground">
                Sparas när du lämnar fältet eller trycker Enter.
            </p>
            {rows.map((slot, index) => (
                <div key={slot.id} className="grid gap-1">
                    <p className="text-sm font-medium">
                        {slot.name ??
                            (slot.id === newId
                                ? 'Nytt pass'
                                : `Pass ${index + 1}`)}
                    </p>
                    <div className="flex flex-wrap items-start gap-2">
                        {(['start', 'end'] as const).map((edge) => (
                            <div key={edge} className="grid gap-1">
                                <span className="text-xs text-muted-foreground">
                                    {edge === 'start' ? 'Från' : 'Till'}
                                </span>
                                <TimeInput
                                    compact={false}
                                    data={data}
                                    day={day}
                                    id={slot.id}
                                    edge={edge}
                                    label={fieldName(
                                        slot.name ?? `Pass ${index + 1}`,
                                        edge
                                    )}
                                    placeholder="--:--"
                                />
                            </div>
                        ))}
                        {clock && slot.id !== newId && (
                            <Button
                                className="mt-5"
                                size="icon"
                                variant="ghost"
                                aria-label={`Ta bort pass ${index + 1}`}
                                onClick={() =>
                                    setValues({
                                        [timeKey(day.date, slot.id, 'start')]:
                                            null,
                                        [timeKey(day.date, slot.id, 'end')]:
                                            null,
                                    })
                                }
                            >
                                <X />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
