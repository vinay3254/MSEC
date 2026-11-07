import React from 'react';
import LibraryView from './LibraryScreen';

export default function LibraryPortalWrapper({ onSwitchPortal }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '16px' }}>
      <header style={{
        maxWidth: '1080px',
        margin: '0 auto 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.svg" alt="MSEC" style={{ width: '36px', height: '36px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontFamily: 'var(--font-head)', color: 'var(--primary)', fontSize: '16px' }}>
              MSEC Digital Library
            </strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Learning Resource Center</small>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchPortal}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-ctl)',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          &larr; Switch Portal
        </button>
      </header>

      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <LibraryView userRole="student" />
      </div>
    </div>
  );
}
