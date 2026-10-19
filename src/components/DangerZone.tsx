import { useState } from 'react';
import { deleteEverything, forgetThisBrowser } from '../lib/deleteEverything';
import { useSyncStatus } from '../lib/sync';
import { Button } from './Button';
import { Done } from './Done';
import css from './sync.module.css';

type Asking = 'forget' | 'delete' | null;

/** Forgets this browser, or deletes everything, after asking first. */
export function DangerZone() {
    const status = useSyncStatus();
    const [asking, setAsking] = useState<Asking>(null);
    const [done, setDone] = useState<Asking>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async (action: 'forget' | 'delete') => {
        setBusy(true);
        setFailed(false);
        try {
            if (action === 'forget') forgetThisBrowser();
            else await deleteEverything(status.secret);
            setDone(action);
        } catch {
            setFailed(true);
        }
        setBusy(false);
    };

    const confirm = (action: 'forget' | 'delete', label: string) => (
        <div className={css.buttons}>
            <Button
                disabled={busy || done === action}
                onClick={() => setAsking(null)}
            >
                Avbryt
            </Button>
            <Button
                variant="danger-filled"
                disabled={busy || done === action}
                onClick={() => run(action)}
            >
                {label}
            </Button>
            {done === action && <Done>Klart.</Done>}
        </div>
    );

    return (
        <section className={css.panel}>
            <h2>Radera</h2>
            <p>
                <strong>Glöm den här webbläsaren</strong> tar bort allt som
                sparats här.
                {status.secret &&
                    ' De synkade tiderna finns kvar på synkservern, så återställningsnyckeln kan hämta tillbaka dem.'}
            </p>
            {asking === 'forget' ? (
                confirm('forget', 'Glöm')
            ) : (
                <Button
                    className={css.alone}
                    variant="danger"
                    onClick={() => {
                        setDone(null);
                        setAsking('forget');
                    }}
                >
                    Glöm den här webbläsaren
                </Button>
            )}
            <p>
                <strong>Radera allt</strong> tar bort allt här
                {status.secret && ' och de synkade tiderna på synkservern'}. Det
                går inte att ångra.
            </p>
            {asking === 'delete' ? (
                confirm('delete', 'Radera allt')
            ) : (
                <Button
                    className={css.alone}
                    variant="danger"
                    onClick={() => {
                        setDone(null);
                        setAsking('delete');
                    }}
                >
                    Radera allt
                </Button>
            )}
            {failed && (
                <p role="alert" className={css.problem}>
                    Når inte synkservern, så inget raderades. Försök igen om en
                    stund.
                </p>
            )}
        </section>
    );
}
