import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

/** Says that something is done, right after the button that did it. */
export function Done({ children }: { children: ReactNode }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
            role="status"
        >
            <CircleCheck className="size-4" aria-hidden />
            {children}
        </span>
    );
}
