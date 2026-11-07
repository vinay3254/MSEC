import React from 'react';
import { SCREENS, MORE_GROUPS } from '../../nav';
import { Icon } from './icons';
import { initials } from './TopBar';

const ROLE_LABEL = { admin: 'Admin', faculty: 'Faculty' };
const shortDept = (d) => (d === 'Computer Science & Engineering' ? 'CSE' : d);

// Students: "USN · CSE · Sem 6". Staff: "Admin · email" or "Faculty · CSE-6, CSE-4".
export function profileLine(user) {
  if (user.role === 'student' || !user.role) {
    return [user.identifier || user.usn, shortDept(user.department), user.semester ? `Sem ${user.semester}` : null].filter(Boolean).join(' · ');
  }
  const classes = (user.classes || []).map((c) => `${shortDept(c.department)}-${c.semester}`).join(', ');
  return [ROLE_LABEL[user.role] || user.role, user.role === 'faculty' && classes ? classes : user.email].filter(Boolean).join(' · ');
}

export default function MoreScreen({ onOpen, onLogout, onLogoutAll, onSwitchPortal, user }) {
  return (
    <div className="more">
      {user && <button type="button" className="more__profile" onClick={() => onOpen('profile')}>
        <span className="more__avatar">{initials(user)}</span>
        <span className="more__profile-text"><strong>{user.name}</strong><span>{profileLine(user)}</span></span>
        <Icon name="chevron" size={18} />
      </button>}
      {MORE_GROUPS.map((group) => (
        <section key={group.title} className="more__group">
          <h2 className="section-title">{group.title}</h2>
          <div className="reference-list">
          {group.ids.map((id) => (
            <button key={id} type="button" className="more__row" onClick={() => onOpen(id)}>
              <span className="reference-icon"><Icon name={SCREENS[id].icon} size={18} /></span>
              <span className="more__label truncate">{SCREENS[id].label}</span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          {group.title === 'Account' && user?.role === 'admin' && (
            <button type="button" className="more__row" onClick={() => onOpen('admin')}>
              <span className="reference-icon"><Icon name="users" size={18} /></span>
              <span className="more__label">Admin: Roster</span>
              <Icon name="chevron" size={18} />
            </button>
          )}
          {group.title === 'Account' && (
            <>
              {onSwitchPortal && (
                <button type="button" className="more__row" onClick={onSwitchPortal}>
                  <span className="reference-icon"><Icon name="grid" size={18} /></span>
                  <span className="more__label">Switch Institutional Portal</span>
                  <Icon name="chevron" size={18} />
                </button>
              )}
              <button type="button" className="more__row more__row--danger" onClick={onLogout}>
                <span className="reference-icon reference-icon--accent"><Icon name="logout" size={18} /></span>
                <span className="more__label">Log out</span>
              </button>
              {onLogoutAll && (
                <button type="button" className="more__row more__row--danger" onClick={onLogoutAll}>
                  <span className="reference-icon reference-icon--accent"><Icon name="logout" size={18} /></span>
                  <span className="more__label">Log out everywhere</span>
                </button>
              )}
            </>
          )}
          </div>
        </section>
      ))}
    </div>
  );
}
