import { useSyncExternalStore } from 'react';

function subscribeToHash(listener: () => void) {
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
}

/** The URL fragment without #. */
export const useHash = () =>
    useSyncExternalStore(subscribeToHash, () => location.hash.slice(1));

/** Removes the fragment from the URL without adding a history entry. */
export function clearHash() {
    history.replaceState(null, '', location.pathname + location.search);
    // replaceState doesn't fire hashchange on its own.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}
