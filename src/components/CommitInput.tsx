import { useId, useRef, useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
    value: string;
    /** Called with what was typed, once, on Enter or when leaving the field. */
    onCommit: (text: string) => string | void;
};

/**
 * A text field that saves when it's left or Enter is pressed, rather than on
 * every key. Escape throws away what was typed.
 */
export function CommitInput({
    value,
    onCommit,
    onKeyDown,
    onBlur,
    ...props
}: Props) {
    const [draft, setDraft] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const errorId = useId();
    // Read by the handlers, which may run twice before a render, e.g. Enter
    // and then the blur that moving on causes.
    const pending = useRef<string | null>(null);

    const commit = () => {
        if (pending.current === null) return;
        const text = pending.current;
        const message = text !== value ? onCommit(text) : undefined;
        if (message) {
            setError(message);
            return;
        }
        pending.current = null;
        setDraft(null);
        setError(null);
    };

    return (
        <>
            <Input
                {...props}
                aria-invalid={error ? true : props['aria-invalid']}
                aria-describedby={
                    [props['aria-describedby'], error ? errorId : null]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                value={draft ?? value}
                onChange={(event) => {
                    pending.current = event.target.value;
                    setDraft(event.target.value);
                    setError(null);
                }}
                onBlur={(event) => {
                    commit();
                    onBlur?.(event);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') commit();
                    if (event.key === 'Escape') {
                        pending.current = null;
                        setDraft(null);
                        setError(null);
                    }
                    onKeyDown?.(event);
                }}
            />
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </>
    );
}
