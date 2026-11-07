import React from 'react';
import HostelDashboardScreen from './HostelDashboardScreen';

export default function HostelPortalWrapper({ onSwitchPortal, user }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '16px' }}>
      <header style={{
        maxWidth: '1120px',
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
            <strong style={{ fontFamily: 'var(--font-head)', color: '#ea580c', fontSize: '16px' }}>
              MSEC Campus Residences
            </strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Hostel Management & Residential Services Console
            </small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {user.name} ({user.identifier || user.role})
            </span>
          )}
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s ease',
            }}
          >
            &larr; Switch Portal
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <HostelDashboardScreen user={user} onSwitchPortal={onSwitchPortal} />
      </div>
    </div>
  );
}
