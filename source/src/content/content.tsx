import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

console.log('[EarnTime] Content script loaded');

const BlockerUI: React.FC<{ balance: number }> = ({ balance }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      zIndex: 2147483647,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#1e293b',
        padding: '3rem',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid #334155'
      }}>
        <div style={{ marginBottom: '1.5rem', color: '#f43f5e' }}>
          <svg style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f8fafc' }}>
          No Screen Time Remaining
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.5' }}>
          You have exhausted your earned entertainment time. Focus on studying to unlock access to this website.
        </p>
        <div style={{
          background: '#0f172a',
          padding: '1rem',
          borderRadius: '0.75rem',
          marginBottom: '2rem'
        }}>
          <span style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Current Balance</span>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>0 min</span>
        </div>
        <button 
          onClick={() => { /* Handled by popup normally, but could open popup if API allowed */ alert('Open the EarnTime extension to start your study timer.'); }}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
          onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
        >
          Open Extension to Study
        </button>
      </div>
    </div>
  );
};

const checkAccess = () => {
  if (!chrome.runtime?.id) return;
  chrome.runtime.sendMessage({ type: 'CHECK_ACCESS' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.blocked) {
      injectBlocker(response.balance);
    } else {
      removeBlocker();
    }
    
    if (response?.halfUnproductive) {
      document.documentElement.style.filter = 'grayscale(100%)';
    } else {
      document.documentElement.style.filter = '';
    }
  });
};

let container: HTMLDivElement | null = null;

const injectBlocker = (balance: number) => {
  if (!container) {
    container = document.createElement('div');
    container.id = 'earntime-blocker-root';
    document.documentElement.appendChild(container);
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    const root = createRoot(container);
    root.render(<BlockerUI balance={balance} />);
  }
};

const removeBlocker = () => {
  if (container) {
    container.remove();
    container = null;
    document.body.style.overflow = '';
  }
};

// Initial check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAccess);
} else {
  checkAccess();
}

// Listen for messages from background to enforce blocking dynamically
if (chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'BLOCK_NOW') {
      injectBlocker(0);
    }
  });
}

// Periodic re-check to catch dynamic URL changes in SPAs
setInterval(checkAccess, 5000);

export {};