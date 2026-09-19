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
  // Initialize with active admin session so application is instantly visible and usable
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = safeGetItem('college_lab_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.username && (parsed?.role === 'admin' || parsed?.role === 'student')) {
          return parsed;
        }
      } catch {
        // Fallback to default
      }
    }
    // Default to faculty admin for instant working preview
    return {
      username: 'Dr. Faculty Admin',
      role: 'admin',
    };
  });
  
  // Theme state: default to 'light' for clean college enterprise webapp, toggleable to 'dark'
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

  useEffect(() => {
    if (session) {
      safeSetItem('college_lab_session', JSON.stringify(session));
    }
  }, [session]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (username: string, role: 'admin' | 'student') => {
    const newSession = { username, role };
    setSession(newSession);
    safeSetItem('college_lab_session', JSON.stringify(newSession));
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
    safeSetItem('college_lab_session', JSON.stringify(updatedSession));
  };

  return (
    <div id="app-root-container" className={theme === 'dark' ? 'dark' : ''}>
      {session ? (
        <Dashboard
          currentUser={session}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <Login 
          onLogin={handleLogin} 
          theme={theme} 
          onToggleTheme={toggleTheme} 
        />
      )}
    </div>
  );
}

