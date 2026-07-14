import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface-elevated flex items-center gap-2 min-h-[44px] transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
};

export default ThemeToggle;
