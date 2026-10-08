import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Block } from './Block';

const reason = new URLSearchParams(window.location.search).get('reason');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Block reason={reason} />
  </StrictMode>,
);
