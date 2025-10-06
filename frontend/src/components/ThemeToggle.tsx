import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 p-2 rounded-md transition-colors duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        text-gray-600 dark:text-gray-400
        hover:text-gray-900 dark:hover:text-gray-100
        ${className}
      `}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;