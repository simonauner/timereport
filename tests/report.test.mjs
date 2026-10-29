import test from 'node:test';
import assert from 'node:assert/strict';
import { passesOf } from '../src/lib/passes.ts';
import { monthReport, weekMinutes } from '../src/lib/report.ts';
import { settingsOf } from '../src/lib/settings.ts';
import { timeKey } from '../src/lib/userData.ts';

const times = (date, start, end, id = 'a') => ({
    [timeKey(date, id, 'start')]: [start, 1],
    ...(end ? { [timeKey(date, id, 'end')]: [end, 1] } : {}),
});

test('monthly totals exclude old months and years', () => {
    const data = {
        ...times('2025-10-30', '09:00', '17:00'),
        ...times('2026-09-30', '09:00', '17:00'),
        ...times('2026-10-29', '09:00', '11:00'),
    };
    const report = monthReport(
        data,
        settingsOf(data),
        passesOf(data),
        '2026-10',
        '2026-10-30'
    );
    assert.equal(report.reported, 120);
    assert.equal(report.days.length, 22);
    assert.ok(report.days.every((day) => day.date.startsWith('2026-10-')));
});

test('weekly totals cross New Year without including the same week in another year', () => {
    const data = {
        ...times('2025-12-31', '09:00', '17:00'),
        ...times('2026-01-01', '09:00', '11:00'),
        ...times('2025-01-02', '09:00', '19:00'),
    };
    const settings = { ...settingsOf(data), target: 0 };
    assert.equal(
        weekMinutes(data, settings, passesOf(data), '2026-01-01', '2026-01-02'),
        600
    );
    assert.equal(
        monthReport(data, settings, passesOf(data), '2026-01', '2026-01-02')
            .reported,
        120
    );
});
