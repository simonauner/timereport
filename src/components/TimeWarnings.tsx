import type { DayReport } from '@/lib/report';
import { WARN } from '@/lib/tone';

export function TimeWarnings({ day }: { day: DayReport }) {
    if (!day.longPass && !day.overlaps) return null;
    return (
        <div
            role="status"
            className={`mt-1 grid gap-1 text-left text-xs whitespace-normal ${WARN}`}
        >
            {day.longPass && (
                <p>
                    Ett pass är längre än max per dag. Kontrollera start och
                    stopp, särskilt om sluttiden är nästa dag.
                </p>
            )}
            {day.overlaps && (
                <p>
                    Pass överlappar. Den överlappande tiden räknas dubbelt.
                    Kontrollera tiderna.
                </p>
            )}
        </div>
    );
}
