import test from 'node:test';
import assert from 'node:assert/strict';
import { passesOf } from '../src/lib/passes.ts';
import { dayReport, monthReport } from '../src/lib/report.ts';
import { settingsOf } from '../src/lib/settings.ts';
import { passKey, timeKey } from '../src/lib/userData.ts';

test('removing a pass preserves its historical hours and editable month column', () => {
    const data = {
        [timeKey('2026-10-01', 'a', 'start')]: ['09:00', 1],
        [timeKey('2026-10-01', 'a', 'end')]: ['12:00', 1],
    };
    const settings = settingsOf(data);
    const before = monthReport(
        data,
        settings,
        passesOf(data),
        '2026-10',
        '2026-10-29'
    );
    data[passKey('a', 'off')] = [1, 2];
    const active = passesOf(data);
    assert.equal(
        active.some((p) => p.id === 'a'),
        false
    );
    assert.equal(
        passesOf(data, '2026-10').some((p) => p.id === 'a'),
        true
    );
    assert.equal(
        passesOf(data, '2026-11').some((p) => p.id === 'a'),
        false
    );
    const after = monthReport(data, settings, active, '2026-10', '2026-10-29');
    assert.equal(after.reported, 180);
    assert.deepEqual(after.minutes, before.minutes);
    assert.equal(
        dayReport(data, settings, active, '2026-10-01', '2026-10-29').worked,
        180
    );
    assert.equal(
        dayReport(
            data,
            settings,
            active,
            '2026-11-02',
            '2026-11-02'
        ).times.some((t) => t.id === 'a'),
        false
    );
});

test('passes with the same name keep independent times when renamed or removed', () => {
    const data = {
        [passKey('one', 'name')]: ['Extra', 1],
        [passKey('one', 'pos')]: [2, 1],
        [passKey('two', 'name')]: ['Extra', 1],
        [passKey('two', 'pos')]: [3, 1],
        [timeKey('2026-10-01', 'one', 'start')]: ['09:00', 1],
        [timeKey('2026-10-01', 'one', 'end')]: ['12:00', 1],
        [timeKey('2026-10-01', 'two', 'start')]: ['13:00', 1],
        [timeKey('2026-10-01', 'two', 'end')]: ['15:00', 1],
    };
    const settings = settingsOf(data);
    assert.equal(
        dayReport(data, settings, passesOf(data), '2026-10-01', '2026-10-29')
            .worked,
        300
    );
    data[passKey('one', 'name')] = ['Renamed', 2];
    data[passKey('one', 'off')] = [1, 3];
    assert.equal(passesOf(data).find((p) => p.id === 'two').name, 'Extra');
    assert.equal(data[timeKey('2026-10-01', 'two', 'start')][0], '13:00');
    assert.equal(
        dayReport(data, settings, passesOf(data), '2026-10-01', '2026-10-29')
            .worked,
        300
    );
});
