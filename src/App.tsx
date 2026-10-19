import { useState } from 'react';
import { MonthTable } from './components/MonthTable';
import { Punch } from './components/Punch';
import { SettingsView } from './components/SettingsView';
import { Summary } from './components/Summary';
import { Button } from './components/Button';
import { addMonths, isoDate, isWeekend, monthName, monthOf } from './lib/dates';
import { passesOf } from './lib/passes';
import { monthReport } from './lib/report';
import { settingsOf } from './lib/settings';
import { useNow } from './lib/useNow';
import { useUserData } from './lib/userStore';
import styles from './App.module.css';

export function App() {
    const now = useNow();
    const today = isoDate(now);
    const [month, setMonth] = useState(() => monthOf(today));
    const [view, setView] = useState<'month' | 'settings'>('month');

    const data = useUserData();
    const settings = settingsOf(data);
    const passes = passesOf(data);
    const report = monthReport(data, settings, passes, month);

    return (
        <>
            <header className={styles.header}>
                <h1>Tidrapport</h1>
                <Button
                    aria-pressed={view === 'settings'}
                    onClick={() =>
                        setView(view === 'settings' ? 'month' : 'settings')
                    }
                >
                    Inställningar
                </Button>
            </header>
            <main className={styles.main}>
                {view === 'settings' ? (
                    <SettingsView
                        settings={settings}
                        passes={passes}
                        today={today}
                    />
                ) : (
                    <>
                        <nav className={styles.months}>
                            <Button
                                aria-label="Föregående månad"
                                onClick={() => setMonth(addMonths(month, -1))}
                            >
                                ←
                            </Button>
                            <h2>{monthName(month)}</h2>
                            <Button
                                aria-label="Nästa månad"
                                onClick={() => setMonth(addMonths(month, 1))}
                            >
                                →
                            </Button>
                            {month !== monthOf(today) && (
                                <Button
                                    variant="tonal"
                                    onClick={() => setMonth(monthOf(today))}
                                >
                                    Idag
                                </Button>
                            )}
                        </nav>
                        {month === monthOf(today) && !isWeekend(today) && (
                            <Punch
                                data={data}
                                settings={settings}
                                passes={passes}
                                today={today}
                                now={now}
                            />
                        )}
                        <Summary
                            data={data}
                            settings={settings}
                            passes={passes}
                            report={report}
                            today={today}
                        />
                        <MonthTable
                            data={data}
                            settings={settings}
                            passes={passes}
                            report={report}
                            today={today}
                        />
                    </>
                )}
            </main>
        </>
    );
}
