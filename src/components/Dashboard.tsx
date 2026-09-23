import React, { useState, useEffect } from 'react';
import { COLLEGE_BLOCK, INITIAL_DEVICES, INITIAL_LOGS } from '../data/mockData';
import { INITIAL_BOOKINGS } from '../data/mockBookings';
import { LabDevice, ActivityLog, LabBookingSlot, FloorLabInfo } from '../types';
import LabFloorPlan from './LabFloorPlan';
import LabCalendarBooking from './LabCalendarBooking';
import { 
  subscribeToBookings, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore,
  subscribeToDeviceStates,
  saveDeviceStateToFirestore,
  subscribeToActivityLogs,
  saveActivityLogToFirestore
} from '../services/firestore';
import { 
  Building2, 
  Power, 
  Wifi, 
  Zap, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Sun, 
  Moon, 
  LogOut, 
  AlertCircle,
  Monitor, 
  CheckCircle2, 
  Calendar, 
  Users, 
  ChevronRight, 
  Sparkles,
  X,
  Layers,
  GraduationCap,
  Laptop,
  ArrowRight,
  Sliders,
  LogIn,
  LayoutGrid,
  Menu,
  ChevronDown,
  Database
} from 'lucide-react';

interface UserSession {
  username: string;
  role: 'admin' | 'student';
}

interface DashboardProps {
  currentUser: UserSession;
  onLogout: () => void;
  onSwitchRole: (role: 'admin' | 'student') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type ActiveViewTab = 'home' | 'twin' | 'calendar';

export default function Dashboard({
  currentUser,
  onLogout,
  onSwitchRole,
  theme,
  onToggleTheme
}: DashboardProps) {
  const isDark = theme === 'dark';

  // Navigation tab: 'home' (Clean overview & explore), 'twin' (interactive floor plan), 'calendar' (slot booking)
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('home');
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number>(2); // Default Floor 2 (AI Lab)
  const [floorFilter, setFloorFilter] = useState<string>('all');
  
  // Search query from Nav Bar
  const [navSearchQuery, setNavSearchQuery] = useState<string>('');

  // Nav Bar Menu Sidebar state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Google-style user profile initial and institutional identity
  const userInitial = (currentUser.username || 'User').trim().charAt(0).toUpperCase();

  // Bookings state (initialized from storage, synchronized via Firestore)
  const [bookings, setBookings] = useState<LabBookingSlot[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('cit_lab_bookings_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load bookings from storage', e);
    }
    return INITIAL_BOOKINGS;
  });

  // Sync bookings to localStorage cache
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cit_lab_bookings_v2', JSON.stringify(bookings));
      }
    } catch (e) {
      console.warn('Failed to save bookings to storage', e);
    }
  }, [bookings]);

  // Devices & Logs state
  const [devices, setDevices] = useState<LabDevice[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [selectedDevice, setSelectedDevice] = useState<LabDevice | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);

  // Firestore Realtime Synchronization
  useEffect(() => {
    // 1. Subscribe to Bookings from Firestore
    const unsubBookings = subscribeToBookings(
      (remoteBookings) => {
        if (remoteBookings && remoteBookings.length > 0) {
          setBookings(remoteBookings);
        } else {
          // Seed Firestore with initial schedule if collection is empty
          INITIAL_BOOKINGS.forEach((initB) => {
            saveBookingToFirestore(initB).catch(() => {});
          });
        }
        setIsFirestoreConnected(true);
      },
      (err) => {
        console.warn('Firestore bookings sync error:', err);
      }
    );

    // 2. Subscribe to Device States from Firestore
    const unsubDevices = subscribeToDeviceStates((stateMap) => {
      setDevices(prev => 
        prev.map(d => {
          if (stateMap[d.id]) {
            return {
              ...d,
              isOnline: stateMap[d.id].isOnline ?? d.isOnline,
              isPoweredOn: stateMap[d.id].isPoweredOn ?? d.isPoweredOn,
              energyUsage: stateMap[d.id].energyUsage ?? d.energyUsage,
            };
          }
          return d;
        })
      );
    });

    // 3. Subscribe to Activity Logs from Firestore
    const unsubLogs = subscribeToActivityLogs((remoteLogs) => {
      if (remoteLogs && remoteLogs.length > 0) {
        setLogs(remoteLogs);
      }
    });

    return () => {
      unsubBookings();
      unsubDevices();
      unsubLogs();
    };
  }, []);

  // Power confirmation modal state
  const [powerActionPending, setPowerActionPending] = useState<{
    type: 'single' | 'master_off' | 'master_on';
    deviceId?: string;
    deviceName?: string;
  } | null>(null);

  // Wattage drift simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => 
        prev.map(d => {
          if (d.isPoweredOn && d.category !== 'safety') {
            const drift = Math.floor(Math.random() * 5) - 2;
            const nextWatts = Math.max(20, d.energyUsage + drift);
            return { ...d, energyUsage: nextWatts };
          }
          return d;
        })
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Find the selected floor's laboratory
  const currentFloor = COLLEGE_BLOCK.floors.find(f => f.floorNumber === selectedFloorNumber) || COLLEGE_BLOCK.floors[0];
  const currentLabDevices = devices.filter(d => d.floorNumber === currentFloor.floorNumber);

  useEffect(() => {
    if (currentLabDevices.length > 0 && (!selectedDevice || selectedDevice.floorNumber !== selectedFloorNumber)) {
      setSelectedDevice(currentLabDevices[0]);
    }
  }, [selectedFloorNumber]);

  // Booking handlers with Firestore sync
  const handleAddBooking = (newBooking: LabBookingSlot) => {
    setBookings(prev => [newBooking, ...prev]);
    saveBookingToFirestore(newBooking).catch(err => console.warn('Firestore booking save error:', err));

    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      performedBy: currentUser.username,
      role: currentUser.role,
      labId: newBooking.labId,
      floorNumber: newBooking.floorNumber,
      deviceId: newBooking.id,
      deviceName: `${newBooking.courseCode} Reservation`,
      eventType: 'user',
      description: `Lab slot reserved on ${newBooking.date} (${newBooking.startTime} - ${newBooking.endTime}).`
    };
    setLogs(prev => [newLog, ...prev]);
    saveActivityLogToFirestore(newLog).catch(err => console.warn('Firestore log save error:', err));
  };

  const handleCancelBooking = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    deleteBookingFromFirestore(bookingId).catch(err => console.warn('Firestore booking delete error:', err));

    if (target) {
      const newLog: ActivityLog = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        performedBy: currentUser.username,
        role: currentUser.role,
        labId: target.labId,
        floorNumber: target.floorNumber,
        deviceId: target.id,
        deviceName: `${target.courseCode} Released`,
        eventType: 'user',
        description: `Slot reservation on ${target.date} was cancelled and released.`
      };
      setLogs(prev => [newLog, ...prev]);
      saveActivityLogToFirestore(newLog).catch(err => console.warn('Firestore log save error:', err));
    }
  };

  // Toggle Power (Admin only) with Firestore persistence
  const handleTogglePower = (deviceId: string) => {
    if (currentUser.role !== 'admin') {
      alert('Only Faculty Administrators can toggle hardware power relays.');
      return;
    }

    setDevices(prev => 
      prev.map(d => {
        if (d.id === deviceId) {
          const nextState = !d.isPoweredOn;
          const baseWatt = d.category === 'server' ? 480 : d.category === 'peripheral' ? 85 : 120;
          const newUsage = nextState ? baseWatt + Math.floor(Math.random() * 25) : 0;
          const nowStr = new Date().toISOString();

          const updated = { ...d, isPoweredOn: nextState, energyUsage: newUsage, lastReboot: nowStr };
          if (selectedDevice?.id === deviceId) {
            setSelectedDevice(updated);
          }
          saveDeviceStateToFirestore(updated).catch(err => console.warn('Firestore device update error:', err));
          return updated;
        }
        return d;
      })
    );
  };

  // Toggle Online / Offline Ping (Admin only)
  const handleToggleOnline = (deviceId: string) => {
    if (currentUser.role !== 'admin') return;

    setDevices(prev => 
      prev.map(d => {
        if (d.id === deviceId) {
          const nextState = !d.isOnline;
          const updated = { ...d, isOnline: nextState, lastPing: new Date().toISOString() };
          if (selectedDevice?.id === deviceId) {
            setSelectedDevice(updated);
          }
          return updated;
        }
        return d;
      })
    );
  };

  // Floor Master Power
  const handleMasterPowerAction = (action: 'master_off' | 'master_on') => {
    if (currentUser.role !== 'admin') return;
    const turnOn = action === 'master_on';

    setDevices(prev => 
      prev.map(d => {
        if (d.floorNumber === selectedFloorNumber) {
          const baseWatt = d.category === 'server' ? 480 : d.category === 'peripheral' ? 85 : 120;
          const updated = {
            ...d,
            isPoweredOn: turnOn,
            energyUsage: turnOn ? baseWatt : 0,
            lastReboot: new Date().toISOString()
          };
          saveDeviceStateToFirestore(updated).catch(() => {});
          return updated;
        }
        return d;
      })
    );
    setPowerActionPending(null);
  };

  // Filtered floors for the explore section matching nav search query and floor filter
  const filteredFloors = COLLEGE_BLOCK.floors.filter(floor => {
    const matchesFilter = floorFilter === 'all' || floor.floorNumber.toString() === floorFilter;
    const query = navSearchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || 
      floor.labName.toLowerCase().includes(query) ||
      floor.roomNumber.toLowerCase().includes(query) ||
      floor.department.toLowerCase().includes(query) ||
      floor.facultyInCharge.toLowerCase().includes(query) ||
      floor.labCode.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <div 
      id="dashboard-root"
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP NAVBAR (LabTwin + Nav Search Bar + Auth & Theme)   */}
      {/* (Three navigation links removed, replaced with search bar) */}
      {/* ========================================================= */}
      <header 
        id="main-navbar"
        className={`sticky top-0 z-40 border-b transition-colors ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' 
            : 'bg-white/95 border-slate-200 backdrop-blur-md shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left: Brand Logo (LabTwin) */}
          <button
            type="button"
            id="brand-logo-btn"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer text-left flex-shrink-0 group"
          >
            <img 
              src="/cit_logo.jpg" 
              alt="CIT Seal" 
              className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-600/30 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-baseline">
              <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Lab
              </span>
              <span className="text-xl font-bold tracking-tight text-blue-600">
                Twin
              </span>
            </div>
          </button>

          {/* Center: Search Option in Nav Bar (Replaces the three links) */}
          <div className="flex-1 max-w-lg min-w-0">
            <div className={`relative flex items-center rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-800/90 border-slate-700 focus-within:border-blue-500' 
                : 'bg-slate-50 border-slate-300 focus-within:border-blue-600 focus-within:bg-white shadow-xs'
            }`}>
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none flex-shrink-0" />
              <input 
                type="text"
                id="navbar-search-input"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Search laboratories, rooms, equipment, faculty..."
                className={`w-full pl-9 pr-8 py-2 text-xs font-medium bg-transparent border-none outline-none ${
                  isDark ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              {navSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNavSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Firebase Badge, Theme Toggle and Menu Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Firebase Live Cloud Status Badge */}
            <div 
              id="badge-firebase-status"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                isFirestoreConnected
                  ? isDark 
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 shadow-2xs' 
                    : 'bg-amber-50 border-amber-200 text-amber-800 shadow-2xs'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title="Firebase Firestore Cloud Database is active and synchronizing live"
            >
              <Database className="h-3.5 w-3.5 text-amber-500 animate-pulse flex-shrink-0" />
              <span className="font-semibold tracking-tight">Firebase Live</span>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              id="btn-theme-toggle"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Light / Dark theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* 3-Line Hamburger Menu Button (Shows only 3 lines) */}
            <button
              type="button"
              id="btn-nav-menu"
              onClick={() => setIsMenuOpen(true)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                isMenuOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs'
              }`}
              aria-label="Open navigation and account sidebar"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* SLIDE-OUT SIDEBAR DRAWER (Google-style Profile & Nav)      */}
      {/* ========================================================= */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Panel */}
          <aside
            id="portal-sidebar-drawer"
            className={`fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md shadow-2xl flex flex-col z-50 transition-all duration-300 ease-out animate-in slide-in-from-right duration-200 ${
              isDark 
                ? 'bg-slate-900 text-white border-l border-slate-800' 
                : 'bg-white text-slate-900 border-l border-slate-200'
            }`}
          >
            {/* Sidebar Top Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight leading-none">Smart Lab Portal</h2>
                  <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    CIT Campus Infrastructure
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-sidebar"
                onClick={() => setIsMenuOpen(false)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark 
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Close sidebar"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              
              {/* User Profile Card (Compact) */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 relative overflow-hidden ${
                isDark 
                  ? 'bg-slate-850/80 border-slate-800 shadow-inner' 
                  : 'bg-gradient-to-r from-blue-50/60 to-slate-50 border-blue-100/80 shadow-xs'
              }`}>
                {/* Background ambient accent */}
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

                {/* Circular Initial Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center shadow-xs ring-2 ring-blue-100 dark:ring-blue-900/50 select-none flex-shrink-0">
                  {userInitial}
                </div>

                {/* User Name & Role Pill */}
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm tracking-tight truncate leading-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentUser.username}
                  </h3>

                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider font-mono ${
                      currentUser.role === 'admin'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      <span>{currentUser.role === 'admin' ? 'Faculty Admin' : 'Student Scholar'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Options */}
              <div>
                <h4 className={`text-[10px] font-semibold uppercase tracking-wider font-mono mb-2.5 px-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Menu Navigation
                </h4>

                <div className="space-y-1">
                  {/* Browse Lab */}
                  <button
                    type="button"
                    id="sidebar-item-browse-lab"
                    onClick={() => {
                      setActiveTab('home');
                      setIsMenuOpen(false);
                      setTimeout(() => {
                        const el = document.getElementById('explore-laboratories-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isDark 
                        ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                        : 'hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-transparent hover:border-blue-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-blue-950/70 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">Browse Lab</span>
                  </button>

                  {/* View Twin */}
                  <button
                    type="button"
                    id="sidebar-item-view-twin"
                    onClick={() => {
                      setActiveTab('twin');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isDark 
                        ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                        : 'hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-transparent hover:border-blue-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-indigo-950/70 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Monitor className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">View Twin</span>
                  </button>

                  {/* Book Slot */}
                  <button
                    type="button"
                    id="sidebar-item-book-slot"
                    onClick={() => {
                      setActiveTab('calendar');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isDark 
                        ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                        : 'hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-transparent hover:border-blue-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-emerald-950/70 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">Book Slot</span>
                  </button>

                  {/* Power Relays */}
                  <button
                    type="button"
                    id="sidebar-item-power-relays"
                    onClick={() => {
                      setSelectedFloorNumber(2);
                      setActiveTab('twin');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isDark 
                        ? 'hover:bg-slate-800 text-slate-200 hover:text-white' 
                        : 'hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-transparent hover:border-blue-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-amber-950/70 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">Power Relays</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Sidebar Footer with Account Logout */}
            <div className={`p-5 border-t ${
              isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <button
                type="button"
                id="sidebar-item-account-logout"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isDark 
                    ? 'bg-rose-950/40 border border-rose-900/60 text-rose-300 hover:bg-rose-900/60' 
                    : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
                title="Sign out of portal"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Account Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT (View Routing: Home, Twin, Calendar)     */}
      {/* ========================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ------------------------------------------------------- */}
        {/* VIEW 1: HOME (LearnHub clean hero + Explore grid)        */}
        {/* ------------------------------------------------------- */}
        {activeTab === 'home' && (
          <div className="space-y-12 sm:space-y-16 animate-in fade-in duration-300">
            
            {/* HERO SECTION: Clean headline & actions */}
            <section id="hero-section" className="pt-2 sm:pt-4">
              <div className="max-w-3xl space-y-6">
                
                {/* Headline */}
                <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Monitor laboratories
                </h1>

                {/* Clean Subheading */}
                <p className={`text-base sm:text-lg max-w-2xl leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Explore floors, reserve lab slots, and track workstation telemetry in real-time. Everything you need for smooth campus laboratory management.
                </p>

                {/* Search Hint or Quick Action */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('explore-laboratories-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    <span>Explore All 5 Laboratories</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Book Slot Now
                  </button>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------- */}
            {/* EXPLORE SECTION: "Browse by laboratory" with clean cards */}
            {/* ------------------------------------------------------- */}
            <section id="explore-laboratories-section" className="space-y-6 pt-4">
              
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                    EXPLORE
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mt-1 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    Browse by laboratory
                  </h2>
                </div>

                {/* View All or Reset Filter */}
                <button
                  type="button"
                  onClick={() => {
                    setFloorFilter('all');
                    setNavSearchQuery('');
                  }}
                  className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <span>View all</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Horizontal Pill Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFloorFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    floorFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Laboratories (5)
                </button>

                {COLLEGE_BLOCK.floors.map(fl => (
                  <button
                    key={fl.labId}
                    type="button"
                    onClick={() => setFloorFilter(fl.floorNumber.toString())}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      floorFilter === fl.floorNumber.toString()
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {fl.floorNumber === 0 ? 'GF' : `${fl.floorNumber}F`}: {fl.labName.split('&')[0]}
                  </button>
                ))}
              </div>

              {/* Clean Laboratory Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFloors.map((floor) => {
                  const floorDevices = devices.filter(d => d.floorNumber === floor.floorNumber);
                  const onlineCount = floorDevices.filter(d => d.isOnline).length;
                  const totalCount = floorDevices.length;
                  const activeBookings = bookings.filter(b => b.labId === floor.labId);
                  const nextBooking = activeBookings[0];

                  return (
                    <div
                      key={floor.labId}
                      className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group ${
                        isDark 
                          ? 'bg-slate-850 border-slate-800 hover:border-slate-700 hover:shadow-xl' 
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl'
                      }`}
                    >
                      <div>
                        {/* Top Badge: Floor & Room */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {floor.floorNumber === 0 ? 'GROUND FLOOR' : `FLOOR ${floor.floorNumber}`} • {floor.roomNumber}
                          </span>

                          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            {onlineCount}/{totalCount} Online
                          </span>
                        </div>

                        {/* Lab Title */}
                        <h3 className={`text-lg font-bold tracking-tight group-hover:text-blue-600 transition-colors ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {floor.labName}
                        </h3>

                        {/* Department & Capacity */}
                        <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {floor.department} • Capacity: {floor.totalCapacity} Workstations
                        </p>

                        {/* Simple Status Row: Temp, Power, Active Slot */}
                        <div className={`mt-4 p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                          isDark ? 'bg-slate-800/60 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-200/70 text-slate-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span>Environment:</span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              AC Active (22°C)
                            </strong>
                          </div>

                          <div className="flex items-center justify-between">
                            <span>Next Scheduled:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                              {nextBooking ? `${nextBooking.courseCode} (${nextBooking.startTime})` : 'Available to book'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFloorNumber(floor.floorNumber);
                            setActiveTab('calendar');
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all text-center cursor-pointer shadow-xs"
                        >
                          Book Slot
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFloorNumber(floor.floorNumber);
                            setActiveTab('twin');
                          }}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' 
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                          }`}
                        >
                          View Twin
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredFloors.length === 0 && (
                <div className={`p-12 text-center rounded-2xl border ${
                  isDark ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <p className="text-sm font-semibold">No laboratories found matching "{navSearchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNavSearchQuery('');
                      setFloorFilter('all');
                    }}
                    className="mt-3 text-xs font-bold text-blue-600 underline cursor-pointer"
                  >
                    Clear Search Filters
                  </button>
                </div>
              )}
            </section>

          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* VIEW 2: DIGITAL TWIN (Interactive Floor Plan)           */}
        {/* ------------------------------------------------------- */}
        {activeTab === 'twin' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Top Toolbar: Floor Switcher, Master Power, Back to Home */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              
              {/* Floor Switcher Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer mr-2 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  ← Home
                </button>

                {COLLEGE_BLOCK.floors.map(floor => (
                  <button
                    key={floor.floorNumber}
                    type="button"
                    onClick={() => setSelectedFloorNumber(floor.floorNumber)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      floor.floorNumber === selectedFloorNumber
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {floor.floorNumber === 0 ? 'GF' : `${floor.floorNumber}F`}: {floor.labName.split('&')[0]}
                  </button>
                ))}
              </div>

              {/* Master Power Relays (Admin only) */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                {currentUser.role === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPowerActionPending({ type: 'master_off' })}
                      className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Shut down floor workstations"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>Floor Power Down</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPowerActionPending({ type: 'master_on' })}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Power up floor workstations"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>Power Up Floor</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Book This Lab</span>
                </button>
              </div>

            </div>

            {/* Active Floor Plan Component */}
            <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${
              isDark ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {currentFloor.labName}
                  </h2>
                  <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentFloor.roomNumber} • Level {currentFloor.floorNumber === 0 ? 'GF' : `${currentFloor.floorNumber}F`} • {currentLabDevices.length} Monitored Endpoints
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Powered Off
                  </span>
                </div>
              </div>

              {/* Visual Interactive Floor Plan */}
              <LabFloorPlan
                floor={currentFloor}
                devices={currentLabDevices}
                selectedDevice={selectedDevice}
                onSelectDevice={setSelectedDevice}
                theme={theme}
              />
            </div>

            {/* Device Detail Sheet (if device selected) */}
            {selectedDevice && (
              <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDark ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedDevice.name} ({selectedDevice.id})
                    </h4>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      selectedDevice.isOnline ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'
                    }`}>
                      {selectedDevice.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      selectedDevice.isPoweredOn ? 'bg-blue-500/20 text-blue-600' : 'bg-slate-500/20 text-slate-600'
                    }`}>
                      {selectedDevice.isPoweredOn ? `${selectedDevice.energyUsage}W` : 'POWER OFF'}
                    </span>
                  </div>
                  <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    IP: {selectedDevice.ipAddress} • Bench: {selectedDevice.bench} • Specs: {selectedDevice.specs || 'N/A'}
                  </p>
                </div>

                {currentUser.role === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePower(selectedDevice.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedDevice.isPoweredOn
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {selectedDevice.isPoweredOn ? 'Shut Down Power' : 'Turn Power On'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleOnline(selectedDevice.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedDevice.isOnline ? 'Simulate Offline' : 'Mark Online'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* VIEW 3: SCHEDULE & BOOKING (Google Calendar Integrated) */}
        {/* ------------------------------------------------------- */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                ← Back to Overview
              </button>
            </div>

            <LabCalendarBooking
              floors={COLLEGE_BLOCK.floors}
              selectedFloorNumber={selectedFloorNumber}
              onSelectFloor={(fn) => setSelectedFloorNumber(fn)}
              bookings={bookings}
              onAddBooking={handleAddBooking}
              onCancelBooking={handleCancelBooking}
              theme={theme}
              currentUserRole={currentUser.role}
              currentUsername={currentUser.username}
            />
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* 4. MASTER POWER ACTION CONFIRMATION MODAL                 */}
      {/* ========================================================= */}
      {powerActionPending && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold">
              {powerActionPending.type === 'master_off' ? 'Confirm Floor Power Down' : 'Confirm Floor Power Up'}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to {powerActionPending.type === 'master_off' ? 'safely shut down' : 'power on'} all endpoints on {currentFloor.labName}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPowerActionPending(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleMasterPowerAction(powerActionPending.type as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  powerActionPending.type === 'master_off' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
