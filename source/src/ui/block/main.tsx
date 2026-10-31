import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Block } from './Block';

const params = new URLSearchParams(window.location.search);
const reason = params.get('reason');
const target = params.get('target');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Block reason={reason} target={target} />
  </StrictMode>,
);
