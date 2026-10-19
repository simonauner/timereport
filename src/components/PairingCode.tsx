import { useEffect, useRef, useState, type FormEvent } from 'react';
import { parsePairingCode } from '../lib/pairingCode';
import {
    approvePairing,
    cancelPairing,
    collectPairing,
    connect,
    startPairing,
    type ApproveResult,
    type Pairing,
} from '../lib/sync';
import { Button } from './Button';
import { Done } from './Done';
import css from './sync.module.css';

const EXAMPLE = 'brave-otter';

/** How often a waiting device asks whether its code has been entered. */
const CHECK_INTERVAL_MS = 3000;

const minutesAndSeconds = (ms: number) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const appAddress = () => `${location.host}${import.meta.env.BASE_URL}`;

const START_PROBLEMS = {
    'too-many': 'För många försök. Vänta en minut och försök igen.',
    held: 'För många koder väntar på ditt nätverk. Avbryt en på en annan enhet, eller vänta upp till tio minuter.',
    busy: 'För många enheter väntar på en kod just nu. Försök igen om några minuter.',
    failed: 'Når inte synkservern.',
    expired: 'Koden har gått ut.',
};

type Offer =
    | { phase: 'idle' | 'loading' | keyof typeof START_PROBLEMS }
    | { phase: 'waiting'; pairing: Pairing };

/**
 * On a device that doesn't sync: shows a pairing code to enter on a device
 * that does, and connects to its list once someone has.
 */
export function CodeOffer() {
    const [offer, setOffer] = useState<Offer>({ phase: 'idle' });
    const [now, setNow] = useState(() => Date.now());
    const pairing = offer.phase === 'waiting' ? offer.pairing : null;
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const start = async () => {
        setOffer({ phase: 'loading' });
        const started = await startPairing();
        // Gone in the meantime, for example because sync was turned on.
        if (!mounted.current) {
            if (typeof started !== 'string') cancelPairing(started);
            return;
        }
        setNow(Date.now());
        setOffer(
            typeof started === 'string'
                ? { phase: started }
                : { phase: 'waiting', pairing: started }
        );
    };

    useEffect(() => {
        if (!pairing) return;
        let live = true;
        let checking = false;
        const check = async () => {
            if (checking) return;
            checking = true;
            try {
                const result = await collectPairing(pairing);
                if (!live) return;
                if (result === 'expired') setOffer({ phase: 'expired' });
                // The panel then shows that sync is on, which unmounts this
                // and forgets the code.
                else if (result !== 'waiting') connect(result.secret);
            } catch {
                // Tried again on the next tick.
            } finally {
                checking = false;
            }
        };
        const tick = () => {
            setNow(Date.now());
            if (Date.now() >= pairing.expiresAt) setOffer({ phase: 'expired' });
        };
        const timer = setInterval(check, CHECK_INTERVAL_MS);
        const clock = setInterval(tick, 1000);
        // Background tabs check less often, so check at once on return.
        document.addEventListener('visibilitychange', check);
        // Effects aren't cleaned up when the page is reloaded or closed.
        const leave = () => cancelPairing(pairing);
        window.addEventListener('pagehide', leave);
        // Leaving cancelled the code, even if the page is then restored.
        const back = (event: PageTransitionEvent) => {
            if (event.persisted) setOffer({ phase: 'expired' });
        };
        window.addEventListener('pageshow', back);
        return () => {
            live = false;
            clearInterval(timer);
            clearInterval(clock);
            document.removeEventListener('visibilitychange', check);
            window.removeEventListener('pagehide', leave);
            window.removeEventListener('pageshow', back);
            // Connected, cancelled or expired: the code isn't needed.
            cancelPairing(pairing);
        };
    }, [pairing]);

    if (offer.phase === 'idle' || offer.phase === 'loading') {
        return (
            <div className={css.reveal}>
                <p>
                    Synkar du redan på en annan enhet? Hämta en kod här och
                    skriv in den där.
                </p>
                <Button onClick={start} disabled={offer.phase === 'loading'}>
                    {offer.phase === 'loading' ? 'Hämtar kod…' : 'Hämta en kod'}
                </Button>
            </div>
        );
    }

    if (offer.phase !== 'waiting') {
        return (
            <div className={css.reveal}>
                <p role="alert">{START_PROBLEMS[offer.phase]}</p>
                <Button onClick={start}>Hämta en ny kod</Button>
            </div>
        );
    }

    return (
        <div className={css.reveal}>
            <p>
                På enheten som synkar, gå till <strong>{appAddress()}</strong>,
                öppna <em>Inställningar</em>, välj <em>Skriv in en kod</em> och
                skriv:
            </p>
            <output className={css.code} aria-label="Kod">
                {offer.pairing.code}
            </output>
            <p className={css.muted} role="status">
                Väntar på att koden ska skrivas in. Den går ut om{' '}
                {minutesAndSeconds(offer.pairing.expiresAt - now)}. Det du har
                fyllt i på den här enheten läggs sedan ihop med resten.
            </p>
            <Button onClick={() => setOffer({ phase: 'idle' })}>Avbryt</Button>
        </div>
    );
}

const MESSAGES: Record<ApproveResult | 'invalid', string> = {
    approved: 'Den andra enheten kopplas om en stund.',
    invalid: `En kod är två ord, som ${EXAMPLE}.`,
    unknown:
        'Ingen enhet väntar med den koden. Kontrollera den, eller hämta en ny på den andra enheten.',
    'too-many': 'För många försök. Vänta en minut och försök igen.',
    failed: 'Når inte synkservern. Försök igen om en stund.',
};

/** On a device that syncs: connects the device showing a pairing code. */
export function CodeForm({ secret }: { secret: string }) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<keyof typeof MESSAGES | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const code = parsePairingCode(input);
        if (!code) {
            setResult('invalid');
            return;
        }
        setBusy(true);
        setResult(null);
        const approved = await approvePairing(secret, code);
        setResult(approved);
        if (approved === 'approved') setInput('');
        setBusy(false);
    };

    return (
        <form className={css.reveal} onSubmit={submit}>
            <label htmlFor="pairing-code">
                På den andra enheten, gå till <strong>{appAddress()}</strong>,
                öppna <em>Inställningar</em> och välj <em>Hämta en kod</em>.
                Skriv sedan in koden här.
            </label>
            <input
                id="pairing-code"
                className={css.field}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={EXAMPLE}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
            />
            <div className={css.buttons}>
                <Button type="submit" variant="tonal" disabled={busy}>
                    {busy ? 'Kopplar…' : 'Koppla'}
                </Button>
                {result === 'approved' && <Done>{MESSAGES[result]}</Done>}
            </div>
            {result && result !== 'approved' && (
                <p role="alert" className={css.problem}>
                    {MESSAGES[result]}
                </p>
            )}
        </form>
    );
}
