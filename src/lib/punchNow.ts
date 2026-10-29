import { isoDate } from './dates';
import { passesOf } from './passes';
import { punchOf } from './punch';
import { settingsOf } from './settings';
import { addMinutes, timeNow } from './time';
import { getUserData, setValue } from './userStore';

/** Resolve both the date and the next field from fresh data at click time. */
export function punchNow(offset = 0, now = new Date()) {
    const data = getUserData();
    const settings = settingsOf(data);
    const { next } = punchOf(data, settings, passesOf(data), isoDate(now), now);
    if (next)
        setValue(
            next.key,
            addMinutes(timeNow(now, settings.punchRound), offset)
        );
}
