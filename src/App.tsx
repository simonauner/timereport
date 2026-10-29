import { useEffect, useState } from 'react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthTable } from '@/components/MonthTable';
import { Punch } from '@/components/Punch';
import { SettingsView } from '@/components/SettingsView';
import { Summary } from '@/components/Summary';
import { ConnectPrompt } from '@/components/SyncPanel';
import { StorageWarning } from '@/components/StorageWarning';
import { Today } from '@/components/Today';
import { addMonths, isoDate, monthName, monthOf } from '@/lib/dates';
import { passesOf } from '@/lib/passes';
import { monthReport } from '@/lib/report';
import { settingsOf } from '@/lib/settings';
import { startSync } from '@/lib/sync';
import { useIsMobile } from '@/lib/useIsMobile';
import { useNow } from '@/lib/useNow';
import { useUserData } from '@/lib/userStore';

export function App() {
    const now = useNow();
    const today = isoDate(now);
    const [month, setMonth] = useState(() => monthOf(today));
    const [showAllDays, setShowAllDays] = useState(false);
    const [chosen, setView] = useState<View>('today');
    const mobile = useIsMobile();
    // Only phones have a view of their own for today.
    const view = chosen === 'today' && !mobile ? 'month' : chosen;

    useEffect(() => startSync(), []);

    const data = useUserData();
    const settings = settingsOf(data);
    const passes = passesOf(data);
    const report = monthReport(
        data,
        settings,
        passes,
        month,
        today,
        showAllDays
    );

    return (
        <div className="mx-auto max-w-6xl px-4 pb-28 sm:pb-16">
            <header className="flex items-center justify-between gap-3 py-4">
                <h1 className="text-xl font-semibold">Stämpelklockan</h1>
                <Button
                    className="max-sm:hidden"
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
                <StorageWarning />
                <ConnectPrompt />
                {view === 'today' ? (
                    <Today
                        data={data}
                        settings={settings}
                        passes={passes}
                        report={monthReport(
                            data,
                            settings,
                            passes,
                            monthOf(today),
                            today
                        )}
                        today={today}
                        now={now}
                    />
                ) : view === 'settings' ? (
                    <SettingsView
                        data={data}
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
                        {!mobile && month === monthOf(today) && (
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
                        <Button
                            variant="outline"
                            className="mb-3"
                            aria-pressed={showAllDays}
                            onClick={() => setShowAllDays(!showAllDays)}
                        >
                            {showAllDays
                                ? 'Dölj tomma lediga veckodagar'
                                : 'Visa alla dagar'}
                        </Button>
                        <MonthTable
                            data={data}
                            settings={settings}
                            report={report}
                            today={today}
                        />
                    </>
                )}
            </main>
            {mobile && <Tabs view={view} onChange={setView} />}
        </div>
    );
}

type View = 'today' | 'month' | 'settings';

const TABS = [
    { view: 'today', label: 'Idag', Icon: Clock },
    { view: 'month', label: 'Månad', Icon: CalendarDays },
    { view: 'settings', label: 'Inställningar', Icon: Settings2 },
] as const;

/** The phone's menu, at the bottom within reach of a thumb. */
function Tabs({
    view,
    onChange,
}: {
    view: View;
    onChange: (view: View) => void;
}) {
    return (
        <nav
            aria-label="Meny"
            className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-10 grid grid-cols-3 gap-1 rounded-2xl bg-card/90 p-1 shadow-lg ring-1 ring-foreground/10 backdrop-blur"
        >
            {TABS.map(({ view: tab, label, Icon }) => (
                <Button
                    key={tab}
                    variant={view === tab ? 'secondary' : 'ghost'}
                    aria-current={view === tab ? 'page' : undefined}
                    className="h-14 flex-col gap-1 rounded-xl text-xs"
                    onClick={() => onChange(tab)}
                >
                    <Icon className="size-5" aria-hidden />
                    {label}
                </Button>
            ))}
        </nav>
    );
}
