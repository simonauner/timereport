import { useEffect, useState } from 'react';
import {
    connect,
    disconnect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '../lib/sync';
import { isSecret } from '../lib/syncProtocol';
import { clearHash, useHash } from '../lib/useHash';
import { Button } from './Button';
import { Done } from './Done';
import { CodeForm, CodeOffer } from './PairingCode';
import { QrCode } from './QrCode';
import css from './sync.module.css';

const PHASES: Record<SyncStatus['phase'], string> = {
    idle: 'Synk är på och allt är uppdaterat.',
    syncing: 'Synk är på. Synkar…',
    failed: 'Når inte synkservern. Ändringarna finns kvar här och synkas när den svarar igen.',
    deleted: 'Den synkade datan har raderats.',
};

/** How long ago `time` was, as in "Senast synkad för 5 minuter sedan". */
function ago(time: number, now: number) {
    const minutes = Math.floor((now - time) / 60_000);
    if (minutes < 1) return 'nyss';
    if (minutes < 60) return `för ${minutes} min sedan`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `för ${hours} h sedan`;
    return new Date(time).toLocaleString('sv-SE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function SyncedAt({ time }: { time: number }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => clearInterval(interval);
    }, []);
    return (
        <p className={css.muted}>
            Senast synkad {ago(time, Math.max(now, time))}
        </p>
    );
}

/** Turns sync on and off, and connects other devices. */
export function SyncPanel() {
    const status = useSyncStatus();
    const [shown, setShown] = useState<'qr' | 'code' | null>(null);
    if (!syncAvailable) return null;
    const syncing = !!status.secret;

    return (
        <section className={css.panel}>
            <h2>Synka dina enheter</h2>
            <div className={css.toggle}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={syncing}
                    aria-label="Synka den här enheten"
                    className={css.switch}
                    onClick={() => {
                        setShown(null);
                        if (syncing) disconnect();
                        else connect();
                    }}
                />
                <div>
                    <p
                        role="status"
                        data-phase={syncing ? status.phase : 'off'}
                        className={css.phase}
                    >
                        {syncing ? PHASES[status.phase] : 'Synk är av.'}
                    </p>
                    {syncing && status.syncedAt !== null && (
                        <SyncedAt time={status.syncedAt} />
                    )}
                </div>
            </div>
            {status.secret ? (
                <Connected
                    secret={status.secret}
                    shown={shown}
                    setShown={setShown}
                />
            ) : (
                <>
                    {status.phase === 'deleted' && (
                        <p className={css.problem} role="status">
                            Den synkade datan har raderats, så den här enheten
                            slutade synka. Det som finns här ligger kvar.
                        </p>
                    )}
                    <p>
                        Håll tiderna i synk mellan mobil och dator, utan konto.
                        Slå på synk här och koppla sedan dina andra enheter med
                        en privat länk, en QR-kod eller en kort kod.
                    </p>
                    <CodeOffer />
                </>
            )}
        </section>
    );
}

function Connected({
    secret,
    shown,
    setShown,
}: {
    secret: string;
    shown: 'qr' | 'code' | null;
    setShown: (shown: 'qr' | 'code' | null) => void;
}) {
    return (
        <>
            <p>
                Koppla en annan enhet genom att öppna den här privata länken på
                den, skanna QR-koden, eller hämta en kod på den och skriva in
                koden här. Den som har länken kan ändra dina tider, så håll den
                för dig själv.
            </p>
            <LinkField link={syncLink(secret)} />
            <div className={css.buttons}>
                <Button
                    aria-pressed={shown === 'qr'}
                    onClick={() => setShown(shown === 'qr' ? null : 'qr')}
                >
                    QR-kod
                </Button>
                <Button
                    aria-pressed={shown === 'code'}
                    onClick={() => setShown(shown === 'code' ? null : 'code')}
                >
                    Skriv in en kod
                </Button>
            </div>
            {shown === 'qr' && (
                <div className={css.reveal}>
                    <p>Skanna den med den andra enhetens kamera.</p>
                    <QrCode
                        value={syncLink(secret)}
                        label="QR-kod för den privata synklänken"
                    />
                </div>
            )}
            {shown === 'code' && <CodeForm secret={secret} />}
        </>
    );
}

/** A link to copy, on its own line above its button. */
function LinkField({ link }: { link: string }) {
    const [copies, setCopies] = useState(0);
    return (
        <>
            <input
                className={css.field}
                readOnly
                value={link}
                aria-label="Privat synklänk"
                onFocus={(event) => event.currentTarget.select()}
            />
            <div className={css.buttons}>
                <Button
                    variant="tonal"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(link);
                            setCopies((n) => n + 1);
                        } catch {
                            // The link is still there to copy by hand.
                        }
                    }}
                >
                    Kopiera länk
                </Button>
                {copies > 0 && <Done key={copies}>Kopierad</Done>}
            </div>
        </>
    );
}

const SYNC_PREFIX = 'sync=';

/** Shown when a sync link from another device is opened. */
export function ConnectPrompt() {
    const hash = useHash();
    const status = useSyncStatus();
    const secret = hash.startsWith(SYNC_PREFIX)
        ? hash.slice(SYNC_PREFIX.length)
        : null;
    const alreadyConnected = secret !== null && status.secret === secret;

    // Keeps the secret out of the address bar once it has done its job.
    useEffect(() => {
        if (alreadyConnected) clearHash();
    }, [alreadyConnected]);

    if (!syncAvailable || secret === null || alreadyConnected) return null;

    if (!isSecret(secret)) {
        return (
            <section className={`${css.panel} ${css.prompt}`}>
                <h2>Synklänken fungerar inte</h2>
                <p>Kontrollera att hela länken kom med.</p>
                <Button onClick={clearHash}>OK</Button>
            </section>
        );
    }

    return (
        <section className={`${css.panel} ${css.prompt}`}>
            <h2>Koppla den här enheten?</h2>
            <p>
                Länken kopplar den här enheten till synkade tider. Det du har
                fyllt i här läggs ihop med dem, och sedan syns ändringar på alla
                kopplade enheter.
                {status.secret &&
                    ' Den här enheten slutar synka med det den synkar med nu.'}
            </p>
            <div className={css.buttons}>
                <Button variant="tonal" onClick={() => connect(secret)}>
                    Koppla
                </Button>
                <Button onClick={clearHash}>Inte nu</Button>
            </div>
        </section>
    );
}
