import { addDays, weekNumber } from '../lib/dates';
import type { Pass } from '../lib/passes';
import { weekMinutes, withVat, type MonthReport } from '../lib/report';
import type { Settings } from '../lib/settings';
import { formatDuration, formatHours, formatKronor } from '../lib/time';
import type { UserData } from '../lib/userData';
import css from './Summary.module.css';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    report: MonthReport;
    today: string;
};

/** The month's totals, the weeks around today and what they invoice. */
export function Summary({ data, settings, passes, report, today }: Props) {
    const { minutes, revenue } = report;
    const lastWeek = addDays(today, -7);
    return (
        <div className={css.cards}>
            <section className={css.card}>
                <h2>Flex</h2>
                <p className={css.big}>
                    {formatDuration(report.flex, { sign: true })}
                </p>
                {settings.carryFlex && (
                    <p className={css.small}>
                        varav {formatDuration(report.flexIn, { sign: true })}{' '}
                        från tidigare månader
                    </p>
                )}
            </section>

            <section className={css.card}>
                <h2>Veckor</h2>
                <dl className={css.list}>
                    <dt>Denna, v. {weekNumber(today)}</dt>
                    <dd>
                        {formatDuration(
                            weekMinutes(data, settings, passes, today)
                        )}
                    </dd>
                    <dt>Förra, v. {weekNumber(lastWeek)}</dt>
                    <dd>
                        {formatDuration(
                            weekMinutes(data, settings, passes, lastWeek)
                        )}
                    </dd>
                </dl>
            </section>

            <section className={css.card}>
                <h2>Månaden</h2>
                <p className={css.big}>
                    {formatDuration(minutes.counted)}{' '}
                    <span className={css.unit}>
                        ({formatHours(minutes.counted)} h)
                    </span>
                </p>
                <p className={css.small}>
                    Mål {formatDuration(minutes.target)} · max{' '}
                    {formatDuration(minutes.max)} · rapporterat{' '}
                    {formatDuration(report.reported)}
                </p>
                {report.overMax && (
                    <p className={css.warn}>
                        ⚠ Prognosen är över max för månaden
                    </p>
                )}
            </section>

            <section className={css.card}>
                <h2>Intäkt</h2>
                {revenue ? (
                    <>
                        <p className={css.big}>
                            {formatKronor(revenue.counted)}{' '}
                            <span className={css.unit}>ex moms</span>
                        </p>
                        <p className={css.small}>
                            {formatKronor(withVat(revenue.counted, settings))}{' '}
                            inkl. moms
                        </p>
                        <dl className={css.list}>
                            <dt>Mål</dt>
                            <dd>
                                {formatKronor(revenue.target)} /{' '}
                                {formatKronor(
                                    withVat(revenue.target, settings)
                                )}
                            </dd>
                            <dt>Max</dt>
                            <dd>
                                {formatKronor(revenue.max)} /{' '}
                                {formatKronor(withVat(revenue.max, settings))}
                            </dd>
                        </dl>
                    </>
                ) : (
                    <p className={css.small}>
                        Lägg till ett timpris under Inställningar.
                    </p>
                )}
            </section>
        </div>
    );
}
