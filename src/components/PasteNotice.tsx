import { ClipboardPaste, X } from 'lucide-react';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Pasted } from '@/lib/usePasteTimes';

const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

/** What a paste did, with a way to undo it. */
export function PasteNotice({
    pasted,
    undo,
    dismiss,
}: {
    pasted: Pasted;
    undo: () => void;
    dismiss: () => void;
}) {
    const { result, undone } = pasted;
    const changed = Object.keys(result.changes).length;
    return (
        <Alert className="mb-3">
            <ClipboardPaste />
            <AlertTitle>
                {undone
                    ? 'Inklistringen är ångrad.'
                    : changed === 0
                      ? 'Inget att klistra in.'
                      : `Klistrade in ${plural(result.times, 'tid', 'tider')} på ${plural(result.days.length, 'dag', 'dagar')}.`}
            </AlertTitle>
            {!undone && (
                <AlertDescription>
                    {result.invalid > 0 && (
                        <p>
                            {plural(result.invalid, 'cell', 'celler')} var inga
                            tider och hoppades över.
                        </p>
                    )}
                    {result.unknownColumns.length > 0 && (
                        <p>
                            Kolumnerna {result.unknownColumns.join(', ')} finns
                            inte bland dina pass och kom inte med. Lägg till dem
                            under Inställningar → Kolumner och klistra in igen.
                        </p>
                    )}
                    {changed > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={undo}
                        >
                            Ångra
                        </Button>
                    )}
                </AlertDescription>
            )}
            <AlertAction>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Stäng"
                    onClick={dismiss}
                >
                    <X />
                </Button>
            </AlertAction>
        </Alert>
    );
}
