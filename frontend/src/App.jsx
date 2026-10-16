import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Inbox, LogOut, Menu, WalletCards, Zap } from 'lucide-react';
import { api, session } from './api.js';
import AuthPage from './pages/AuthPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SubmissionsPage from './pages/SubmissionsPage.jsx';
import WidgetEditorPage from './pages/WidgetEditorPage.jsx';
import WidgetsPage from './pages/WidgetsPage.jsx';
import styles from './App.module.css';

const navItems = [
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/widgets', label: 'Widgets', icon: WalletCards },
  { to: '/submissions', label: 'Submissions', icon: Inbox },
];

export default function App() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(Boolean(session.token));
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session.token) {
      setChecking(false);
      setProfile(null);
      return undefined;
    }
    let active = true;
    api('/auth/protected/profile')
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function signOut() {
    session.clear();
    queryClient.clear();
    setProfile(null);
    navigate('/login');
  }

  if (checking) {
    return <div className="screen-loading"><span className="loader" />Restoring your workspace</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={profile ? <Navigate to="/analytics" replace /> : <AuthPage onAuthenticated={setProfile} />}
      />
      <Route
        path="/signup"
        element={profile ? <Navigate to="/analytics" replace /> : <AuthPage initialMode="signup" onAuthenticated={setProfile} />}
      />
      <Route path="/" element={<Navigate to={profile ? '/analytics' : '/login'} replace />} />
      <Route
        path="/*"
        element={profile ? (
          <Workspace
            profile={profile}
            onSignOut={signOut}
            mobileNav={mobileNav}
            setMobileNav={setMobileNav}
          />
        ) : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function Workspace({ profile, onSignOut, mobileNav, setMobileNav }) {
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const title = location.pathname.startsWith('/widgets')
    ? 'Widget studio'
    : location.pathname.startsWith('/submissions')
      ? 'Submissions'
      : 'Analytics overview';
  const initials = (profile.email || 'U').slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!mobileNav) return undefined;
    const sidebar = sidebarRef.current;
    const focusableSelector = 'a[href], button:not([disabled])';
    const focusable = () => [...sidebar.querySelectorAll(focusableSelector)];
    focusable()[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileNav(false);
        menuButtonRef.current?.focus();
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        if (event.shiftKey && (document.activeElement === items[0] || !sidebar.contains(document.activeElement))) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !sidebar.contains(document.activeElement))) {
          event.preventDefault();
          items[0].focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNav, setMobileNav]);

  function closeMobileNav() {
    setMobileNav(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className={styles.shell}>
      <aside ref={sidebarRef} id="workspace-nav" className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <Link to="/analytics" className="sidebar-brand">
          <span className="brand-mark"><Zap size={17} fill="currentColor" /></span>
          <span>FLYRANK WIDGETS</span>
        </Link>
        <div className="workspace-select">
          <span className="workspace-avatar">{initials}</span>
          <span><small>WORKSPACE</small><b>{profile.email.split('@')[1] || 'Personal'}</b></span>
        </div>
        <span className="nav-heading">WORKSPACE</span>
        <nav className="side-nav" aria-label="Workspace">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobileNav}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item signout" onClick={onSignOut}>
            <LogOut size={18} /><span>Sign out</span>
          </button>
        </div>
      </aside>
      <button
        className={`mobile-scrim ${mobileNav ? 'visible' : ''}`}
        aria-label="Close navigation"
        aria-hidden={!mobileNav}
        tabIndex={mobileNav ? 0 : -1}
        disabled={!mobileNav}
        onClick={closeMobileNav}
      />
      <div className="main-column">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            className="icon-button menu-toggle"
            aria-label="Open navigation"
            aria-expanded={mobileNav}
            aria-controls="workspace-nav"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>WORKSPACE</span><span className="breadcrumb-slash">/</span><b>{title}</b>
          </div>
          <div className="topbar-right">
            <div className="user-menu">
              <span className="user-avatar">{initials}</span>
              <span><b>{profile.email}</b><small>Workspace owner</small></span>
            </div>
            <button className="icon-button mobile-signout" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page-content" key={location.pathname}>
          <Routes>
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="widgets" element={<WidgetsPage />} />
            <Route path="widgets/:id" element={<WidgetEditorPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="submissions/:id" element={<SubmissionsPage />} />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
