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
  CircleUser,
  LogOut,
  Menu,
  X,
  Bot,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'The Yard';
  if (pathname === '/customers') return 'Customers';
  if (pathname === '/customers/new') return 'New Customer';
  if (/^\/customers\/\d+$/.test(pathname)) return 'Customer';
  if (pathname === '/tickets') return 'Tickets';
  if (pathname === '/tickets/new') return 'New Ticket';
  if (/^\/tickets\/\d+\/edit$/.test(pathname)) return 'Edit Ticket';
  if (/^\/tickets\/\d+$/.test(pathname)) return 'Ticket';
  if (pathname === '/orders') return 'Begin Order';
  if (pathname === '/orders/new' || /^\/orders\/\d+$/.test(pathname)) return 'Order';
  if (/^\/orders\/\d+\/billing$/.test(pathname)) return 'Billing';
  if (pathname === '/invoices') return 'Invoices';
  if (pathname === '/invoices/bill-order') return 'Bill an order';
  if (/^\/invoices\/\d+$/.test(pathname)) return 'Invoice';
  if (pathname === '/items') return 'Items';
  if (pathname === '/items/new') return 'New Item';
  if (/^\/items\/\d+\/edit$/.test(pathname)) return 'Edit Item';
  if (/^\/items\/\d+$/.test(pathname)) return 'Item';
  if (pathname === '/admin') return 'Admin';
  if (pathname === '/admin/users/new') return 'Create User';
  if (pathname === '/purchasing') return 'Purchasing';
  if (/^\/purchasing\/\d+$/.test(pathname)) return 'Purchase Order';
  return 'A.N.D.Y.';
}

const navLinks = [
  { to: '/', label: 'The Yard', icon: Home },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/orders', label: 'Begin Order', icon: ShoppingCart },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/purchasing', label: 'Purchasing', icon: ShoppingBag },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/admin', label: 'Admin', icon: Shield },
];

const sidebarLinkClass =
  'block w-full py-2.5 px-4 text-left text-dark-text hover:text-primary hover:bg-dark-surface-elevated transition-colors font-medium rounded-lg min-h-[44px] flex items-center gap-3';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const pageTitle = getPageTitle(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col lg:grid lg:grid-cols-[auto_1fr]">
      {/* Desktop sidebar (lg only) */}
      <aside
        className={`hidden lg:flex flex-col border-r border-dark-border bg-dark-surface transition-[width] duration-200 ${
          sidebarCollapsed ? 'lg:w-[96px]' : 'lg:w-52'
        }`}
      >
        <div className={`p-2 border-b border-dark-border min-h-[44px] ${sidebarCollapsed ? 'grid grid-cols-[1fr_auto_1fr] items-center gap-1' : 'flex items-center gap-2'}`}>
          {sidebarCollapsed ? (
            <>
              <div className="min-w-0" aria-hidden="true" />
              <Link to="/" className="flex items-center justify-center p-1 ml-5 rounded text-primary hover:bg-dark-surface-elevated" aria-label="The Yard">
                <Bot className="w-6 h-6 shrink-0 text-primary" />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="btn-sidebar-chevron flex items-center justify-center p-2 bg-transparent border-0 rounded text-dark-text-muted hover:text-dark-text focus:outline-none focus:ring-0 justify-self-end"
                aria-label="Expand sidebar"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="min-w-0 flex-1 flex flex-col justify-center p-1 py-0.5 ml-8">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-5 h-5 shrink-0 text-primary -mt-1" />
                  <span className="text-lg font-semibold text-primary leading-tight">A.N.D.Y.</span>
                </div>
                <span className="text-[10px] text-dark-text-muted leading-tight break-words line-clamp-2 mt-0.5 text-center block">Advanced Notation & Deployment Yard</span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="btn-sidebar-chevron shrink-0 p-2 bg-transparent border-0 rounded text-dark-text-muted hover:text-dark-text focus:outline-none focus:ring-0 flex items-center justify-center"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`${sidebarLinkClass} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 text-primary" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Right side: top bar + main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Desktop top bar - thin: title left, search centered in bar, profile far right */}
        <header className="hidden lg:flex items-center gap-3 px-4 sm:px-6 py-1.5 min-h-[44px] bg-dark-surface border-b border-dark-border sticky top-0 z-40">
          <div className="flex-1 min-w-0 flex items-center">
            <span className="text-sm font-semibold text-dark-text whitespace-nowrap" aria-hidden="true">
              {pageTitle}
            </span>
          </div>
          <div className="shrink-0 w-full max-w-2xl">
            <GlobalSearch getToken={() => localStorage.getItem('token')} placeholder="Search customers, tickets, orders, invoices, POs, items…" className="w-full" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-end">
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="p-2 rounded-lg text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-elevated flex items-center gap-2"
                aria-label="Profile"
                aria-expanded={profileOpen}
              >
                <CircleUser className="w-5 h-5" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 py-2 w-56 rounded-lg border border-dark-border bg-dark-surface shadow-xl z-50">
                  <div className="px-4 py-2 border-b border-dark-border text-sm text-dark-text-muted">
                    Logged in as <span className="font-medium text-dark-text">{user?.userName ?? user?.email ?? 'User'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-dark-text hover:bg-dark-surface-elevated flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile: single-line nav bar — title, search, hamburger */}
        <nav className="lg:hidden bg-dark-surface border-b border-dark-border sticky top-0 z-50">
          <div className="max-w-container mx-auto px-3 sm:px-4 py-1 flex items-center gap-2 min-h-[40px]">
            <span className="text-sm font-semibold text-dark-text truncate shrink-0 max-w-[5rem] sm:max-w-[7rem]" aria-hidden="true">
              {pageTitle}
            </span>
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
              className="p-2 rounded-lg text-dark-text hover:bg-dark-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed top-0 right-0 bottom-0 w-full max-w-[280px] bg-dark-surface border-l border-dark-border z-50 shadow-xl lg:hidden overflow-y-auto">
                <div className="py-4 px-2">
                  {user && (
                    <div className="px-4 py-2 mb-2 text-sm text-dark-text-muted border-b border-dark-border">
                      Logged in as <span className="font-medium text-dark-text">{user.userName ?? user.email}</span>
                    </div>
                  )}
                  {navLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className={sidebarLinkClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5 shrink-0 text-primary" />
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full mt-2 py-3 px-4 text-left text-dark-text hover:bg-dark-surface-elevated transition-colors font-medium rounded-lg min-h-[44px] flex items-center gap-2 border border-dark-border"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </nav>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
