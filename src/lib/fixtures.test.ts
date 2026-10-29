/**
 * The cases in fixtures/, which the Android app (android/) checks too, so
 * both work out times the same way. Each case ends with what's expected.
 * `npm run fixtures` writes what this code gives instead, for a new case or
 * a change that is meant to give other results.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { addDays, addMonths, weekNumber, weekStart } from './dates';
import { holidayOn } from './holidays';
import { passesOf } from './passes';
import { monthReport, weekMinutes } from './report';
import { settingsOf } from './settings';
import {
    addMinutes,
    formatDuration,
    formatHours,
    formatKronor,
    parseDuration,
    parseTime,
} from './time';
import { merge, sanitize, type UserData } from './userData';

const FIXTURES = path.resolve(import.meta.dirname, '../../fixtures');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

type Json = Record<string, unknown>;

/** Checks a file's cases, or rewrites what they expect. */
function check(name: string, run: (fixture: Json) => Json) {
    const file = path.join(FIXTURES, name);
    const fixture = JSON.parse(readFileSync(file, 'utf8')) as Json;
    const result = run(fixture);
    if (UPDATE) {
        writeFileSync(file, `${JSON.stringify(result, null, 4)}\n`);
    } else {
        expect(result).toEqual(fixture);
    }
}

/** Replaces the last item of every case with what `fn` gives for the rest. */
// oxlint-disable-next-line typescript/no-explicit-any
const cases = (list: unknown, fn: (...args: any[]) => unknown) =>
    (list as unknown[][]).map((item) => {
        const args = item.slice(0, -1);
        return [...args, fn(...args)];
    });

test('fixtures/userData.json', () => {
    check('userData.json', (fixture) => ({
        sanitize: (fixture.sanitize as Json[]).map((item) => ({
            ...item,
            expected: sanitize(item.input),
        })),
        merge: (fixture.merge as Json[]).map((item) => ({
            ...item,
            expected: merge(
                item.current as UserData,
                item.incoming as UserData
            ),
        })),
    }));
});

test('fixtures/time.json', () => {
    check('time.json', (fixture) => ({
        parseTime: cases(fixture.parseTime, parseTime),
        parseDuration: cases(fixture.parseDuration, parseDuration),
        formatDuration: cases(
            fixture.formatDuration,
            (minutes: number, sign: boolean) =>
                formatDuration(minutes, { sign })
        ),
        addMinutes: cases(fixture.addMinutes, addMinutes),
        formatHours: cases(fixture.formatHours, formatHours),
        formatKronor: cases(fixture.formatKronor, formatKronor),
    }));
});

/** Every holiday of a year, in date order. */
function holidaysOf(year: number) {
    const holidays: [string, string][] = [];
    for (
        let day = `${year}-01-01`;
        day.startsWith(String(year));
        day = addDays(day, 1)
    ) {
        const holiday = holidayOn(day);
        if (holiday) holidays.push([day, holiday]);
    }
    return holidays;
}

test('fixtures/dates.json', () => {
    check('dates.json', (fixture) => ({
        weekNumber: cases(fixture.weekNumber, weekNumber),
        weekStart: cases(fixture.weekStart, weekStart),
        addMonths: cases(fixture.addMonths, addMonths),
        holidays: cases(fixture.holidays, holidaysOf),
    }));
});

const reports = readdirSync(path.join(FIXTURES, 'reports'));

test.each(reports)('fixtures/reports/%s', (name) => {
    check(`reports/${name}`, (fixture) => {
        const data = sanitize(fixture.data);
        const today = fixture.today as string;
        const settings = settingsOf(data);
        const passes = passesOf(data);
        return {
            ...fixture,
            expected: {
                settings,
                passes,
                month: monthReport(
                    data,
                    settings,
                    passes,
                    fixture.month as string,
                    today
                ),
                week: weekMinutes(data, settings, passes, today, today),
            },
        };
    });
});
