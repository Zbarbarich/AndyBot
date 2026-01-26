import { useTheme } from '../context/ThemeContext';

const ThemeSelector = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-secondary"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeSelector;
