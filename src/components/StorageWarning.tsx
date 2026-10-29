import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { today } from '@/lib/dates';
import { getUserData, retryStorage, useStorageFailed } from '@/lib/userStore';

export function StorageWarning() {
    const failed = useStorageFailed();
    if (!failed) return null;
    return (
        <Alert variant="destructive" className="mb-4">
            <TriangleAlert />
            <AlertTitle>Tiderna kan inte sparas i webbläsaren</AlertTitle>
            <AlertDescription>
                Ändringarna finns bara kvar medan sidan är öppen, om de inte har
                synkats. Ladda ner en säkerhetskopia innan du stänger eller
                laddar om sidan.
            </AlertDescription>
            <div className="col-start-2 mt-2 flex flex-wrap gap-2">
                <Button variant="outline" onClick={retryStorage}>
                    Försök spara igen
                </Button>
                <Button
                    onClick={() => {
                        const url = URL.createObjectURL(
                            new Blob([JSON.stringify(getUserData(), null, 2)], {
                                type: 'application/json',
                            })
                        );
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `stampelklockan-${today()}.json`;
                        link.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                >
                    Ladda ner säkerhetskopia
                </Button>
            </div>
        </Alert>
    );
}
