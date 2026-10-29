import { useEffect, useId, useState } from 'react';
import {
    Copy,
    KeyRound,
    Link2,
    QrCode as QrIcon,
    TriangleAlert,
} from 'lucide-react';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    connect,
    disconnect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import { isSecret } from '@/lib/syncProtocol';
import { clearHash, useHash } from '@/lib/useHash';
import { cn } from 'cn';
import { Done } from './Done';
import { CodeForm, CodeOffer } from './PairingCode';
import { QrCode } from './QrCode';
import { Section } from './SettingsView';

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
        <FieldDescription>
            Senast synkad {ago(time, Math.max(now, time))}
        </FieldDescription>
    );
}

/** Turns sync on and off, and connects other devices. */
export function SyncPanel() {
    const status = useSyncStatus();
    const [shown, setShown] = useState<'qr' | 'code' | null>(null);
    const switchId = useId();
    if (!syncAvailable) return null;
    const syncing = !!status.secret;

    return (
        <Section
            title="Synka dina enheter"
            description="Håll tiderna i synk mellan mobil och dator, utan konto."
        >
            <Field orientation="horizontal">
                <Switch
                    id={switchId}
                    checked={syncing}
                    onCheckedChange={() => {
                        setShown(null);
                        if (syncing) disconnect();
                        else connect();
                    }}
                />
                <div className="grid gap-0.5">
                    <FieldLabel
                        htmlFor={switchId}
                        role="status"
                        className={cn(
                            syncing &&
                                status.phase === 'failed' &&
                                'text-destructive'
                        )}
                    >
                        {syncing ? PHASES[status.phase] : 'Synk är av.'}
                    </FieldLabel>
                    {syncing && status.syncedAt !== null && (
                        <SyncedAt time={status.syncedAt} />
                    )}
                </div>
            </Field>
            {status.secret ? (
                <Connected
                    secret={status.secret}
                    shown={shown}
                    setShown={setShown}
                />
            ) : (
                <>
                    {status.phase === 'deleted' && (
                        <Alert variant="destructive">
                            <TriangleAlert />
                            <AlertDescription>
                                Den synkade datan har raderats, så den här
                                enheten slutade synka. Det som finns här ligger
                                kvar.
                            </AlertDescription>
                        </Alert>
                    )}
                    <p className="text-sm">
                        Slå på synk här och koppla sedan dina andra enheter med
                        en privat länk, en QR-kod eller en kort kod.
                    </p>
                    <CodeOffer />
                </>
            )}
        </Section>
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
            <p className="text-sm">
                Koppla en annan enhet genom att öppna den här privata länken på
                den, skanna QR-koden, eller hämta en kod på den och skriva in
                koden här. Den som har länken kan ändra dina tider, så håll den
                för dig själv.
            </p>
            <LinkField link={syncLink(secret)} />
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={shown === 'qr' ? 'secondary' : 'outline'}
                    aria-pressed={shown === 'qr'}
                    onClick={() => setShown(shown === 'qr' ? null : 'qr')}
                >
                    <QrIcon data-icon="inline-start" />
                    QR-kod
                </Button>
                <Button
                    variant={shown === 'code' ? 'secondary' : 'outline'}
                    aria-pressed={shown === 'code'}
                    onClick={() => setShown(shown === 'code' ? null : 'code')}
                >
                    <KeyRound data-icon="inline-start" />
                    Skriv in en kod
                </Button>
            </div>
            {shown === 'qr' && (
                <div className="grid justify-items-start gap-2">
                    <p className="text-sm">
                        Skanna den med den andra enhetens kamera.
                    </p>
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
    const id = useId();
    return (
        <Field>
            <FieldLabel htmlFor={id}>Privat synklänk</FieldLabel>
            <Input
                id={id}
                readOnly
                value={link}
                className="font-mono"
                onFocus={(event) => event.currentTarget.select()}
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(link);
                            setCopies((n) => n + 1);
                        } catch {
                            // The link is still there to copy by hand.
                        }
                    }}
                >
                    <Copy data-icon="inline-start" />
                    Kopiera länk
                </Button>
                {copies > 0 && <Done key={copies}>Kopierad</Done>}
            </div>
        </Field>
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
            <Alert variant="destructive" className="mb-4">
                <TriangleAlert />
                <AlertTitle>Synklänken fungerar inte</AlertTitle>
                <AlertDescription>
                    Kontrollera att hela länken kom med.
                </AlertDescription>
                <AlertAction>
                    <Button size="sm" variant="outline" onClick={clearHash}>
                        OK
                    </Button>
                </AlertAction>
            </Alert>
        );
    }

    return (
        <Alert className="mb-4">
            <Link2 />
            <AlertTitle>Koppla den här enheten?</AlertTitle>
            <AlertDescription>
                Länken kopplar den här enheten till synkade tider. Det du har
                fyllt i här läggs ihop med dem, och sedan syns ändringar på alla
                kopplade enheter.
                {status.secret &&
                    ' Den här enheten slutar synka med det den synkar med nu.'}
            </AlertDescription>
            <div className="col-start-2 mt-2 flex gap-2">
                <Button onClick={() => connect(secret)}>Koppla</Button>
                <Button variant="outline" onClick={clearHash}>
                    Inte nu
                </Button>
            </div>
        </Alert>
    );
}
