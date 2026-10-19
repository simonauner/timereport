import { useRef, useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
    value: string;
    /** Called with what was typed, once, on Enter or when leaving the field. */
    onCommit: (text: string) => void;
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
    // Read by the handlers, which may run twice before a render, e.g. Enter
    // and then the blur that moving on causes.
    const pending = useRef<string | null>(null);

    const commit = () => {
        if (pending.current === null) return;
        const text = pending.current;
        pending.current = null;
        setDraft(null);
        if (text !== value) onCommit(text);
    };

    return (
        <Input
            {...props}
            value={draft ?? value}
            onChange={(event) => {
                pending.current = event.target.value;
                setDraft(event.target.value);
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
                }
                onKeyDown?.(event);
            }}
        />
    );
}
