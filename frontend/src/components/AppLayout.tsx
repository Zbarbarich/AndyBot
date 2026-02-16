import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Ticket,
  ShoppingCart,
  Receipt,
  Package,
  Shield,
  ChevronLeft,
  CircleUser,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/orders', label: 'Begin Order', icon: ShoppingCart },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/admin', label: 'Admin', icon: Shield },
];

const sidebarLinkClass =
  'block w-full py-2.5 px-4 text-left text-dark-text hover:text-primary hover:bg-dark-surface-elevated transition-colors font-medium rounded-lg min-h-[44px] flex items-center gap-3';

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
          sidebarCollapsed ? 'lg:w-[56px]' : 'lg:w-52'
        }`}
      >
        <div className="p-3 flex items-center justify-between border-b border-dark-border min-h-[57px]">
          {!sidebarCollapsed && (
            <Link to="/" className="text-lg font-semibold text-primary truncate">
              19th Chamber
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="p-2 rounded text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-elevated shrink-0"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
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
        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center gap-4 px-4 sm:px-6 py-3 bg-dark-surface border-b border-dark-border sticky top-0 z-40">
          <Link to="/" className="text-lg font-semibold text-primary hover:text-primary-light shrink-0">
            The Nineteenth Chamber
          </Link>
          <div className="flex-1 max-w-md min-w-0">
            <GlobalSearch getToken={() => localStorage.getItem('token')} placeholder="Search customers, tickets, orders, invoices…" />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
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
            <button
              type="button"
              onClick={handleLogout}
              className="bg-transparent text-dark-text-muted hover:text-dark-text hover:underline min-h-[44px] px-2 font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Mobile: nav bar with search + hamburger */}
        <nav className="lg:hidden bg-dark-surface border-b border-dark-border sticky top-0 z-50">
          <div className="max-w-container mx-auto px-4 sm:px-6 py-2 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2 min-h-[44px]">
              <Link
                to="/"
                className="text-lg sm:text-xl font-semibold text-primary hover:text-primary-light transition-colors truncate flex items-center shrink-0"
                onClick={() => setMenuOpen(false)}
              >
                The Nineteenth Chamber
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-3 rounded-lg text-dark-text hover:bg-dark-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            <div className="w-full">
              <GlobalSearch
                getToken={() => localStorage.getItem('token')}
                placeholder="Search…"
                onResultClick={() => setMenuOpen(false)}
              />
            </div>
          </div>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed top-[7rem] right-0 bottom-0 w-full max-w-[280px] bg-dark-surface border-l border-dark-border z-50 shadow-xl lg:hidden overflow-y-auto">
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
