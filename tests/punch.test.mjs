import test from 'node:test';
import assert from 'node:assert/strict';
import { punchNow } from '../src/lib/punchNow.ts';
import { getUserData, setValue } from '../src/lib/userStore.ts';
import { timeKey } from '../src/lib/userData.ts';

const stored = new Map();
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
    },
});
test.beforeEach(() => {
    stored.clear();
});

test('a fresh punch after midnight starts the new day', () => {
    punchNow(0, new Date(2026, 9, 30, 0, 1));
    assert.equal(
        getUserData()[timeKey('2026-10-30', 'a', 'start')][0],
        '00:00'
    );
    assert.equal(getUserData()[timeKey('2026-10-29', 'a', 'start')], undefined);
});

test('a pass running since yesterday still stops under its original date', () => {
    setValue(timeKey('2026-10-29', 'a', 'start'), '23:55');
    punchNow(0, new Date(2026, 9, 30, 0, 1));
    assert.equal(getUserData()[timeKey('2026-10-29', 'a', 'end')][0], '00:00');
    assert.equal(getUserData()[timeKey('2026-10-30', 'a', 'end')], undefined);
});

test('two punches before a render use the latest saved field, rounding, and offset', () => {
    setValue('o:punchRound', 1);
    punchNow(0, new Date(2026, 9, 29, 9, 7));
    punchNow(-5, new Date(2026, 9, 29, 9, 20));
    const data = getUserData();
    assert.equal(data[timeKey('2026-10-29', 'a', 'start')][0], '09:07');
    assert.equal(data[timeKey('2026-10-29', 'a', 'end')][0], '09:15');
});
