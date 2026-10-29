import { useEffect, useState, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { startEditSession, type EditStatus } from '@/lib/editSession';

export function EditSession({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<EditStatus>('waiting');
    useEffect(() => startEditSession(setStatus), []);
    if (status === 'ready') return children;
    return (
        <main className="mx-auto max-w-xl p-4">
            <Alert>
                <AlertTitle>Stämpelklockan</AlertTitle>
                <AlertDescription>
                    {status === 'waiting'
                        ? 'Stämpelklockan är öppen i en annan flik. Stäng den för att fortsätta här.'
                        : 'Den här webbläsaren kan inte öppna rapporterna säkert. Öppna sidan i en webbläsare med stöd för Web Locks.'}
                </AlertDescription>
            </Alert>
        </main>
    );
}
