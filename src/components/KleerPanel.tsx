import { useEffect, useRef } from 'react';
import { Bookmark } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { kleerBookmarklet } from '@/lib/kleer';
import { Section } from './SettingsView';

/** How to report a week in Kleer, with the bookmarklet that does it. */
export function KleerPanel() {
    const link = useRef<HTMLAnchorElement>(null);

    // React blocks javascript: links it renders, so the link gets it here.
    useEffect(() => {
        link.current?.setAttribute('href', kleerBookmarklet);
    }, []);

    return (
        <Section
            title="Kleer"
            description="Fyll i en hel vecka i Kleers veckovy med den arbetade tiden per dag."
        >
            <ol className="grid list-decimal gap-1 pl-5 text-sm">
                <li>
                    Dra knappen <strong>Fyll i Kleer</strong> nedan till
                    bokmärkesfältet. Det behövs bara en gång.
                </li>
                <li>
                    Klicka <strong>Kopiera för Kleer</strong> på veckans rad i
                    månadsvyn.
                </li>
                <li>
                    Öppna veckan i Kleer, välj projekt och aktivitet och klicka
                    på bokmärket. Tillåt Kleer att läsa urklippet om webbläsaren
                    frågar, eller klistra in veckan i rutan som visas.
                </li>
                <li>
                    Kontrollera tiderna och klicka{' '}
                    <strong>Lägg till rad</strong> i Kleer. Inget sparas innan
                    dess.
                </li>
            </ol>
            <p className="text-sm text-muted-foreground">
                Har raden redan tider kan du klicka i en av dess rutor innan du
                klickar på bokmärket, så fylls den raden i stället.
            </p>
            <a
                ref={link}
                className={buttonVariants({
                    variant: 'outline',
                    className: 'justify-self-start',
                })}
                onClick={(event) => event.preventDefault()}
                draggable
            >
                <Bookmark data-icon="inline-start" />
                Fyll i Kleer
            </a>
        </Section>
    );
}
