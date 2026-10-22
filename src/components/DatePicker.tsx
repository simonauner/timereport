import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { sv } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { fromIso, isoDate } from '@/lib/dates';

type Props = {
    id?: string;
    /** "YYYY-MM-DD". */
    value: string;
    onChange: (iso: string) => void;
};

/**
 * A day, shown as "YYYY-MM-DD" with a Swedish calendar to pick from. The
 * browser's own date field follows its language instead, as in "10/1/2026".
 */
export function DatePicker({ id, value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const selected = fromIso(value);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                id={id}
                render={
                    <Button
                        variant="outline"
                        className="w-40 justify-start font-normal tabular-nums"
                    />
                }
            >
                <CalendarIcon data-icon="inline-start" />
                {value}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    locale={sv}
                    selected={selected}
                    defaultMonth={selected}
                    required
                    onSelect={(date) => {
                        onChange(isoDate(date));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
