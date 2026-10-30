import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { AccountType } from '../types';
import { BrandLogo } from '../components/common/BrandLogo';
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Building,
  ChevronDown,
  Moon,
  Sun,
  CheckSquare,
  GitPullRequest,
  ShieldCheck,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import { syncDemoAuthToken } from '../services/api';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const AppLayout: React.FC = () => {
  const { accountType, setAccountType, theme, toggleTheme, documents, projects } = useDemo();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setAccountDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pendingFilesCount = projects.flatMap(p => p.files).filter(f =>
    f.status === 'awaiting_verification' || f.status === 'in_progress'
  ).length;
  const pendingReviewCount = documents.filter(d => d.status === 'pending_review').length + pendingFilesCount;

  const isCompany = accountType === 'company_workspace';

  const companyNav: NavItem[] = [
    { path: '/app/dashboard',       label: 'Dashboard',        icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
    { path: '/app/projects',        label: 'Projects',         icon: <FolderKanban size={16} strokeWidth={1.5} /> },
    { path: '/app/change-requests', label: 'Change requests',  icon: <GitPullRequest size={16} strokeWidth={1.5} /> },
    { path: '/app/passport',        label: 'Brand passports',  icon: <ShieldCheck size={16} strokeWidth={1.5} /> },
    { path: '/app/guidelines',      label: 'Brand guidelines', icon: <BookOpen size={16} strokeWidth={1.5} /> },
    { path: '/app/history',         label: 'History & reports',icon: <History size={16} strokeWidth={1.5} /> },
    { path: '/app/settings',        label: 'Settings',         icon: <Settings size={16} strokeWidth={1.5} /> },
  ];

  const operationsNav: NavItem[] = [
    { path: '/app/dashboard',  label: 'Dashboard',              icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
    { path: '/app/inbox',      label: 'Admin inbox',            icon: <Inbox size={16} strokeWidth={1.5} /> },
    {
      path: '/app/approvals',
      label: 'Review queue',
      icon: <CheckSquare size={16} strokeWidth={1.5} />,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { path: '/app/passport',   label: 'Brand passports',        icon: <ShieldCheck size={16} strokeWidth={1.5} /> },
    { path: '/app/projects',   label: 'Projects',               icon: <FolderKanban size={16} strokeWidth={1.5} /> },
    { path: '/app/guidelines', label: 'Brand guidelines',       icon: <BookOpen size={16} strokeWidth={1.5} /> },
    { path: '/app/history',    label: 'History & reports',      icon: <History size={16} strokeWidth={1.5} /> },
    { path: '/app/settings',   label: 'Settings',               icon: <Settings size={16} strokeWidth={1.5} /> },
  ];

  const visibleNav = isCompany ? companyNav : operationsNav;
  const crumb = visibleNav.find(n => location.pathname.startsWith(n.path))?.label ?? 'Overview';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>

      {/* ── Top Bar (56px) ── */}
      <header style={{
        height: '56px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Left: Mobile hamburger + Logo + Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius)',
              color: 'var(--text-secondary)',
            }}
            className="mobile-hamburger-btn"
          >
            {sidebarOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>

          <Link to="/app/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <BrandLogo size="sm" />
          </Link>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="topbar-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }} className="breadcrumb-parent">
              {isCompany ? 'Company workspace' : 'BrandGuard ops'}
            </span>
            <ChevronRight size={13} color="var(--border-strong)" className="breadcrumb-parent" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{crumb}</span>
          </nav>
        </div>

        {/* Right: Account switcher + Theme toggle + Sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Account Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              id="account-switcher-btn"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '32px',
                padding: '0 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <Building size={14} color="var(--text-muted)" strokeWidth={1.5} />
              <span className="account-switcher-text">Acme Global Brands</span>
              <ChevronDown size={13} color="var(--text-muted)" strokeWidth={1.5} />
            </button>

            {accountDropdownOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                  onClick={() => setAccountDropdownOpen(false)}
                />
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-dropdown)',
                  minWidth: '260px',
                  zIndex: 150,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    Switch workspace
                  </div>

                  {[
                    {
                      id: 'company_workspace' as AccountType,
                      title: 'Company workspace',
                      desc: 'Client mode: drafting, reviewing, passports',
                    },
                    {
                      id: 'brandguard_operations' as AccountType,
                      title: 'BrandGuard operations',
                      desc: 'Ops mode: review queue, ledger curation, admin',
                    },
                  ].map(opt => {
                    const active = accountType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setAccountType(opt.id);
                          syncDemoAuthToken(opt.id);
                          setAccountDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          padding: '10px 12px',
                          textAlign: 'left',
                          backgroundColor: active ? 'var(--primary-subtle)' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {opt.title}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle Button (Plain icon button) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {theme === 'light' ? <Moon size={14} strokeWidth={1.5} /> : <Sun size={14} strokeWidth={1.5} />}
          </button>

          {/* Sign Out Link */}
          <Link
            to="/"
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
            title="Return to public site"
          >
            <LogOut size={13} strokeWidth={1.5} />
            <span className="sign-out-text">Sign out</span>
          </Link>
        </div>
      </header>

      {/* ── Body: Sidebar + Main Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Mobile Backdrop Overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── Sidebar (Solid Deep Ink #0F172A) ── */}
        <aside
          className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
          style={{
            width: '240px',
            backgroundColor: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--sidebar-border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Section header */}
          <div style={{
            padding: '16px 16px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--sidebar-text-muted)',
            letterSpacing: '0.02em',
          }}>
            {isCompany ? 'Workspace navigation' : 'Operations navigation'}
          </div>

          {/* Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
            {visibleNav.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                    backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--sidebar-indicator)' : '3px solid transparent',
                    paddingLeft: '8px',
                    transition: 'all var(--t-fast)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isActive ? 'var(--sidebar-indicator)' : 'var(--sidebar-text-muted)', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span style={{
                      backgroundColor: 'var(--danger)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--sidebar-border)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sidebar-text)', marginBottom: '3px' }}>
              {isCompany ? 'Acme Global Brands' : 'BrandGuard Operations'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--sidebar-text-muted)', lineHeight: 1.4 }}>
              {isCompany ? 'Enterprise tenant · Verified' : 'Operations reviewer · Full admin'}
            </div>
          </div>
        </aside>

        {/* ── Main Scrollable Content ── */}
        <main style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          maxWidth: '1440px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
        className="app-main-content"
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        .mobile-hamburger-btn { display: none; }
        @media (max-width: 1024px) {
          .mobile-hamburger-btn { display: flex !important; }
          .app-main-content { padding: 16px !important; }
        }
        @media (max-width: 640px) {
          .breadcrumb-parent { display: none !important; }
          .account-switcher-text { display: none !important; }
          .sign-out-text { display: none !important; }
        }
      `}</style>
    </div>
  );
};
