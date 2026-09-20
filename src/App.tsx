import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

interface UserSession {
  username: string;
  role: 'admin' | 'student';
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.warn('Storage read restricted in this environment:', err);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn('Storage write restricted in this environment:', err);
  }
}

export default function App() {
  // Session starts as null so the login page MUST open first. No access without login!
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Theme state: default to 'light' for clean, modern aesthetic, toggleable to 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeGetItem('college_lab_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    safeSetItem('college_lab_theme', theme);
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (username: string, role: 'admin' | 'student') => {
    const newSession = { username, role };
    setSession(newSession);
  };

  const handleLogout = () => {
    setSession(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('college_lab_session');
      }
    } catch {
      // Ignore
    }
  };

  const handleSwitchRole = (role: 'admin' | 'student') => {
    const updatedSession: UserSession = {
      role: role,
      username: role === 'admin' ? 'Dr. Faculty Admin' : 'Student Scholar'
    };
    setSession(updatedSession);
  };

  return (
    <div id="app-root-container" className={theme === 'dark' ? 'dark' : ''}>
      {!session ? (
        <Login
          onLogin={handleLogin}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <Dashboard
          currentUser={session}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}
