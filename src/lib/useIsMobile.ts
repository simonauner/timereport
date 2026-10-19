import { useSyncExternalStore } from 'react';

// Tailwind's sm breakpoint: below it, the app is laid out for a phone.
const query = matchMedia('(max-width: 639px)');

function subscribe(listener: () => void) {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
}

/** Whether the screen is phone sized. */
export const useIsMobile = () =>
    useSyncExternalStore(subscribe, () => query.matches);
