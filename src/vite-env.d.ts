interface ImportMetaEnv {
    /** The sync server (sync/). Without it, sync isn't offered. */
    readonly VITE_SYNC_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
