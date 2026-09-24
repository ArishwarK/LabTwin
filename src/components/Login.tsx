import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export interface UserAccount {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'student';
  department: string;
  email?: string;
  rollNumber?: string;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    username: 'admin',
    password: 'admin',
    name: 'Dr. Faculty Admin',
    role: 'admin',
    department: 'Computer Science & Engineering',
    email: 'admin@cit.edu.in'
  },
  {
    username: 'faculty',
    password: 'faculty123',
    name: 'Dr. K. Arun',
    role: 'admin',
    department: 'Artificial Intelligence & Data Science',
    email: 'arun.k@cit.edu.in'
  },
  {
    username: 'student',
    password: 'student',
    name: 'Student Scholar',
    role: 'student',
    department: 'B.E. Computer Science',
    email: 'student@cit.edu.in',
    rollNumber: '71762105100'
  },
  {
    username: 'arish',
    password: 'password',
    name: 'Arish Kumar',
    role: 'student',
    department: 'B.Tech IT',
    email: 'arish2712007@gmail.com',
    rollNumber: '71762205042'
  }
];

const STORAGE_KEY_USERS = 'cit_labtwin_registered_users_v2';

function getStoredUsers(): UserAccount[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_ACCOUNTS;
}

function saveStoredUsers(users: UserAccount[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
  } catch {
    // ignore
  }
}

interface LoginProps {
  onLogin: (username: string, role: 'admin' | 'student') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Login({ onLogin, theme, onToggleTheme }: LoginProps) {
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student'>('admin');
  
  // Sign In inputs
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engineering');
  const [regPassword, setRegPassword] = useState('');

  // Alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => getStoredUsers());

  useEffect(() => {
    saveStoredUsers(registeredUsers);
  }, [registeredUsers]);

  const selectRole = (role: 'admin' | 'student') => {
    setSelectedRole(role);
    setErrorMessage('');
    if (mode === 'signin') {
      if (role === 'admin') {
        setUsername('admin');
        setPassword('admin');
      } else {
        setUsername('student');
        setPassword('student');
      }
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    const found = registeredUsers.find(u => u.username.toLowerCase() === cleanUser);
    if (!found) {
      setErrorMessage('Account not found. Please verify username or register.');
      return;
    }

    if (found.password !== cleanPass) {
      setErrorMessage('Incorrect password.');
      return;
    }

    if (found.role !== selectedRole) {
      setErrorMessage(`This account is registered as ${found.role === 'admin' ? 'Faculty' : 'Student'}. Please switch the role tab.`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      onLogin(found.name, found.role);
    }, 250);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = regName.trim();
    const cleanUser = regUsername.trim().toLowerCase();
    const cleanPass = regPassword.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }

    if (cleanPass.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    if (registeredUsers.some(u => u.username.toLowerCase() === cleanUser)) {
      setErrorMessage('This username is already registered.');
      return;
    }

    const newAccount: UserAccount = {
      name: cleanName,
      username: cleanUser,
      role: selectedRole,
      department: regDepartment,
      password: cleanPass
    };

    const updated = [...registeredUsers, newAccount];
    setRegisteredUsers(updated);
    saveStoredUsers(updated);

    setSuccessMessage('Account created successfully. Signing in...');
    setIsLoading(true);
    setTimeout(() => {
      onLogin(cleanName, selectedRole);
    }, 400);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 transition-colors font-sans ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Bar */}
      <header className="w-full max-w-5xl flex justify-between items-center py-2">
        <div className="flex items-center gap-2.5">
          <img 
            src="/cit_logo.jpg" 
            alt="CIT"
            className="h-8 w-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 bg-white"
            referrerPolicy="no-referrer"
          />
          <span className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">
            Coimbatore Institute of Technology
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark 
              ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 shadow-xs'
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-sm my-auto">
        <div className={`p-7 rounded-2xl border transition-all ${
          isDark 
            ? 'bg-slate-900/90 border-slate-800 shadow-xl' 
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}>

          {/* Heading */}
          <div className="text-center mb-5">
            <h1 className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Lab<span className={isDark ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold'}>Twin</span>
            </h1>
          </div>

          {/* Role Segmented Switch */}
          <div className="mb-5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => selectRole('admin')}
              className={`py-2 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => selectRole('student')}
              className={`py-2 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Student
            </button>
          </div>

          {/* Error / Success alerts */}
          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="leading-tight">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username or ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    autoComplete="username"
                    className={`w-full px-3 py-2 pl-9 rounded-xl text-xs transition-colors border focus:outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className={`w-full px-3 py-2 pl-9 pr-9 rounded-xl text-xs transition-colors border focus:outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : `Sign in as ${selectedRole === 'admin' ? 'Faculty' : 'Student'}`}</span>
                {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Dr. K. Arun or Student Name"
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username / Roll ID
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. 71762105101"
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Artificial Intelligence & Data Science">AI & DS</option>
                  <option value="Electronics & Communication">ECE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 4 characters"
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
                {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}

          {/* Toggle between Sign In & Register */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            {mode === 'signin' ? (
              <p className="text-slate-500 dark:text-slate-400">
                New user?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Register an account
                </button>
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 text-[11px] text-slate-400 dark:text-slate-500">
        Coimbatore Institute of Technology · Autonomous Academic Block
      </footer>

    </div>
  );
}
