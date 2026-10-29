import test from 'node:test';
import assert from 'node:assert/strict';
import { passesOf } from '../src/lib/passes.ts';
import {
    dayReport,
    monthReport,
    needsReport,
    unfinishedDays,
    weekMinutes,
} from '../src/lib/report.ts';
import { settingsOf } from '../src/lib/settings.ts';
import { offKey, timeKey } from '../src/lib/userData.ts';

const times = (date, start, end, id = 'a') => ({
    [timeKey(date, id, 'start')]: [start, 1],
    ...(end ? { [timeKey(date, id, 'end')]: [end, 1] } : {}),
});

for (const mode of ['passes', 'clock']) {
    test(`Saturday work counts in hours, income and carried flex (${mode})`, () => {
        const data = {
            ...times('2026-10-31', '09:00', '12:00'),
            'r:2026-01-01': [1000, 1],
            'o:carryFlex': [1, 1],
            'm:2026-10': [mode, 1],
        };
        const settings = settingsOf(data),
            passes = passesOf(data);
        const baseline = monthReport(
            {},
            settings,
            passes,
            '2026-10',
            '2026-11-02'
        );
        const report = monthReport(
            data,
            settings,
            passes,
            '2026-10',
            '2026-11-02'
        );
        const saturday = report.days.find((day) => day.date === '2026-10-31');
        assert.equal(saturday.worked, 180);
        assert.equal(saturday.target, 0);
        assert.equal(report.reported, 180);
        assert.equal(report.minutes.counted, baseline.minutes.counted + 180);
        assert.equal(report.minutes.target, baseline.minutes.target);
        assert.equal(report.minutes.max, baseline.minutes.max);
        assert.equal(report.daysLeft, baseline.daysLeft);
        assert.equal(report.revenue.counted, baseline.revenue.counted + 3000);
        assert.equal(report.flex, 180);
        assert.equal(
            weekMinutes(data, settings, passes, '2026-10-31', '2026-11-02'),
            weekMinutes({}, settings, passes, '2026-10-31', '2026-11-02') + 180
        );
        assert.equal(
            monthReport(data, settings, passes, '2026-11', '2026-11-02').flexIn,
            report.flex
        );
    });

    test(`non-workdays stay editable with incomplete or zero-length times (${mode})`, () => {
        for (const [start, end] of [
            ['09:00', null],
            [null, '12:00'],
            ['09:00', '09:00'],
            [null, null],
        ]) {
            const data = {
                ...times('2026-10-31', start, end),
                'm:2026-10': [mode, 1],
            };
            const report = monthReport(
                data,
                settingsOf(data),
                passesOf(data),
                '2026-10',
                '2026-11-02'
            );
            assert.equal(
                report.days.some((day) => day.date === '2026-10-31'),
                start !== null || end !== null
            );
        }
    });
}

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

test('a day off can be restored without losing its hours or target', () => {
    const data = times('2026-10-29', '09:00', '12:00');
    const settings = settingsOf(data),
        passes = passesOf(data);
    const before = dayReport(
        data,
        settings,
        passes,
        '2026-10-29',
        '2026-10-30'
    );
    data[offKey('2026-10-29')] = [1, 2];
    const off = dayReport(data, settings, passes, '2026-10-29', '2026-10-30');
    assert.equal(off.status, 'off');
    assert.equal(off.target, 0);
    assert.equal(off.worked, before.worked);
    data[offKey('2026-10-29')] = [null, 3];
    assert.deepEqual(
        dayReport(data, settings, passes, '2026-10-29', '2026-10-30'),
        before
    );
});

test('starting an unfinished pass does not reduce the monthly forecast', () => {
    const empty = {},
        open = times('2026-10-29', '09:00');
    const settings = settingsOf(empty),
        passes = passesOf(empty);
    const before = monthReport(
        empty,
        settings,
        passes,
        '2026-10',
        '2026-10-29'
    );
    const after = monthReport(open, settings, passes, '2026-10', '2026-10-29');
    assert.deepEqual(after.minutes, before.minutes);
    assert.equal(
        dayReport(open, settings, passes, '2026-10-29', '2026-10-29').status,
        'open'
    );
    const zero = times('2026-10-28', '09:00', '09:00');
    const finished = dayReport(
        zero,
        settings,
        passes,
        '2026-10-28',
        '2026-10-29'
    );
    assert.equal(finished.status, 'reported');
    assert.equal(finished.counted, 0);
});

test('the maximum warning follows actual projected hours rather than the target', () => {
    const data = times('2026-10-01', '08:00', '18:00');
    const settings = { ...settingsOf(data), target: 480, max: 480 };
    const report = monthReport(
        data,
        settings,
        passesOf(data),
        '2026-10',
        '2026-10-29'
    );
    assert.equal(report.minutes.counted, 178 * 60);
    assert.equal(report.minutes.max, 176 * 60);
    assert.equal(report.overMax, true);
    assert.equal(report.days[0].overMax, true);
    data[timeKey('2026-10-01', 'a', 'end')] = ['16:00', 2];
    const withinMax = monthReport(
        data,
        settings,
        passesOf(data),
        '2026-10',
        '2026-10-29'
    );
    assert.equal(withinMax.minutes.counted, withinMax.minutes.max);
    assert.equal(withinMax.overMax, false);
});

test('reported weekly hours exclude forecasts and missing days are explicit', () => {
    const data = times('2026-10-26', '09:00', '12:00');
    const settings = settingsOf(data),
        passes = passesOf(data);
    const report = monthReport(data, settings, passes, '2026-10', '2026-10-29');
    assert.equal(
        weekMinutes(data, settings, passes, '2026-10-29', '2026-10-29'),
        180
    );
    assert.ok(report.minutes.counted > report.reported);
    const missing = report.days.filter((day) => needsReport(day, '2026-10-29'));
    assert.ok(missing.some((day) => day.date === '2026-10-27'));
    assert.ok(
        !missing.some(
            (day) => day.date >= '2026-10-29' || day.date === '2026-10-26'
        )
    );
    const off = { ...data, [offKey('2026-10-27')]: [1, 2] };
    assert.equal(
        needsReport(
            {
                ...dayReport(off, settings, passes, '2026-10-27', '2026-10-29'),
                flex: 0,
            },
            '2026-10-29'
        ),
        false
    );
});

test('showing empty non-workdays makes them editable without changing totals', () => {
    const data = {},
        settings = settingsOf(data),
        passes = passesOf(data);
    const normal = monthReport(data, settings, passes, '2026-10', '2026-10-31');
    const all = monthReport(
        data,
        settings,
        passes,
        '2026-10',
        '2026-10-31',
        true
    );
    assert.equal(all.days.length, 31);
    assert.equal(all.days.find((day) => day.date === '2026-10-31').target, 0);
    assert.deepEqual(all.minutes, normal.minutes);
    assert.equal(all.flex, normal.flex);
    assert.equal(all.reported, normal.reported);
    assert.equal(all.daysLeft, normal.daysLeft);
});

test('unfinished days survive weekends and month boundaries until corrected', () => {
    const data = {
        ...times('2026-10-30', '09:00'),
        ...times('2026-10-31', null, '12:00'),
        ...times('2026-11-02', '09:00'),
        ...times('2026-10-29', '09:00', '17:00'),
        'p:a/off': [1, 2],
        [offKey('2026-10-30')]: [1, 2],
    };
    const settings = settingsOf(data),
        passes = passesOf(data);
    assert.deepEqual(
        unfinishedDays(data, settings, passes, '2026-11-02').map(
            (day) => day.date
        ),
        ['2026-10-30', '2026-10-31']
    );
    data[timeKey('2026-10-30', 'a', 'end')] = ['17:00', 3];
    data[timeKey('2026-10-31', 'a', 'start')] = ['09:00', 3];
    assert.deepEqual(unfinishedDays(data, settings, passes, '2026-11-02'), []);
});
