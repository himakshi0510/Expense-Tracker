import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/groups', label: 'Groups' },
  { to: '/recurring-bills', label: 'Recurring bills' },
  { to: '/profile', label: 'Profile' }
];

export default function Sidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-rule">
      <div className="sm:h-screen sm:sticky sm:top-0 flex flex-col justify-between py-4 px-4 sm:py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-4 sm:mb-8 px-2">
            Ledger
          </h1>

          <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-3 sm:py-2 rounded-md font-body text-sm whitespace-nowrap transition-colors flex items-center justify-center sm:justify-start ${
                    isActive
                      ? 'bg-ink text-surface'
                      : 'hover:bg-surface'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden sm:block space-y-2 px-2">
          <p className="text-xs text-muted font-body truncate">
            {user?.name}
          </p>
          <button
            onClick={toggleTheme}
            className="w-full text-left text-sm px-3 py-1.5 rounded-md border border-rule
                       hover:bg-surface transition-colors"
          >
            {theme === 'dark' ? '☾ Dark' : '☀ Light'}
          </button>
        </div>
      </div>
    </aside>
  );
}
