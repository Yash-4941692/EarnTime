import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Block } from './Block';

/**
 * The motivational pause page the fixed adult-site focus guard redirects to.
 *
 * It is a page of its own, not `block.html` with a query parameter: a redirect carries the path, and
 * anything the page has to learn from a query string can be lost on the way — which is how the pause
 * used to arrive as the ordinary block page. This page always shows the pause, and it says nothing
 * about the site, the reason or the wallet.
 */
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Block reason="motivation" target={null} />
  </StrictMode>,
);
