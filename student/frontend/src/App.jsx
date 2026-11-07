import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/Shell/TopBar';
import BottomTabs from './components/Shell/BottomTabs';
import MoreScreen from './components/Shell/MoreScreen';
import './components/Shell/shell.css';
import AuthScreen from './screens/AuthScreen';
import PortalGateway from './screens/PortalGateway';
import TeacherDashboardScreen from './screens/TeacherDashboardScreen';
import LibraryPortalWrapper from './screens/LibraryPortalWrapper';
import HostelPortalWrapper from './screens/HostelPortalWrapper';
import StudentOnboardingModal from './components/StudentOnboardingModal';
import SCREEN_COMPONENTS from './screens/index.js';
import { SCREENS, TABS, tabFor, pushScreen, popScreen } from './nav';
import { clearAuth, getToken, getUser, setUser, UNAUTHORIZED_EVENT } from './api';
import { authApi, GOOGLE_ERRORS, saveSession } from './auth-api';
import { useAuthReturn } from './useAuthReturn';
import { useOnline } from './useOnline';
import { NotFoundScreen, OfflineScreen, OFFLINE_ENDPOINTS } from './screens/MobileStates';

// Screens that load their own data with no saved copy: offline shows the offline state instead of broken content.
const LIVE_ONLY_SCREENS = new Set(['profile', 'notifications', 'doubts', 'faculty_mentor', 'fees', 'admin']);
import './screens/mobile-reference.css';
import './theme/responsive.css';
import './theme/screens.css';

export default function App() {
  // portalMode: null (Gateway) | 'student' | 'teacher' | 'library'
  const [portalMode, setPortalMode] = useState(() => localStorage.getItem('msec_portal_mode') || null);
  const [currentUser, setCurrentUser] = useState(() => (getToken() ? getUser() : null));
  const [dismissStudentOnboarding, setDismissStudentOnboarding] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [stack, setStack] = useState(['dashboard']);
  const online = useOnline();
  const [showSaved, setShowSaved] = useState(false);
  const [savedEndpoint, setSavedEndpoint] = useState('');
  const [motion, setMotion] = useState('tab');
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const navigate = useCallback((id) => {
    setShowSaved(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const next = pushScreen(stackRef.current, id);
    setMotion(TABS.includes(id) ? 'tab' : 'push');
    stackRef.current = next;
    setStack(next);
  }, []);

  const goBack = useCallback(() => {
    setShowSaved(false);
    const { stack: next, exit } = popScreen(stackRef.current);
    if (!exit) {
      setMotion('pop');
      stackRef.current = next;
      setStack(next);
    }
    return exit;
  }, []);

  useEffect(() => {
    window.__msecNav = { navigate, goBack };
    return () => { delete window.__msecNav; };
  }, [navigate, goBack]);

  // Confirm the stored session and refresh the user
  useEffect(() => {
    if (!getToken()) return;
    authApi.me().then(({ user }) => { setUser(user); setCurrentUser(user); }).catch(() => {});
  }, []);

  // Session expired or revoked mid-use
  useEffect(() => {
    const ended = () => {
      setAuthError('Your session ended. Sign in again to continue.');
      setCurrentUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, ended);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, ended);
  }, []);

  useAuthReturn(async ({ code, error }) => {
    if (error) { setAuthError(GOOGLE_ERRORS[error] || GOOGLE_ERRORS.google_failed); return; }
    try {
      setCurrentUser(saveSession(await authApi.exchangeGoogle(code)));
      setAuthError('');
    } catch (err) {
      setAuthError(err.message || GOOGLE_ERRORS.google_failed);
    }
  });

  const signOut = () => {
    clearAuth();
    stackRef.current = ['dashboard'];
    setStack(['dashboard']);
    setAuthError('');
    setCurrentUser(null);
  };
  const handleLogout = signOut;
  const handleLogoutAll = async () => {
    try { await authApi.logoutAll(); } catch { /* signing out locally */ }
    signOut();
  };

  const handleSelectPortal = (mode) => {
    setPortalMode(mode);
    localStorage.setItem('msec_portal_mode', mode);
  };

  const handleSwitchPortal = () => {
    setPortalMode(null);
    localStorage.removeItem('msec_portal_mode');
    setAuthError('');
  };

  // QA-only hook: ?screen=auth renders the auth screen
  const forceAuth = import.meta.env.MODE !== 'android'
    && new URLSearchParams(window.location.search).get('screen') === 'auth';

  // 1. GATEWAY SCREEN: Show portal selection when no portal is chosen
  if (!portalMode) {
    return <PortalGateway onSelectPortal={handleSelectPortal} />;
  }

  // 2. LIBRARY PORTAL: Dedicated digital library access
  if (portalMode === 'library') {
    return <LibraryPortalWrapper onSwitchPortal={handleSwitchPortal} />;
  }

  // HOSTEL MANAGEMENT PORTAL: Campus residence management
  if (portalMode === 'hostel') {
    return <HostelPortalWrapper onSwitchPortal={handleSwitchPortal} user={currentUser} />;
  }

  // 3. TEACHER DASHBOARD ACCESS
  if (portalMode === 'teacher') {
    if (!currentUser || forceAuth) {
      return (
        <AuthScreen
          key="teacher-auth"
          portalName="Teacher Desk"
          initialError={authError}
          onBackToGateway={handleSwitchPortal}
          onLoginSuccess={(user) => {
            setAuthError('');
            setCurrentUser(user);
          }}
        />
      );
    }
    return (
      <TeacherDashboardScreen
        user={currentUser}
        onLogout={handleLogout}
        onSwitchPortal={handleSwitchPortal}
        onUpdateUser={(updatedUser) => {
          setUser(updatedUser);
          setCurrentUser(updatedUser);
        }}
      />
    );
  }

  // 4. STUDENT DASHBOARD ACCESS (Current codebase)
  if (!currentUser || forceAuth) {
    return (
      <AuthScreen
        key={authError || 'student-auth'}
        portalName="Student Portal"
        initialError={authError}
        onBackToGateway={handleSwitchPortal}
        onLoginSuccess={(user) => {
          setAuthError('');
          setCurrentUser(user);
          setDismissStudentOnboarding(false);
          setShowStudentModal(!user?.onboarding_completed);
          if (forceAuth) window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  const activeId = stack[stack.length - 1];
  const role = currentUser.role;
  const unknown = !Object.hasOwn(SCREENS, activeId)
    || (SCREENS[activeId].roles && !SCREENS[activeId].roles.includes(role));

  if (unknown) return <NotFoundScreen onNavigate={navigate} onBack={goBack} />;

  const renderActiveView = () => {
    if (activeId === 'more') {
      return (
        <MoreScreen
          user={currentUser}
          onOpen={navigate}
          onLogout={handleLogout}
          onLogoutAll={handleLogoutAll}
          onSwitchPortal={handleSwitchPortal}
        />
      );
    }
    const Screen = SCREEN_COMPONENTS[activeId] || SCREEN_COMPONENTS.dashboard;
    if (activeId === 'dashboard') {
      return <Screen onNavigate={(id) => navigate(id)} userRole={role} currentUser={currentUser} onOpenOnboarding={() => setShowStudentModal(true)} />;
    }
    const params = new URLSearchParams(savedEndpoint.split('?')[1] || '');
    return (
      <Screen
        userRole={role}
        currentUser={currentUser}
        onNavigate={navigate}
        initialView={showSaved ? params.get('view') : undefined}
        initialDay={showSaved ? Number(params.get('day')) || undefined : undefined}
        initialSemester={showSaved ? Number(params.get('semester')) || undefined : undefined}
      />
    );
  };

  const isTab = TABS.includes(activeId);
  const MONTH = { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' };
  const headerProps = activeId === 'dashboard'
    ? {
        variant: 'home',
        user: currentUser,
        unread: false,
        onBell: () => navigate('notifications'),
        onAvatar: () => navigate('profile'),
      }
    : {
        variant: activeId === 'assistant' ? 'ai' : 'page',
        title: activeId === 'academics' ? 'Academics' : SCREENS[activeId].label,
        kicker: activeId === 'timetable' ? new Date().toLocaleDateString('en-GB', MONTH) : undefined,
        onBack: isTab ? undefined : goBack,
      };

  return (
    <>
      {(currentUser?.role === 'student' || (!currentUser?.role && portalMode === 'student')) &&
        ((!currentUser?.onboarding_completed && !dismissStudentOnboarding) || showStudentModal) && (
        <StudentOnboardingModal
          user={currentUser}
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            setCurrentUser(updatedUser);
            setShowStudentModal(false);
            setDismissStudentOnboarding(false);
          }}
          onClose={() => {
            setShowStudentModal(false);
            setDismissStudentOnboarding(true);
          }}
          onCancel={() => {
            setShowStudentModal(false);
            setDismissStudentOnboarding(true);
          }}
        />
      )}
      <TopBar key={`h-${activeId}`} {...headerProps} />
      <main key={activeId} className={`app-main app-main--${activeId} screen-anim screen-anim--${motion}`}>
        {!online && (OFFLINE_ENDPOINTS[activeId] || LIVE_ONLY_SCREENS.has(activeId)) && !showSaved
          ? <OfflineScreen key={activeId} screenId={activeId} onShowSaved={(endpoint) => { setSavedEndpoint(endpoint || ''); setShowSaved(true); }} />
          : renderActiveView()}
      </main>
      <BottomTabs active={tabFor(activeId)} onSelect={navigate} />
    </>
  );
}
