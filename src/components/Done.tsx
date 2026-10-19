import type { ReactNode } from 'react';
import css from './sync.module.css';

/** Says that something is done, right after the button that did it. */
export function Done({ children }: { children: ReactNode }) {
    return (
        <span className={css.done} role="status">
            <span aria-hidden>✓</span> {children}
        </span>
    );
}
