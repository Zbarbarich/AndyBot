import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NavigationBar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setMenuOpen(false);
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/customers', label: 'Customers' },
    { to: '/tickets', label: 'Tickets' },
    { to: '/admin', label: 'Admin' },
  ];

  const linkClass = "block w-full py-3 px-4 text-left text-dark-text hover:text-primary hover:bg-dark-surface-elevated transition-colors font-medium rounded-lg min-h-[44px] flex items-center";
  const desktopLinkClass = "text-dark-text hover:text-primary transition-colors font-medium py-2 px-3 rounded min-h-[44px] min-w-[44px] flex items-center justify-center";

  return (
    <nav className="bg-dark-surface border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-4">
        <Link
          to="/"
          className="text-lg sm:text-xl font-semibold text-primary hover:text-primary-light transition-colors truncate min-h-[44px] flex items-center"
          onClick={() => setMenuOpen(false)}
        >
          The Nineteenth Chamber
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={desktopLinkClass}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary min-h-[44px] min-w-[44px] flex items-center justify-center px-4"
          >
            Logout
          </button>
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="lg:hidden p-3 rounded-lg text-dark-text hover:bg-dark-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-[57px] right-0 bottom-0 w-full max-w-[280px] bg-dark-surface border-l border-dark-border z-50 shadow-xl lg:hidden overflow-y-auto safe-area-pb">
            <div className="py-4 px-2">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-2 py-3 px-4 text-left text-dark-text hover:bg-dark-surface-elevated transition-colors font-medium rounded-lg min-h-[44px] flex items-center border border-dark-border"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default NavigationBar;
