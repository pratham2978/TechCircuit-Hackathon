import React, { useState } from 'react';
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
  Sun,
  Moon,
  Info,
  CheckSquare,
  GitPullRequest,
  ShieldCheck,
  Inbox
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

  // Pending review items count across projects and documents
  const pendingFilesCount = projects.flatMap(p => p.files).filter(f => f.status === 'awaiting_verification' || f.status === 'in_progress').length;
  const pendingReviewCount = documents.filter(d => d.status === 'pending_review').length + pendingFilesCount;

  const isCompany = accountType === 'company_workspace';

  // Navigation items for both account workspaces
  const companyNav: NavItem[] = [
    { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/app/projects', label: 'Projects', icon: <FolderKanban size={18} /> },
    { path: '/app/change-requests', label: 'Change Requests', icon: <GitPullRequest size={18} /> },
    { path: '/app/passport', label: 'Brand Passports', icon: <ShieldCheck size={18} /> },
    { path: '/app/guidelines', label: 'Brand Guidelines', icon: <BookOpen size={18} /> },
    { path: '/app/history', label: 'History & Reports', icon: <History size={18} /> },
    { path: '/app/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const operationsNav: NavItem[] = [
    { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/app/inbox', label: 'Admin Inbox', icon: <Inbox size={18} /> },
    { 
      path: '/app/approvals', 
      label: 'Operations Review Queue', 
      icon: <CheckSquare size={18} />, 
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined 
    },
    { path: '/app/passport', label: 'Brand Passports', icon: <ShieldCheck size={18} /> },
    { path: '/app/projects', label: 'Projects', icon: <FolderKanban size={18} /> },
    { path: '/app/guidelines', label: 'Brand Guidelines', icon: <BookOpen size={18} /> },
    { path: '/app/history', label: 'History & Reports', icon: <History size={18} /> },
    { path: '/app/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const visibleNav = isCompany ? companyNav : operationsNav;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-warm-ivory)' }}>
      {/* Top Demo Banner with Account Selector & Theme Switch */}
      <div 
        style={{ 
          backgroundColor: 'var(--color-surface-subtle)', 
          color: 'var(--color-deep-ink)', 
          padding: '8px 24px', 
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-gray)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            className={`badge ${isCompany ? 'badge-verified' : 'badge-teal'}`}
            style={{ fontSize: '0.7rem' }}
          >
            {isCompany ? 'Company Workspace' : 'BrandGuard Operations'}
          </span>
          <span style={{ color: 'var(--color-muted-slate)' }}>
            {isCompany 
              ? 'Client account: Content drafting, Intent Cards, guideline viewing, and verification submissions.'
              : 'Operations account: Human review queue, claim ledger curation, rule approvals, and platform administration.'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Account Model Switcher */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              style={{ 
                backgroundColor: 'var(--color-surface-white)', 
                color: 'var(--color-deep-ink)',
                border: '1px solid var(--color-border-gray)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span>Switch Account: {isCompany ? 'Company Workspace' : 'BrandGuard Operations'}</span>
              <ChevronDown size={14} />
            </button>

            {accountDropdownOpen && (
              <div 
                style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '100%', 
                  marginTop: '6px',
                  backgroundColor: 'var(--color-surface-white)',
                  color: 'var(--color-deep-ink)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--color-border-gray)',
                  minWidth: '280px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '8px 14px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-slate)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  Active Account Model
                </div>
                
                <button
                  onClick={() => {
                    setAccountType('company_workspace');
                    syncDemoAuthToken('company_workspace');
                    setAccountDropdownOpen(false);
                  }}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    width: '100%', 
                    padding: '10px 14px',
                    textAlign: 'left',
                    backgroundColor: isCompany ? 'var(--color-signal-coral-subtle)' : 'transparent',
                    borderBottom: '1px solid var(--color-border-subtle)'
                  }}
                >
                  <strong style={{ fontSize: '0.85rem', color: isCompany ? 'var(--color-signal-coral)' : 'var(--color-deep-ink)' }}>
                    Company Workspace
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    Client mode: drafting, reviewing findings, passport records
                  </span>
                </button>

                <button
                  onClick={() => {
                    setAccountType('brandguard_operations');
                    syncDemoAuthToken('brandguard_operations');
                    setAccountDropdownOpen(false);
                  }}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    width: '100%', 
                    padding: '10px 14px',
                    textAlign: 'left',
                    backgroundColor: !isCompany ? 'var(--color-evidence-teal-subtle)' : 'transparent'
                  }}
                >
                  <strong style={{ fontSize: '0.85rem', color: !isCompany ? 'var(--color-evidence-teal)' : 'var(--color-deep-ink)' }}>
                    BrandGuard Operations
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    Operations mode: review queue, ledger curation, administration
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ 
              padding: '6px', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--color-surface-white)',
              border: '1px solid var(--color-border-gray)',
              color: 'var(--color-deep-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} color="var(--color-warning)" />}
          </button>
        </div>
      </div>

      {/* Main App Top Bar */}
      <header 
        style={{ 
          backgroundColor: 'var(--color-surface-white)', 
          borderBottom: '1px solid var(--color-border-gray)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-toggle"
            style={{ display: 'none', padding: '6px', color: 'var(--color-deep-ink)' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/app/dashboard" style={{ textDecoration: 'none' }}>
            <BrandLogo size="sm" />
          </Link>

          {/* Workspace Switcher */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '4px 12px',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-gray)',
              fontSize: '0.85rem'
            }}
          >
            <Building size={14} color="var(--color-evidence-teal)" />
            <span style={{ fontWeight: 600, color: 'var(--color-deep-ink)' }}>Acme Global Brands</span>
            <span style={{ color: 'var(--color-muted-slate)' }}>/</span>
            <span style={{ color: 'var(--color-muted-slate)' }}>Global Enterprise</span>
          </div>
        </div>

        {/* Right user controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link 
            to="/" 
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
            title="Return to Public Website"
          >
            <LogOut size={14} />
            <span>Public Site</span>
          </Link>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Navigation Sidebar */}
        <aside 
          style={{ 
            width: '250px', 
            backgroundColor: 'var(--color-surface-white)', 
            borderRight: '1px solid var(--color-border-gray)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
          }}
          className={sidebarOpen ? 'sidebar-open' : ''}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ padding: '4px 12px 10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.05em' }}>
              {isCompany ? 'Company Portal' : 'Operations Cockpit'}
            </div>

            {visibleNav.map((item) => {
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
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                    backgroundColor: isActive ? 'var(--color-surface-subtle)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isActive ? 'var(--color-signal-coral)' : 'inherit' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span 
                      style={{ 
                        backgroundColor: 'var(--color-signal-coral)', 
                        color: '#FFFFFF', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        borderRadius: 'var(--radius-full)',
                        padding: '1px 7px'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div 
            style={{ 
              padding: '12px', 
              backgroundColor: 'var(--color-surface-subtle)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-gray)',
              fontSize: '0.75rem',
              color: 'var(--color-muted-slate)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={13} color="var(--color-evidence-teal)" />
              <span>Active Scope</span>
            </div>
            <span>
              {isCompany 
                ? 'Client permissions: You can author content, view claims, and inspect certified Brand Passports.' 
                : 'Operations permissions: You can approve rules, curate the claim ledger, and render final review decisions.'}
            </span>
          </div>
        </aside>

        {/* Dynamic Route Content Area */}
        <main style={{ flex: 1, padding: '32px 32px 48px', overflowY: 'auto', maxWidth: '1440px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
