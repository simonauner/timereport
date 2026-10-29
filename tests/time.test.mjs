import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, parseDuration, spanMinutes } from '../src/lib/time.ts';
import { sanitize, optionKey, timeKey } from '../src/lib/userData.ts';

test('time input accepts the documented forms and rejects invalid clock times', () => {
    for (const input of [
        '8',
        '800',
        '0800',
        '8:00',
        '8.00',
        '8,00',
        '08.00.00',
    ]) {
        assert.equal(parseTime(input), '08:00');
    }
    for (const input of ['', 'garbage', '25:00', '09:60', '-01:00']) {
        assert.equal(parseTime(input), null);
    }
    // Overnight periods are explicitly supported by the current app.
    assert.equal(spanMinutes('22:00', '01:30'), 210);
});

test('daily duration input has the same 0–24 hour limit in every format', () => {
    for (const input of ['8', '08:00', '8.00'])
        assert.equal(parseDuration(input), 480);
    for (const input of ['8:30', '8,5'])
        assert.equal(parseDuration(input), 510);
    assert.equal(parseDuration('24:00'), 1440);
    assert.equal(parseDuration('0'), 0);
    for (const input of [
        '24:01',
        '25:00',
        '99:59',
        '25',
        '8:60',
        '-1',
        'garbage',
        '',
    ]) {
        assert.equal(parseDuration(input), null);
    }
});

test('untrusted saved times and targets are validated before being used', () => {
    const valid = timeKey('2026-10-29', 'a', 'start'),
        invalid = timeKey('2026-10-29', 'a', 'end');
    const data = sanitize({
        [valid]: ['09:00', 1],
        [invalid]: ['25:00', 1],
        [optionKey('target')]: [1500, 1],
    });
    assert.deepEqual(data, { [valid]: ['09:00', 1] });
});
