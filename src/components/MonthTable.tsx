import { Fragment, type KeyboardEvent } from 'react';
import { fromIso, weekdayName } from '../lib/dates';
import type { Pass } from '../lib/passes';
import type { DayReport, MonthReport } from '../lib/report';
import type { Settings } from '../lib/settings';
import { formatDuration, parseTime } from '../lib/time';
import { offKey, textOf, timeKey, type UserData } from '../lib/userData';
import { setValue } from '../lib/userStore';
import { Button } from './Button';
import { CommitInput } from './CommitInput';
import css from './MonthTable.module.css';

type Props = {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    report: MonthReport;
    today: string;
};

/** Enter moves on to the next time, like in a spreadsheet. */
function focusNext(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[data-time]'),
    ];
    inputs[inputs.indexOf(event.currentTarget) + 1]?.focus();
}

export function MonthTable({ data, settings, passes, report, today }: Props) {
    const columns = 5 + passes.length * 2;
    return (
        <div className={css.scroller}>
            <table className={css.table}>
                <thead>
                    <tr>
                        <th className={css.day}>Dag</th>
                        {passes.map((pass) => (
                            <Fragment key={pass.id}>
                                <th>{pass.start}</th>
                                <th>{pass.end}</th>
                            </Fragment>
                        ))}
                        <th className={css.number}>Summa</th>
                        <th className={css.number}>Diff</th>
                        <th className={css.number}>Flex</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {report.days.map((day, index) => {
                        const next = report.days[index + 1];
                        return (
                            <Fragment key={day.date}>
                                <DayRow
                                    data={data}
                                    settings={settings}
                                    passes={passes}
                                    day={day}
                                    today={today}
                                />
                                {next?.week !== day.week && (
                                    <WeekRow
                                        week={day.week}
                                        days={report.days.filter(
                                            (other) => other.week === day.week
                                        )}
                                        columns={columns}
                                    />
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function DayRow({
    data,
    settings,
    passes,
    day,
    today,
}: {
    data: UserData;
    settings: Settings;
    passes: Pass[];
    day: DayReport;
    today: string;
}) {
    const off = day.status === 'off';
    const missing = day.status === 'open' && day.date < today;
    const rowClass = [css.row, day.date === today && css.today, off && css.off]
        .filter(Boolean)
        .join(' ');

    return (
        <tr className={rowClass}>
            <th scope="row" className={css.day}>
                <span className={day.holiday ? css.holiday : undefined}>
                    {weekdayName(day.date)} {fromIso(day.date).getDate()}
                </span>
                {day.holiday && <span className={css.note}>{day.holiday}</span>}
            </th>
            {passes.map((pass) => (
                <Fragment key={pass.id}>
                    {(['start', 'end'] as const).map((edge) => {
                        const key = timeKey(day.date, pass.id, edge);
                        return (
                            <td key={edge}>
                                <CommitInput
                                    data-time
                                    className={css.time}
                                    inputMode="decimal"
                                    autoComplete="off"
                                    aria-label={`${pass[edge]} ${day.date}`}
                                    aria-invalid={day.invalid.includes(pass.id)}
                                    value={textOf(data, key) ?? ''}
                                    onCommit={(text) => {
                                        if (text.trim() === '') {
                                            setValue(key, null);
                                        } else {
                                            const time = parseTime(text);
                                            if (time) setValue(key, time);
                                        }
                                    }}
                                    onKeyDown={focusNext}
                                />
                            </td>
                        );
                    })}
                </Fragment>
            ))}
            <td
                className={[
                    css.number,
                    day.status === 'forecast' && css.forecast,
                    day.overMax && css.warn,
                ]
                    .filter(Boolean)
                    .join(' ')}
                title={
                    day.overMax
                        ? `Över max ${formatDuration(settings.max)} per dag`
                        : day.status === 'forecast'
                          ? 'Prognos: målet tills tiderna är ifyllda'
                          : undefined
                }
            >
                {off && day.worked === 0
                    ? '–'
                    : formatDuration(
                          day.status === 'open' ? day.worked : day.counted
                      )}
                {day.overMax && ' ⚠'}
                {missing && <span className={css.warnNote}>Saknar tid</span>}
                {day.status === 'open' && !missing && (
                    <span className={css.note}>pågår</span>
                )}
            </td>
            <td className={[css.number, diffClass(day.diff)].join(' ')}>
                {day.status === 'reported' || (off && day.worked > 0)
                    ? formatDuration(day.diff, { sign: true })
                    : ''}
            </td>
            <td className={[css.number, diffClass(day.flex)].join(' ')}>
                {formatDuration(day.flex, { sign: true })}
            </td>
            <td>
                <Button
                    size="small"
                    aria-pressed={off}
                    onClick={() => setValue(offKey(day.date), off ? null : 1)}
                >
                    Ledig
                </Button>
            </td>
        </tr>
    );
}

function WeekRow({
    week,
    days,
    columns,
}: {
    week: number;
    days: DayReport[];
    columns: number;
}) {
    const total = days.reduce((sum, day) => sum + day.counted, 0);
    return (
        <tr className={css.week}>
            <td colSpan={columns}>
                Vecka {week}: <strong>{formatDuration(total)}</strong>
            </td>
        </tr>
    );
}

const diffClass = (minutes: number) =>
    minutes > 0 ? css.up : minutes < 0 ? css.down : '';
