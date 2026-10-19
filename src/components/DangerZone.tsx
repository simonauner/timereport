import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteEverything, forgetThisBrowser } from '@/lib/deleteEverything';
import { useSyncStatus } from '@/lib/sync';
import { Done } from './Done';
import { Section } from './SettingsView';

type Action = 'forget' | 'delete';

/** Forgets this browser, or deletes everything, after asking first. */
export function DangerZone() {
    const status = useSyncStatus();
    const [done, setDone] = useState<Action | null>(null);
    const [failed, setFailed] = useState(false);
    const synced = !!status.secret;

    const run = async (action: Action) => {
        setFailed(false);
        try {
            if (action === 'forget') forgetThisBrowser();
            else await deleteEverything(status.secret);
            setDone(action);
        } catch {
            setFailed(true);
        }
    };

    return (
        <Section title="Radera">
            <Confirm
                label="Glöm den här webbläsaren"
                title="Glömma den här webbläsaren?"
                description={
                    synced
                        ? 'Allt som sparats här tas bort. De synkade tiderna finns kvar på synkservern, så återställningsnyckeln kan hämta tillbaka dem.'
                        : 'Allt som sparats här tas bort. Det går inte att ångra.'
                }
                confirm="Glöm"
                onConfirm={() => run('forget')}
                done={done === 'forget'}
            />
            <Confirm
                label="Radera allt"
                title="Radera allt?"
                description={
                    synced
                        ? 'Allt här och de synkade tiderna på synkservern tas bort, och dina andra enheter slutar synka. Det går inte att ångra.'
                        : 'Allt som sparats här tas bort. Det går inte att ångra.'
                }
                confirm="Radera allt"
                onConfirm={() => run('delete')}
                done={done === 'delete'}
            />
            {failed && (
                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertDescription>
                        Når inte synkservern, så inget raderades. Försök igen om
                        en stund.
                    </AlertDescription>
                </Alert>
            )}
        </Section>
    );
}

function Confirm({
    label,
    title,
    description,
    confirm,
    onConfirm,
    done,
}: {
    label: string;
    title: string;
    description: string;
    confirm: string;
    onConfirm: () => void;
    done: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger
                    render={<Button variant="destructive" disabled={done} />}
                >
                    {label}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={onConfirm}
                        >
                            {confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {done && <Done>Klart.</Done>}
        </div>
    );
}
