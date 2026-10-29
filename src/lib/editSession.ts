export type EditStatus = 'waiting' | 'ready' | 'failed';

/** Only the tab holding this lock may mount the editor and start syncing. */
export function startEditSession(onStatus: (status: EditStatus) => void) {
    const controller = new AbortController();
    let release: (() => void) | undefined;
    if (!navigator.locks) {
        onStatus('failed');
        return () => {};
    }
    navigator.locks
        .request(
            'timereport:editor',
            { signal: controller.signal },
            async () => {
                const held = new Promise<void>((resolve) => {
                    release = resolve;
                });
                onStatus('ready');
                await held;
            }
        )
        .catch(() => {
            if (!controller.signal.aborted) onStatus('failed');
        });
    return () => {
        controller.abort();
        release?.();
    };
}
