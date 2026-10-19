import { useState } from 'react';
import { movePass, newPass, type Pass } from '../lib/passes';
import type { Settings } from '../lib/settings';
import { formatDuration, parseDuration } from '../lib/time';
import { MAX_LABEL_LENGTH, optionKey, passKey, rateKey } from '../lib/userData';
import { setValue, setValues } from '../lib/userStore';
import { Button } from './Button';
import { CommitInput } from './CommitInput';
import css from './SettingsView.module.css';

type Props = { settings: Settings; passes: Pass[]; today: string };

const parseNumber = (text: string) => {
    const number = Number(text.trim().replace(/\s/g, '').replace(',', '.'));
    return text.trim() !== '' && Number.isFinite(number) && number >= 0
        ? number
        : null;
};

export function SettingsView({ settings, passes, today }: Props) {
    return (
        <div className={css.settings}>
            <section className={css.section}>
                <h2>Arbetstid</h2>
                <label className={css.field}>
                    <span>Mål per dag</span>
                    <DurationInput
                        value={settings.target}
                        onCommit={(minutes) =>
                            setValue(optionKey('target'), minutes)
                        }
                    />
                </label>
                <label className={css.field}>
                    <span>Max per dag</span>
                    <DurationInput
                        value={settings.max}
                        onCommit={(minutes) =>
                            setValue(optionKey('max'), minutes)
                        }
                    />
                </label>
                <p className={css.hint}>
                    Dagar utan tider räknas som målet tills de fylls i. Max är
                    hur mycket som får faktureras, och appen varnar när en dag
                    eller månaden går över.
                </p>
                <label className={css.check}>
                    <input
                        type="checkbox"
                        checked={settings.carryFlex}
                        onChange={(event) =>
                            setValue(
                                optionKey('carryFlex'),
                                event.target.checked ? 1 : 0
                            )
                        }
                    />
                    Flex följer med till nästa månad
                </label>
            </section>

            <section className={css.section}>
                <h2>Timpris</h2>
                <Rates settings={settings} today={today} />
                <label className={css.field}>
                    <span>Moms</span>
                    <CommitInput
                        className={css.input}
                        inputMode="decimal"
                        value={String(settings.vat)}
                        onCommit={(text) => {
                            const vat = parseNumber(text);
                            if (vat !== null && vat <= 100) {
                                setValue(optionKey('vat'), vat);
                            }
                        }}
                    />
                    <span>%</span>
                </label>
            </section>

            <section className={css.section}>
                <h2>Kolumner</h2>
                <p className={css.hint}>
                    Varje pass har en start och ett slut, och dagens tid är
                    summan av passen.
                </p>
                <Passes passes={passes} />
            </section>
        </div>
    );
}

function DurationInput({
    value,
    onCommit,
}: {
    value: number;
    onCommit: (minutes: number) => void;
}) {
    return (
        <CommitInput
            className={css.input}
            inputMode="decimal"
            value={formatDuration(value)}
            onCommit={(text) => {
                const minutes = parseDuration(text);
                if (minutes !== null) onCommit(minutes);
            }}
        />
    );
}

function Rates({ settings, today }: { settings: Settings; today: string }) {
    const [from, setFrom] = useState(today);
    const [rate, setRate] = useState('');
    const parsed = parseNumber(rate);

    return (
        <>
            {settings.rates.length > 0 && (
                <ul className={css.rates}>
                    {settings.rates.map((entry) => (
                        <li key={entry.from}>
                            <span>
                                Från {entry.from}:{' '}
                                <strong>
                                    {entry.rate.toLocaleString('sv-SE')} kr/h
                                </strong>
                            </span>
                            <Button
                                size="small"
                                variant="danger"
                                onClick={() =>
                                    setValue(rateKey(entry.from), null)
                                }
                            >
                                Ta bort
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <form
                className={css.row}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (parsed === null || !from) return;
                    setValue(rateKey(from), parsed);
                    setRate('');
                }}
            >
                <label className={css.field}>
                    <span>Från</span>
                    <input
                        type="date"
                        className={css.input}
                        value={from}
                        required
                        onChange={(event) => setFrom(event.target.value)}
                    />
                </label>
                <label className={css.field}>
                    <span>Pris</span>
                    <input
                        className={css.input}
                        inputMode="decimal"
                        placeholder="1065"
                        value={rate}
                        onChange={(event) => setRate(event.target.value)}
                    />
                    <span>kr/h</span>
                </label>
                <Button
                    type="submit"
                    variant="tonal"
                    disabled={parsed === null}
                >
                    {settings.rates.length > 0 ? 'Nytt pris' : 'Lägg till'}
                </Button>
            </form>
            <p className={css.hint}>
                Ett nytt pris gäller från sitt datum och framåt.
            </p>
        </>
    );
}

function Passes({ passes }: { passes: Pass[] }) {
    const label = (pass: Pass, edge: 'start' | 'end') => (
        <CommitInput
            className={css.label}
            maxLength={MAX_LABEL_LENGTH}
            aria-label={edge === 'start' ? 'Start' : 'Slut'}
            value={pass[edge]}
            onCommit={(text) => {
                const trimmed = text.trim();
                if (trimmed) setValue(passKey(pass.id, edge), trimmed);
            }}
        />
    );

    return (
        <>
            <ol className={css.passes}>
                {passes.map((pass, index) => (
                    <li key={pass.id}>
                        {label(pass, 'start')}
                        <span aria-hidden>→</span>
                        {label(pass, 'end')}
                        <Button
                            size="small"
                            aria-label="Flytta upp"
                            disabled={index === 0}
                            onClick={() =>
                                setValues(movePass(passes, index, -1))
                            }
                        >
                            ↑
                        </Button>
                        <Button
                            size="small"
                            aria-label="Flytta ner"
                            disabled={index === passes.length - 1}
                            onClick={() =>
                                setValues(movePass(passes, index, 1))
                            }
                        >
                            ↓
                        </Button>
                        <Button
                            size="small"
                            variant="danger"
                            disabled={passes.length === 1}
                            onClick={() => setValue(passKey(pass.id, 'off'), 1)}
                        >
                            Ta bort
                        </Button>
                    </li>
                ))}
            </ol>
            <Button onClick={() => setValues(newPass(passes))}>
                Lägg till pass
            </Button>
        </>
    );
}
