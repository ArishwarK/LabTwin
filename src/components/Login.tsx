import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, LogIn, Sun, Moon, Building2, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, role: 'admin' | 'student') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Login({ onLogin, theme, onToggleTheme }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [role, setRole] = useState<'admin' | 'student'>('admin');
  const [error, setError] = useState('');

  const isDark = theme === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide valid portal credentials.');
      return;
    }

    if (role === 'admin') {
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        onLogin('Dr. Faculty Admin', 'admin');
      } else {
        setError('Invalid Faculty Administrator credentials. Use "admin" / "admin".');
      }
    } else {
      if (username.toLowerCase() === 'student' && password === 'student') {
        onLogin('Student Scholar', 'student');
      } else {
        setError('Invalid Student portal credentials. Use "student" / "student".');
      }
    }
  };

  const fillCredentials = (selectedRole: 'admin' | 'student') => {
    setRole(selectedRole);
    setUsername(selectedRole);
    setPassword(selectedRole);
    setError('');
  };

  const quickDirectLogin = (selectedRole: 'admin' | 'student') => {
    if (selectedRole === 'admin') {
      onLogin('Dr. Faculty Admin', 'admin');
    } else {
      onLogin('Student Scholar', 'student');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
          }`}
          title="Toggle Light / Dark Theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className={`w-full max-w-md rounded-3xl border shadow-xl overflow-hidden transition-colors ${
        isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        
        {/* LabTwin Header */}
        <div className={`p-6 text-center border-b ${
          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-700 to-blue-800 text-white border-blue-900'
        }`}>
          {/* CIT Logo */}
          <div className="relative inline-block mb-3">
            <img 
              src="/cit_logo.jpg" 
              alt="Coimbatore Institute of Technology Seal"
              className="h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-white/30 mx-auto bg-white"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                COIMBATORE INSTITUTE OF TECHNOLOGY
              </span>
            </div>
            
            {/* LabTwin Name */}
            <div className="flex items-center justify-center text-2xl font-bold tracking-tight text-white pt-1">
              <span>Lab</span>
              <span className="text-amber-300">Twin</span>
            </div>
            
            
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          
          {/* Quick 1-Click Access */}
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 text-center ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Select Account Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="login-quick-admin-btn"
                onClick={() => fillCredentials('admin')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-blue-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/60'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Faculty Admin</span>
              </button>

              <button
                type="button"
                id="login-quick-student-btn"
                onClick={() => fillCredentials('student')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'student'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-blue-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/60'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Student View</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-mono">
                {error}
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Institutional Username / ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className={`w-full px-3 py-2.5 pl-9 rounded-xl text-xs font-mono transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
                <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className={`w-full px-3 py-2.5 pl-9 rounded-xl text-xs font-mono transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              <span>Enter {role === 'admin' ? 'Faculty Admin Dashboard' : 'Student View'}</span>
            </button>
          </form>

          {/* Instant 1-Click Entry option */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
            <div className="text-center mb-2">
              <span className="text-[11px] font-mono text-slate-400">One-click Instant Demo Sign In</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickDirectLogin('admin')}
                className="py-2 px-2 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Instant Faculty Access
              </button>
              <button
                type="button"
                onClick={() => quickDirectLogin('student')}
                className="py-2 px-2 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Instant Student Access
              </button>
            </div>
          </div>

        </div>

      </div>

      <div className="text-center mt-6 text-xs text-slate-500 font-mono">
        Coimbatore Institute of Technology • Autonomous Govt. Aided College Portal
      </div>
    </div>
  );
}
