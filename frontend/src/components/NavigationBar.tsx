import { Link, useNavigate } from 'react-router-dom';
import ThemeSelector from './ThemeSelector';

const NavigationBar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-dark-surface border-b border-dark-border">
      <div className="max-w-container mx-auto px-md py-sm flex justify-between items-center">
        <Link to="/" className="text-xl font-semibold text-primary hover:text-primary-light transition-colors">
          The Nineteenth Chamber
        </Link>
        <div className="flex items-center gap-md">
          <ThemeSelector />
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
