import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Ticket,
  ShoppingCart,
  Receipt,
  Package,
  ShoppingBag,
  Shield,
  ChevronLeft,
  ArrowLeft,
  CircleUser,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import GlobalSearch from './GlobalSearch';
import AndyLogo from './AndyLogo';
import ThemeToggle from './ThemeToggle';
import { getMobileNavTarget, getPageTitle } from '../utils/mobileNav';
import andyHead from '../assets/andy-head.svg';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/purchasing', label: 'Purchasing', icon: ShoppingBag },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/admin', label: 'Admin', icon: Shield },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = usePreferences();
  const pageTitle = getPageTitle(location.pathname);
  const mobileNav = getMobileNavTarget(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setProfileOpen(false);
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinkClass = (to: string) => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return `nav-link ${active ? 'nav-link-active' : ''}`;
  };

  const renderNavLinks = (collapsed = false) =>
    navLinks.map(({ to, label, icon: Icon }) => (
      <Link
        key={to}
        to={to}
        className={`${navLinkClass(to)} ${collapsed ? 'justify-center px-2' : ''}`}
        title={collapsed ? label : undefined}
        onClick={() => setMenuOpen(false)}
      >
        <Icon className="w-5 h-5 shrink-0 text-primary" />
        {!collapsed && <span>{label}</span>}
      </Link>
    ));

  const profileMenu = (
    <>
      <div className="px-4 py-2 border-b border-border text-sm text-text-muted">
        Logged in as{' '}
        <span className="font-medium text-text">{user?.userName ?? user?.email ?? 'User'}</span>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={handleLogout}
        className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface-elevated flex items-center gap-2 min-h-[44px]"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </>
  );

  const mobileNavControl =
    mobileNav.kind === 'none' ? (
      <span className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0" aria-hidden>
        <img src={andyHead} alt="" className="h-7 w-7 object-contain drop-shadow-sm" />
      </span>
    ) : (
      <button
        type="button"
        onClick={() => navigate(mobileNav.to)}
        className="btn-icon-primary shrink-0"
        aria-label={mobileNav.label}
      >
        {mobileNav.kind === 'home' ? (
          <img src={andyHead} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <ArrowLeft className="w-5 h-5" />
        )}
      </button>
    );

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:grid lg:grid-cols-[auto_1fr]">
      <aside
        className={`app-sidebar hidden lg:flex flex-col border-r transition-[width] duration-200 sticky top-0 self-start h-dvh max-h-dvh z-30 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'
        }`}
      >
        <div
          className={`app-topbar ${
            sidebarCollapsed
              ? 'relative flex items-center justify-center px-1'
              : 'flex items-center gap-1 px-2'
          }`}
        >
          {sidebarCollapsed ? (
            <>
              <AndyLogo size="icon" showWordmark={false} linkToHome collapsed />
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="btn-sidebar-chevron absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text"
                aria-label="Expand sidebar"
              >
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0 flex items-center justify-center">
                <AndyLogo size="sm" showWordmark layout="row" linkToHome />
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="btn-sidebar-chevron shrink-0 p-1 rounded text-text-muted hover:text-text"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">{renderNavLinks(sidebarCollapsed)}</nav>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="hidden lg:flex app-header app-topbar items-center gap-3 px-4 sm:px-5">
          <h1 className="flex-1 min-w-0 text-xs font-display font-semibold text-text truncate tracking-wide uppercase opacity-90">
            {pageTitle}
          </h1>
          <div className="shrink-0 w-full max-w-md">
            <GlobalSearch
              getToken={() => localStorage.getItem('token')}
              placeholder="Search…"
              className="w-full"
              compact
            />
          </div>
          <div className="flex-1 flex justify-end" ref={profileRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated h-8 w-8 flex items-center justify-center"
                aria-label="Profile"
                aria-expanded={profileOpen}
              >
                <CircleUser className="w-4 h-4" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 py-2 w-56 glass-panel z-50 overflow-hidden">
                  {profileMenu}
                </div>
              )}
            </div>
          </div>
        </header>

        <nav className="lg:hidden app-header safe-area-pt">
          <div className="app-topbar px-3 sm:px-4 flex items-center gap-2">
            {mobileNavControl}
            <div className="flex-1 min-w-0">
              <GlobalSearch
                getToken={() => localStorage.getItem('token')}
                placeholder="Search…"
                onResultClick={() => setMenuOpen(false)}
                compact
              />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2.5 rounded-lg text-text hover:bg-surface-elevated min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed top-0 left-0 bottom-0 w-full max-w-[300px] glass-panel z-50 lg:hidden overflow-y-auto rounded-none rounded-r-2xl border-l-0">
              <div className="p-4 border-b border-border flex justify-center">
                <AndyLogo size="md" showWordmark showTagline />
              </div>
              <div className="py-3 px-2 space-y-1">{renderNavLinks()}</div>
              <div className="mt-4 pt-4 border-t border-border mx-2">{profileMenu}</div>
            </div>
          </>
        )}

        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
