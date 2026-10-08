import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Setup } from './Setup';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Setup />
  </StrictMode>,
);
