import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { startEditSession } from '../src/lib/editSession.ts';

test('only one tab opens the editor, then a waiting tab takes over', async () => {
    const first = [],
        second = [];
    const closeFirst = startEditSession((status) => first.push(status));
    const closeSecond = startEditSession((status) => second.push(status));
    try {
        await setImmediate();
        assert.deepEqual(first, ['ready']);
        assert.deepEqual(second, []);
        closeFirst();
        await setImmediate();
        assert.deepEqual(second, ['ready']);
    } finally {
        closeFirst();
        closeSecond();
    }
});

test('closing a waiting tab cancels its request without opening an editor', async () => {
    const first = [],
        cancelled = [];
    const closeFirst = startEditSession((status) => first.push(status));
    const closeWaiting = startEditSession((status) => cancelled.push(status));
    await setImmediate();
    closeWaiting();
    closeFirst();
    await setImmediate();
    assert.deepEqual(cancelled, []);
});
