import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getUserData,
    getStorageFailed,
    setValue,
    retryStorage,
} from '../src/lib/userStore.ts';

test('failed storage keeps changes and retry persists the full copy', () => {
    const stored = new Map();
    let blocked = false;
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: (key) => stored.get(key) ?? null,
            setItem: (key, value) => {
                if (blocked) throw new Error('Quota exceeded');
                stored.set(key, value);
            },
        },
    });
    setValue('o:target', 420);
    blocked = true;
    setValue('o:max', 480);
    setValue('o:punchRound', 1);
    assert.equal(getStorageFailed(), true);
    assert.equal(getUserData()['o:max'][0], 480);
    retryStorage();
    assert.equal(getStorageFailed(), true);
    blocked = false;
    retryStorage();
    assert.equal(getStorageFailed(), false);
    assert.deepEqual(JSON.parse(stored.get('timereport:data')), getUserData());
    assert.equal(getUserData()['o:punchRound'][0], 1);
});
