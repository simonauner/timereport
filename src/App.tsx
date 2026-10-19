import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthTable } from '@/components/MonthTable';
import { Punch } from '@/components/Punch';
import { SettingsView } from '@/components/SettingsView';
import { Summary } from '@/components/Summary';
import { ConnectPrompt } from '@/components/SyncPanel';
import { addMonths, isoDate, isWeekend, monthName, monthOf } from '@/lib/dates';
import { passesOf } from '@/lib/passes';
import { monthReport } from '@/lib/report';
import { settingsOf } from '@/lib/settings';
import { startSync } from '@/lib/sync';
import { useNow } from '@/lib/useNow';
import { useUserData } from '@/lib/userStore';

export function App() {
    const now = useNow();
    const today = isoDate(now);
    const [month, setMonth] = useState(() => monthOf(today));
    const [view, setView] = useState<'month' | 'settings'>('month');

    useEffect(() => startSync(), []);

    const data = useUserData();
    const settings = settingsOf(data);
    const passes = passesOf(data);
    const report = monthReport(data, settings, passes, month);

    return (
        <div className="mx-auto max-w-6xl px-4 pb-16">
            <header className="flex items-center justify-between gap-3 py-4">
                <h1 className="text-xl font-semibold">Tidrapport</h1>
                <Button
                    variant={view === 'settings' ? 'secondary' : 'outline'}
                    aria-pressed={view === 'settings'}
                    onClick={() =>
                        setView(view === 'settings' ? 'month' : 'settings')
                    }
                >
                    <Settings2 data-icon="inline-start" />
                    Inställningar
                </Button>
            </header>
            <main>
                <ConnectPrompt />
                {view === 'settings' ? (
                    <SettingsView
                        settings={settings}
                        passes={passes}
                        today={today}
                    />
                ) : (
                    <>
                        <nav className="mb-4 flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Föregående månad"
                                onClick={() => setMonth(addMonths(month, -1))}
                            >
                                <ChevronLeft />
                            </Button>
                            <h2 className="min-w-40 text-center text-lg font-semibold first-letter:uppercase">
                                {monthName(month)}
                            </h2>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Nästa månad"
                                onClick={() => setMonth(addMonths(month, 1))}
                            >
                                <ChevronRight />
                            </Button>
                            {month !== monthOf(today) && (
                                <Button
                                    variant="secondary"
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
        </div>
    );
}
