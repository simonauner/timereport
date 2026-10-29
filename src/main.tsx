import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { EditSession } from './components/EditSession.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <EditSession>
            <App />
        </EditSession>
    </StrictMode>
);
