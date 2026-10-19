import { weekdayName, fromIso } from '../lib/dates';
import type { Pass } from '../lib/passes';
import { dayReport } from '../lib/report';
import type { Settings } from '../lib/settings';
import { formatDuration, timeNow, toMinutes } from '../lib/time';
import { textOf, timeKey, type UserData } from '../lib/userData';
import { setValue } from '../lib/userStore';
import { Button } from './Button';
import css from './Punch.module.css';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    today: string;
    now: Date;
};

/** Fills in today's next time with the time now, for one click a time. */
export function Punch({ data, settings, passes, today, now }: Props) {
    const fields = passes.flatMap((pass) =>
        (['start', 'end'] as const).map((edge) => ({
            key: timeKey(today, pass.id, edge),
            label: pass[edge],
            pass,
            edge,
        }))
    );
    const next = fields.find((field) => !textOf(data, field.key));
    const time = timeNow(now, settings.punchRound);

    // A pass that has started but not ended counts until now.
    const running = passes.find(
        (pass) =>
            textOf(data, timeKey(today, pass.id, 'start')) &&
            !textOf(data, timeKey(today, pass.id, 'end'))
    );
    const runningStart = running
        ? textOf(data, timeKey(today, running.id, 'start'))
        : null;
    const sinceStart = runningStart
        ? Math.max(0, toMinutes(timeNow(now)) - toMinutes(runningStart))
        : 0;
    const worked = dayReport(data, settings, passes, today).worked + sinceStart;

    return (
        <section className={css.punch}>
            <div>
                <h2>
                    Idag, {weekdayName(today)} {fromIso(today).getDate()}/
                    {fromIso(today).getMonth() + 1}
                </h2>
                <p>
                    {formatDuration(worked)} av{' '}
                    {formatDuration(settings.target)}
                    {running && ' · pågår'}
                </p>
            </div>
            {next ? (
                <Button
                    variant="tonal"
                    size="large"
                    onClick={() =>
                        // The time when clicked, not when last drawn.
                        setValue(
                            next.key,
                            timeNow(new Date(), settings.punchRound)
                        )
                    }
                >
                    {next.label} {time}
                </Button>
            ) : (
                <p className={css.done}>Allt är ifyllt för idag.</p>
            )}
        </section>
    );
}
