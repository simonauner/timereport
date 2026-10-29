import { useId, useState, type FormEvent } from 'react';
import { Copy, Mail } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { recoveryKey, secretFromInput } from '@/lib/recoveryKey';
import {
    connect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import { Done } from './Done';
import { Section } from './SettingsView';

/** Opens the user's mail app with the key, addressed to nobody yet. */
function mailLink(secret: string) {
    const body = [
        `Din återställningsnyckel för Stämpelklockan: ${recoveryKey(secret)}`,
        '',
        'Öppna den här länken för att få tillbaka dina tider i en annan webbläsare:',
        syncLink(secret),
        '',
        `Eller gå till ${location.host}${import.meta.env.BASE_URL}, öppna Inställningar och skriv in nyckeln.`,
        '',
        'Den som har nyckeln eller länken kan se och ändra dina tider, så håll dem för dig själv.',
    ].join('\n');
    return `mailto:?subject=${encodeURIComponent(
        'Din återställningsnyckel för Stämpelklockan'
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
        <Section
            title="Återställningsnyckel"
            description="Ger dig tillbaka dina tider i en annan webbläsare, eller i den här om den glömmer dem."
        >
            {status.secret ? (
                <KeyShown secret={status.secret} />
            ) : (
                <>
                    <p className="text-sm">
                        Att skapa en nyckel slår på synk, som sparar en kopia på
                        synkservern.
                    </p>
                    <Button
                        variant="outline"
                        className="justify-self-start"
                        onClick={() => connect()}
                    >
                        Skapa en återställningsnyckel
                    </Button>
                </>
            )}
            <KeyForm status={status} />
        </Section>
    );
}

function KeyShown({ secret }: { secret: string }) {
    const key = recoveryKey(secret);
    const [copies, setCopies] = useState(0);

    return (
        <>
            <p className="text-sm">
                Skriv ner den eller mejla den till dig själv, och behandla den
                som ett lösenord: den som har den kan se och ändra dina tider.
            </p>
            <output className="rounded-lg border border-dashed px-3 py-2 font-mono text-lg font-semibold tracking-wide select-all">
                {key}
            </output>
            <div className="flex flex-wrap items-center gap-2">
                <a
                    className={buttonVariants({ variant: 'outline' })}
                    href={mailLink(secret)}
                >
                    <Mail data-icon="inline-start" />
                    Mejla den till mig
                </a>
                <Button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(key);
                            setCopies((n) => n + 1);
                        } catch {
                            // The key is still there to copy by hand.
                        }
                    }}
                >
                    <Copy data-icon="inline-start" />
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
    const id = useId();

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
        <form onSubmit={submit}>
            <Field data-invalid={!!message && !good}>
                <FieldLabel htmlFor={id}>
                    Har du en nyckel sedan tidigare?
                </FieldLabel>
                <FieldDescription>
                    Skriv in den för att få tillbaka dina tider här.
                    {status.secret &&
                        ' Den här webbläsaren slutar då synka med det den synkar med nu, så spara den nuvarande nyckeln först.'}
                </FieldDescription>
                <Input
                    id={id}
                    className="font-mono"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="XXXX-XXXX-…"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    aria-invalid={!!message && !good}
                />
                {message && !good && (
                    <FieldDescription role="alert" className="text-destructive">
                        {message}
                    </FieldDescription>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={busy || !input.trim()}>
                        {busy ? 'Återställer…' : 'Återställ'}
                    </Button>
                    {good && <Done>{message}</Done>}
                </div>
            </Field>
        </form>
    );
}
