import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    monthEndWarningDays,
    needsReport,
    type MonthReport,
} from '@/lib/report';
import { formatDuration } from '@/lib/time';
import { WARN } from '@/lib/tone';

export function MonthEndWarning({
    report,
    today,
}: {
    report: MonthReport;
    today: string;
}) {
    const days = monthEndWarningDays(report, today);
    if (!days) return null;
    const missing = report.days.filter((day) => needsReport(day, today)).length;
    return (
        <Alert className={`mb-3 ${WARN}`}>
            <TriangleAlert />
            <AlertTitle>Prognosen är över max för månaden</AlertTitle>
            <AlertDescription>
                Det är {days} {days === 1 ? 'arbetsdag' : 'arbetsdagar'} kvar i
                månaden, räknat från idag.{' '}
                {missing > 0 ? (
                    <>
                        {missing} tidigare{' '}
                        {missing === 1
                            ? 'arbetsdag saknar'
                            : 'arbetsdagar saknar'}{' '}
                        fullständig rapportering. Fyll i tiderna för att se hur
                        mycket du kan jobba resten av månaden.
                    </>
                ) : (
                    <>
                        För att hålla månadens max får du enligt prognosen jobba
                        i snitt högst {formatDuration(report.maxPerDay)}/dag
                        resten av månaden.
                    </>
                )}
            </AlertDescription>
        </Alert>
    );
}
