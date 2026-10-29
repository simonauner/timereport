import { useId, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    addMonths,
    monthName,
    monthOf,
    weekdayNames,
    type Month,
} from '@/lib/dates';
import { movePass, newPass, type Pass } from '@/lib/passes';
import { modeIn, type Settings } from '@/lib/settings';
import { switchMode } from '@/lib/slots';
import { formatDuration, parseDuration } from '@/lib/time';
import {
    MAX_LABEL_LENGTH,
    optionKey,
    passKey,
    rateKey,
    type UserData,
} from '@/lib/userData';
import { setValue, setValues } from '@/lib/userStore';
import { CommitInput } from './CommitInput';
import { DangerZone } from './DangerZone';
import { DatePicker } from './DatePicker';
import { RecoveryPanel } from './RecoveryPanel';
import { SyncPanel } from './SyncPanel';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    today: string;
};

const parseNumber = (text: string) => {
    const number = Number(text.trim().replace(/\s/g, '').replace(',', '.'));
    return text.trim() !== '' && Number.isFinite(number) && number >= 0
        ? number
        : null;
};

/** A settings card with a title and, optionally, what it's for. */
export function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="grid gap-4">{children}</CardContent>
        </Card>
    );
}

/** A label, a short field and its unit, side by side. */
function Row({
    label,
    unit,
    children,
}: {
    label: string;
    unit?: string;
    children: (id: string) => ReactNode;
}) {
    const id = useId();
    return (
        <Field orientation="horizontal">
            <FieldLabel htmlFor={id} className="min-w-28">
                {label}
            </FieldLabel>
            {children(id)}
            {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
            )}
        </Field>
    );
}

export function SettingsView({ data, settings, passes, today }: Props) {
    const month = monthOf(today);
    // Passes are kept for as long as they're in use, now or from next month.
    const usesPasses =
        modeIn(settings, month) === 'passes' ||
        modeIn(settings, addMonths(month, 1)) === 'passes';
    const flexId = useId();
    return (
        <div className="grid max-w-2xl gap-4">
            <Section
                title="Arbetstid"
                description="Arbetsdagar och dagar med tider visas. Bara arbetsdagarna har ett mål. Dagar utan tider räknas som målet tills de fylls i. Max är hur mycket som får faktureras, och appen varnar när en dag eller månaden går över."
            >
                <FieldGroup>
                    <Field orientation="horizontal">
                        <FieldLabel className="min-w-28">
                            Arbetsdagar
                        </FieldLabel>
                        <Workdays workdays={settings.workdays} />
                    </Field>
                    <Row label="Mål per dag">
                        {(id) => (
                            <DurationInput
                                id={id}
                                value={settings.target}
                                onCommit={(minutes) =>
                                    setValue(optionKey('target'), minutes)
                                }
                            />
                        )}
                    </Row>
                    <Row label="Max per dag">
                        {(id) => (
                            <DurationInput
                                id={id}
                                value={settings.max}
                                onCommit={(minutes) =>
                                    setValue(optionKey('max'), minutes)
                                }
                            />
                        )}
                    </Row>
                    <Field orientation="horizontal">
                        <Switch
                            id={flexId}
                            checked={settings.carryFlex}
                            onCheckedChange={(checked) =>
                                setValue(
                                    optionKey('carryFlex'),
                                    checked ? 1 : 0
                                )
                            }
                        />
                        <FieldLabel htmlFor={flexId}>
                            Flex följer med till nästa månad
                        </FieldLabel>
                    </Field>
                </FieldGroup>
            </Section>

            <Section
                title="Stämpelklockan"
                description="Stämpla-knappen avrundar till närmsta antal minuter. 1 betyder ingen avrundning."
            >
                <Row label="Avrunda till" unit="min">
                    {(id) => (
                        <CommitInput
                            id={id}
                            className="w-24"
                            inputMode="numeric"
                            value={String(settings.punchRound)}
                            onCommit={(text) => {
                                const minutes = parseNumber(text);
                                if (
                                    minutes !== null &&
                                    Number.isInteger(minutes) &&
                                    minutes >= 1 &&
                                    minutes <= 60
                                ) {
                                    setValue(optionKey('punchRound'), minutes);
                                } else {
                                    return 'Ange ett helt antal minuter mellan 1 och 60.';
                                }
                            }}
                        />
                    )}
                </Row>
            </Section>

            <Section
                title="Timpris"
                description="Ett nytt pris gäller från sitt datum och framåt."
            >
                <Rates settings={settings} today={today} />
                <Row label="Moms" unit="%">
                    {(id) => (
                        <CommitInput
                            id={id}
                            className="w-24"
                            inputMode="decimal"
                            value={String(settings.vat)}
                            onCommit={(text) => {
                                const vat = parseNumber(text);
                                if (vat !== null && vat <= 100) {
                                    setValue(optionKey('vat'), vat);
                                } else {
                                    return 'Ange moms mellan 0 och 100 procent.';
                                }
                            }}
                        />
                    )}
                </Row>
            </Section>

            <Section
                title="Arbetssätt"
                description="Med namngivna pass har varje pass en tid från och en tid till. Med starta och stoppa kan klockan startas och stoppas hur många gånger som helst om dagen. Dagens tid är summan."
            >
                <ModeChoice
                    data={data}
                    settings={settings}
                    passes={passes}
                    month={month}
                />
            </Section>

            {usesPasses && (
                <Section title="Arbetspass">
                    <Passes passes={passes} />
                </Section>
            )}

            <SyncPanel />
            <RecoveryPanel />
            <DangerZone />
        </div>
    );
}

function ModeChoice({
    data,
    settings,
    passes,
    month,
}: {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    month: Month;
}) {
    const next = addMonths(month, 1);
    // A change can wait for next month, which is then what's chosen.
    const chosen = modeIn(settings, next);
    return (
        <>
            <ToggleGroup
                variant="outline"
                spacing={0}
                value={[chosen]}
                onValueChange={([mode]: string[]) => {
                    if (mode === 'passes' || mode === 'clock') {
                        setValues(
                            switchMode(data, passes, month, mode).changes
                        );
                    }
                }}
            >
                {MODES.map(({ mode, label }) => (
                    <ToggleGroupItem
                        key={mode}
                        value={mode}
                        className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                        {label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            {chosen !== modeIn(settings, month) && (
                <p className="text-sm text-muted-foreground">
                    Gäller från och med {monthName(next)}, eftersom{' '}
                    {monthName(month)} har tider som inte hör till något pass.
                </p>
            )}
        </>
    );
}

const MODES = [
    { mode: 'passes', label: 'Namngivna pass' },
    { mode: 'clock', label: 'Starta och stoppa' },
] as const;

function Workdays({ workdays }: { workdays: number }) {
    const days = weekdayNames.filter((_, day) => (workdays >> day) & 1);
    return (
        <ToggleGroup
            multiple
            variant="outline"
            spacing={0}
            value={days}
            onValueChange={(chosen: string[]) => {
                // At least one day, or there would be nothing to report.
                if (chosen.length === 0) return;
                setValue(
                    optionKey('workdays'),
                    weekdayNames.reduce(
                        (bits, name, day) =>
                            chosen.includes(name) ? bits | (1 << day) : bits,
                        0
                    )
                );
            }}
        >
            {weekdayNames.map((name) => (
                <ToggleGroupItem
                    key={name}
                    value={name}
                    className="capitalize aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                    {name}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}

function DurationInput({
    id,
    value,
    onCommit,
}: {
    id: string;
    value: number;
    onCommit: (minutes: number) => void;
}) {
    return (
        <CommitInput
            id={id}
            className="w-24"
            inputMode="decimal"
            value={formatDuration(value)}
            onCommit={(text) => {
                const minutes = parseDuration(text);
                if (minutes === null)
                    return 'Ange 0–24 timmar, till exempel 8 eller 08:00.';
                onCommit(minutes);
            }}
        />
    );
}

function Rates({ settings, today }: { settings: Settings; today: string }) {
    const [from, setFrom] = useState(today);
    const [rate, setRate] = useState('');
    const parsed = parseNumber(rate);
    const fromId = useId();
    const rateId = useId();
    const rateErrorId = useId();
    const invalid = rate.trim() !== '' && parsed === null;

    return (
        <>
            {settings.rates.length > 0 && (
                <ul className="grid gap-2">
                    {settings.rates.map((entry) => (
                        <li
                            key={entry.from}
                            className="flex items-center justify-between gap-2 text-sm"
                        >
                            <span>
                                Från {entry.from}:{' '}
                                <strong>
                                    {entry.rate.toLocaleString('sv-SE')} kr/h
                                </strong>
                            </span>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                    setValue(rateKey(entry.from), null)
                                }
                            >
                                <Trash2 data-icon="inline-start" />
                                Ta bort
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (parsed === null) return;
                    setValue(rateKey(from), parsed);
                    setRate('');
                }}
            >
                <Field className="w-auto">
                    <FieldLabel htmlFor={fromId}>Från</FieldLabel>
                    <DatePicker id={fromId} value={from} onChange={setFrom} />
                </Field>
                <Field className="w-auto">
                    <FieldLabel htmlFor={rateId}>Pris, kr/h</FieldLabel>
                    <Input
                        id={rateId}
                        className="w-28"
                        inputMode="decimal"
                        placeholder="1065"
                        value={rate}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? rateErrorId : undefined}
                        onChange={(event) => setRate(event.target.value)}
                    />
                    {invalid && (
                        <FieldDescription
                            id={rateErrorId}
                            role="alert"
                            className="text-destructive"
                        >
                            Ange ett pris som är 0 eller högre.
                        </FieldDescription>
                    )}
                </Field>
                <Button type="submit" disabled={parsed === null}>
                    {settings.rates.length > 0 ? 'Nytt pris' : 'Lägg till'}
                </Button>
            </form>
        </>
    );
}

function Passes({ passes }: { passes: Pass[] }) {
    return (
        <>
            <ol className="grid gap-2">
                {passes.map((pass, index) => (
                    <li
                        key={pass.id}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <CommitInput
                            className="w-48"
                            maxLength={MAX_LABEL_LENGTH}
                            aria-label="Namn"
                            value={pass.name}
                            onCommit={(text) => {
                                const trimmed = text.trim();
                                if (trimmed) {
                                    setValue(passKey(pass.id, 'name'), trimmed);
                                } else {
                                    return 'Ange ett namn på passet.';
                                }
                            }}
                        />
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="Flytta upp"
                            disabled={index === 0}
                            onClick={() =>
                                setValues(movePass(passes, index, -1))
                            }
                        >
                            <ArrowUp />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="Flytta ner"
                            disabled={index === passes.length - 1}
                            onClick={() =>
                                setValues(movePass(passes, index, 1))
                            }
                        >
                            <ArrowDown />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="destructive"
                            aria-label="Ta bort"
                            disabled={passes.length === 1}
                            onClick={() => setValue(passKey(pass.id, 'off'), 1)}
                        >
                            <Trash2 />
                        </Button>
                    </li>
                ))}
            </ol>
            <Button
                variant="outline"
                className="justify-self-start"
                onClick={() => setValues(newPass(passes))}
            >
                <Plus data-icon="inline-start" />
                Lägg till pass
            </Button>
        </>
    );
}
