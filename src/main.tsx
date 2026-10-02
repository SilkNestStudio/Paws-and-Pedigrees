import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import './ui/week.css';

// /?view=dogs opens the development dog viewer instead of the game.
const view = new URLSearchParams(location.search).get('view');
const Root = lazy(() => (view === 'dogs' ? import('./render/DogViewer') : import('./App')));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
);
