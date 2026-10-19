import { useState, type FormEvent } from 'react';
import { recoveryKey, secretFromInput } from '../lib/recoveryKey';
import {
    connect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '../lib/sync';
import { Button } from './Button';
import { Done } from './Done';
import css from './sync.module.css';

/** Opens the user's mail app with the key, addressed to nobody yet. */
function mailLink(secret: string) {
    const body = [
        `Din återställningsnyckel för Tidrapport: ${recoveryKey(secret)}`,
        '',
        'Öppna den här länken för att få tillbaka dina tider i en annan webbläsare:',
        syncLink(secret),
        '',
        `Eller gå till ${location.host}${import.meta.env.BASE_URL}, öppna Inställningar och skriv in nyckeln.`,
        '',
        'Den som har nyckeln eller länken kan se och ändra dina tider, så håll dem för dig själv.',
    ].join('\n');
    return `mailto:?subject=${encodeURIComponent(
        'Din återställningsnyckel för Tidrapport'
    )}&body=${encodeURIComponent(body)}`;
}

/**
 * A synced list's secret as a recovery key, to write down or email, and a
 * form that brings a list back from one.
 */
export function RecoveryPanel() {
    const status = useSyncStatus();
    if (!syncAvailable) return null;

    return (
        <section className={css.panel}>
            <h2>Återställningsnyckel</h2>
            {status.secret ? (
                <KeyShown secret={status.secret} />
            ) : (
                <>
                    <p>
                        En återställningsnyckel ger dig tillbaka dina tider i en
                        annan webbläsare, eller i den här om den glömmer dem.
                        Att skapa en slår på synk, som sparar en kopia på
                        synkservern.
                    </p>
                    <Button className={css.alone} onClick={() => connect()}>
                        Skapa en återställningsnyckel
                    </Button>
                </>
            )}
            <KeyForm status={status} />
        </section>
    );
}

function KeyShown({ secret }: { secret: string }) {
    const key = recoveryKey(secret);
    const [copies, setCopies] = useState(0);

    return (
        <>
            <p>
                Nyckeln ger dig tillbaka dina tider i en annan webbläsare, eller
                i den här om den glömmer dem. Skriv ner den eller mejla den till
                dig själv, och behandla den som ett lösenord.
            </p>
            <output className={css.code}>{key}</output>
            <div className={css.buttons}>
                <a className={css.linkButton} href={mailLink(secret)}>
                    Mejla den till mig
                </a>
                <Button
                    variant="tonal"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(key);
                            setCopies((n) => n + 1);
                        } catch {
                            // The key is still there to copy by hand.
                        }
                    }}
                >
                    Kopiera nyckel
                </Button>
                {copies > 0 && <Done key={copies}>Kopierad</Done>}
            </div>
        </>
    );
}

type Result = 'invalid' | 'same' | 'restored';

function KeyForm({ status }: { status: SyncStatus }) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const secret = secretFromInput(input);
        if (!secret || secret === status.secret) {
            setResult(secret ? 'same' : 'invalid');
            return;
        }
        setBusy(true);
        setResult(null);
        await connect(secret);
        setInput('');
        setResult('restored');
        setBusy(false);
    };

    // How restoring went shows in the sync status, which stays up to date.
    const message =
        result === 'invalid'
            ? 'Det är ingen återställningsnyckel. Kontrollera stavningen.'
            : result === 'same'
              ? 'Den här webbläsaren använder redan den nyckeln.'
              : result === 'restored' && status.phase === 'deleted'
                ? 'Tiderna för den nyckeln har raderats.'
                : result === 'restored' && status.phase === 'failed'
                  ? 'Når inte synkservern. Tiderna kommer tillbaka hit när den svarar.'
                  : result === 'restored'
                    ? 'Tiderna är tillbaka i den här webbläsaren.'
                    : null;
    const good =
        result === 'restored' &&
        status.phase !== 'deleted' &&
        status.phase !== 'failed';

    return (
        <form className={css.reveal} onSubmit={submit}>
            <label htmlFor="recovery-key">
                Har du en återställningsnyckel sedan tidigare? Skriv in den för
                att få tillbaka dina tider här.
                {status.secret &&
                    ' Den här webbläsaren slutar då synka med det den synkar med nu, så spara den nuvarande nyckeln först.'}
            </label>
            <input
                id="recovery-key"
                className={css.field}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="XXXX-XXXX-…"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
            />
            <div className={css.buttons}>
                <Button
                    type="submit"
                    variant="tonal"
                    disabled={busy || !input.trim()}
                >
                    {busy ? 'Återställer…' : 'Återställ'}
                </Button>
                {good && <Done>{message}</Done>}
            </div>
            {message && !good && (
                <p role="alert" className={css.problem}>
                    {message}
                </p>
            )}
        </form>
    );
}
