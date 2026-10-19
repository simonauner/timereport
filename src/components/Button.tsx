import type { ComponentProps } from 'react';
import css from './button.module.css';

type Look = {
    /**
     * Outlined for most buttons, tonal for the main choice, and red for
     * removing something.
     */
    variant?: 'outlined' | 'tonal' | 'danger' | 'danger-filled';
    size?: 'small' | 'medium' | 'large';
};

/** The app's pill button. A view adds its layout with `className`. */
export function Button({
    variant = 'outlined',
    size = 'medium',
    className,
    type = 'button',
    ...props
}: Look & ComponentProps<'button'>) {
    return (
        <button
            type={type}
            className={[css.button, css[variant], css[size], className]
                .filter(Boolean)
                .join(' ')}
            {...props}
        />
    );
}
