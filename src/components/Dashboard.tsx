import React, { useState, useEffect } from 'react';
import { COLLEGE_BLOCK, INITIAL_DEVICES, INITIAL_LOGS } from '../data/mockData';
import { INITIAL_BOOKINGS } from '../data/mockBookings';
import { LabDevice, ActivityLog, LabBookingSlot } from '../types';
import BlockElevationNav from './BlockElevationNav';
import LabFloorPlan from './LabFloorPlan';
import LabCalendarBooking from './LabCalendarBooking';
import { 
  Building2, 
  Power, 
  Wifi, 
  Zap, 
  Clock, 
  Shield, 
  UserCheck, 
  Search, 
  Activity, 
  RefreshCw, 
  Sun, 
  Moon, 
  LogOut, 
  AlertCircle,
  Cpu, 
  Monitor, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Info,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

interface DashboardProps {
  currentUser: {
    username: string;
    role: 'admin' | 'student';
  };
  onLogout: () => void;
  onSwitchRole: (role: 'admin' | 'student') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type ActiveViewTab = 'digital-twin' | 'calendar' | 'inventory' | 'elevation' | 'logs';

export default function Dashboard({
  currentUser,
  onLogout,
  onSwitchRole,
  theme,
  onToggleTheme
}: DashboardProps) {
  // Active floor (0 to 4)
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number>(2); // Default: Floor 2 (AI Lab)
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('digital-twin');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  
  // Bookings state (integrated with Google Calendar)
  const [bookings, setBookings] = useState<LabBookingSlot[]>(INITIAL_BOOKINGS);
  
  // Devices & Logs state
  const [devices, setDevices] = useState<LabDevice[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [selectedDevice, setSelectedDevice] = useState<LabDevice | null>(null);

  // Filters for the equipment table
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRebooting, setIsRebooting] = useState(false);

  const isDark = theme === 'dark';

  // Booking handlers
  const handleAddBooking = (newBooking: LabBookingSlot) => {
    setBookings(prev => [newBooking, ...prev]);
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      performedBy: currentUser.username,
      role: currentUser.role,
      labId: newBooking.labId,
      floorNumber: newBooking.floorNumber,
      deviceId: newBooking.id,
      deviceName: `${newBooking.courseCode} Lab Reservation`,
      eventType: 'user',
      description: `Lab slot reserved on ${newBooking.date} (${newBooking.startTime} - ${newBooking.endTime}). Sync: ${newBooking.syncedToGoogleCalendar ? 'Google Calendar' : 'Portal'}.`
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleCancelBooking = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    if (target) {
      const newLog: ActivityLog = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        performedBy: currentUser.username,
        role: currentUser.role,
        labId: target.labId,
        floorNumber: target.floorNumber,
        deviceId: target.id,
        deviceName: `${target.courseCode} Cancelled`,
        eventType: 'user',
        description: `Slot reservation on ${target.date} was cancelled and released.`
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  // Find the selected floor's dedicated single lab
  const currentFloor = COLLEGE_BLOCK.floors.find(f => f.floorNumber === selectedFloorNumber) || COLLEGE_BLOCK.floors[0];
  
  // Devices belonging specifically to this floor's dedicated lab
  const currentLabDevices = devices.filter(d => d.floorNumber === currentFloor.floorNumber);

  // When floor changes, automatically set selectedDevice to the first device on that floor
  useEffect(() => {
    if (currentLabDevices.length > 0) {
      setSelectedDevice(currentLabDevices[0]);
    }
  }, [selectedFloorNumber]);

  // Minor simulated wattage drift for active devices
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prevDevices => 
        prevDevices.map(d => {
          if (!d.isPoweredOn) return d;
          const delta = Math.floor(Math.random() * 7) - 3;
          const newWatts = Math.max(15, Math.min(950, d.energyUsage + delta));
          return { ...d, energyUsage: newWatts };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Floor navigation helper: previous & next
  const handlePrevFloor = () => {
    const sortedFloors = [...COLLEGE_BLOCK.floors].sort((a, b) => a.floorNumber - b.floorNumber);
    const currentIndex = sortedFloors.findIndex(f => f.floorNumber === selectedFloorNumber);
    if (currentIndex > 0) {
      setSelectedFloorNumber(sortedFloors[currentIndex - 1].floorNumber);
    } else {
      setSelectedFloorNumber(sortedFloors[sortedFloors.length - 1].floorNumber);
    }
  };

  const handleNextFloor = () => {
    const sortedFloors = [...COLLEGE_BLOCK.floors].sort((a, b) => a.floorNumber - b.floorNumber);
    const currentIndex = sortedFloors.findIndex(f => f.floorNumber === selectedFloorNumber);
    if (currentIndex < sortedFloors.length - 1) {
      setSelectedFloorNumber(sortedFloors[currentIndex + 1].floorNumber);
    } else {
      setSelectedFloorNumber(sortedFloors[0].floorNumber);
    }
  };

  // Toggle Network Online / Offline (Admin only)
  const handleToggleOnline = (deviceId: string) => {
    if (currentUser.role !== 'admin') return;

    setDevices(prevDevices => 
      prevDevices.map(d => {
        if (d.id === deviceId) {
          const nextState = !d.isOnline;
          const nowStr = new Date().toISOString();
          
          const newLog: ActivityLog = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowStr,
            performedBy: currentUser.username,
            role: currentUser.role,
            labId: d.labId,
            floorNumber: d.floorNumber,
            deviceId: d.id,
            deviceName: d.name,
            eventType: 'network',
            description: `Network status toggled: Marked ${nextState ? 'ONLINE (Ping Reachable)' : 'OFFLINE (Unreachable)'}.`
          };
          setLogs(prevLogs => [newLog, ...prevLogs]);

          const updated = { ...d, isOnline: nextState, lastPing: nowStr };
          if (selectedDevice?.id === deviceId) {
            setSelectedDevice(updated);
          }
          return updated;
        }
        return d;
      })
    );
  };

  // Toggle Power Relay ON / OFF (Admin only)
  const handleTogglePower = (deviceId: string) => {
    if (currentUser.role !== 'admin') return;

    setDevices(prevDevices => 
      prevDevices.map(d => {
        if (d.id === deviceId) {
          const nextState = !d.isPoweredOn;
          const baseWatt = d.category === 'server' ? 480 : d.category === 'peripheral' ? 85 : 120;
          const newUsage = nextState ? baseWatt + Math.floor(Math.random() * 25) : 0;
          const nowStr = new Date().toISOString();

          const newLog: ActivityLog = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowStr,
            performedBy: currentUser.username,
            role: currentUser.role,
            labId: d.labId,
            floorNumber: d.floorNumber,
            deviceId: d.id,
            deviceName: d.name,
            eventType: 'power',
            description: `Hardware AC relay triggered: Power turned ${nextState ? 'ON' : 'OFF'}.`
          };
          setLogs(prevLogs => [newLog, ...prevLogs]);

          const updated = { ...d, isPoweredOn: nextState, energyUsage: newUsage };
          if (selectedDevice?.id === deviceId) {
            setSelectedDevice(updated);
          }
          return updated;
        }
        return d;
      })
    );
  };

  // Restart / Reboot device (Admin only)
  const handleReboot = (deviceId: string) => {
    if (currentUser.role !== 'admin') return;
    setIsRebooting(true);

    const target = devices.find(d => d.id === deviceId);
    if (!target) return;

    const nowStr = new Date().toISOString();
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowStr,
      performedBy: currentUser.username,
      role: 'admin',
      labId: target.labId,
      floorNumber: target.floorNumber,
      deviceId: target.id,
      deviceName: target.name,
      eventType: 'system',
      description: `Remote Soft-Reboot initiated via ACPI signal.`
    };
    setLogs(prev => [newLog, ...prev]);

    setTimeout(() => {
      setIsRebooting(false);
      setDevices(prev => 
        prev.map(d => (d.id === deviceId ? { ...d, isOnline: true, isPoweredOn: true, lastPing: new Date().toISOString() } : d))
      );
    }, 1500);
  };

  // Batch Control: Energize all workstations in current lab
  const handleBatchEnergize = () => {
    if (currentUser.role !== 'admin') return;
    const nowStr = new Date().toISOString();

    setDevices(prevDevices => 
      prevDevices.map(d => {
        if (d.floorNumber === currentFloor.floorNumber) {
          const baseWatt = d.category === 'server' ? 520 : d.category === 'peripheral' ? 90 : 130;
          return { ...d, isPoweredOn: true, energyUsage: baseWatt + Math.floor(Math.random() * 20) };
        }
        return d;
      })
    );

    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowStr,
      performedBy: currentUser.username,
      role: 'admin',
      labId: currentFloor.labId,
      floorNumber: currentFloor.floorNumber,
      deviceId: currentFloor.labCode,
      deviceName: `${currentFloor.labName} (All Stations)`,
      eventType: 'power',
      description: `Batch Command: All laboratory workstations energized for academic lab session.`
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Batch Control: Safely Power Down student workstations
  const handleBatchPowerDown = () => {
    if (currentUser.role !== 'admin') return;
    const nowStr = new Date().toISOString();

    setDevices(prevDevices => 
      prevDevices.map(d => {
        if (d.floorNumber === currentFloor.floorNumber && d.category === 'workstation') {
          return { ...d, isPoweredOn: false, energyUsage: 0 };
        }
        return d;
      })
    );

    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowStr,
      performedBy: currentUser.username,
      role: 'admin',
      labId: currentFloor.labId,
      floorNumber: currentFloor.floorNumber,
      deviceId: currentFloor.labCode,
      deviceName: `${currentFloor.labName} (Workstations)`,
      eventType: 'power',
      description: `Batch Command: Student workstations safely powered down for energy conservation.`
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Filtered devices for the active laboratory's equipment inventory table
  const filteredLabDevices = currentLabDevices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.includes(searchQuery) ||
      device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.specs && device.specs.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || device.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'online') matchesStatus = device.isOnline;
    else if (statusFilter === 'offline') matchesStatus = !device.isOnline;
    else if (statusFilter === 'power_on') matchesStatus = device.isPoweredOn;
    else if (statusFilter === 'power_off') matchesStatus = !device.isPoweredOn;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate high-level stats for the active lab
  const totalFloorWatts = currentLabDevices.reduce((sum, d) => sum + (d.isPoweredOn ? d.energyUsage : 0), 0);
  const onlineLabDevices = currentLabDevices.filter(d => d.isOnline).length;
  const activePoweredDevices = currentLabDevices.filter(d => d.isPoweredOn).length;
  const pingPercentage = currentLabDevices.length > 0 ? Math.round((onlineLabDevices / currentLabDevices.length) * 100) : 0;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>

      {/* 1. TOP INSTITUTIONAL COLLEGE HEADER */}
      <header className={`border-b shadow-sm ${
        isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-blue-800 text-white border-blue-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Three-Line Menu Bar + CIT Official Seal & Titles */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Three-Line Menu Bar (Hamburger Button) in Nav Bar */}
            <button
              type="button"
              id="btn-header-hamburger-menu"
              onClick={() => setIsDrawerOpen(true)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-xs flex-shrink-0 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Open Navigation Menu"
              aria-label="Three Line Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Perfectly Rounded Official Logo */}
            <img 
              src="/cit_logo.jpg" 
              alt="Coimbatore Institute of Technology Logo" 
              className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover shadow-md ring-2 ring-white/60 bg-white flex-shrink-0"
              referrerPolicy="no-referrer"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-amber-300 truncate">
                  COIMBATORE INSTITUTE OF TECHNOLOGY
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 bg-white/15 rounded text-white/95 font-semibold">
                  Autonomous Govt. Aided
                </span>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 bg-emerald-500/25 text-emerald-300 rounded font-bold border border-emerald-400/30">
                  NAAC A++
                </span>
              </div>
              <h1 className="text-xs sm:text-base lg:text-lg font-black tracking-tight text-white leading-tight truncate">
                Laboratory Monitoring System • Digital Twin
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200 font-mono truncate">
                {COLLEGE_BLOCK.name} • {COLLEGE_BLOCK.code}
              </p>
            </div>
          </div>

          {/* Right: Controls (Calendar Shortcut, Theme Toggle, Role Switcher, Logout) */}
          <div className="flex items-center justify-between sm:justify-end flex-wrap gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {/* Quick Google Calendar Slot Booking Shortcut */}
            <button
              type="button"
              id="header-quick-calendar-btn"
              onClick={() => setActiveTab('calendar')}
              className={`py-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                activeTab === 'calendar'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750'
                    : 'bg-white/15 text-amber-200 border-white/20 hover:bg-white/25'
              }`}
              title={currentUser.role === 'admin' ? "Open Google Calendar Slot Booking" : "View Laboratory Schedule & Timetable"}
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{currentUser.role === 'admin' ? 'Book Slot' : 'View Schedule'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              className={`py-1.5 px-2 sm:px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-750' 
                  : 'bg-white text-blue-900 border-white hover:bg-blue-50 shadow-sm'
              }`}
              title="Toggle Light / Dark Theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-blue-400" /> : <Moon className="h-3.5 w-3.5 text-blue-700" />}
              <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Role Switcher Pill */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-blue-900 border-blue-950 text-white'
            }`}>
              <button
                type="button"
                id="header-role-admin"
                onClick={() => onSwitchRole('admin')}
                className={`py-1 px-2 sm:px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  currentUser.role === 'admin'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Faculty </span>Admin
              </button>
              <button
                type="button"
                id="header-role-student"
                onClick={() => onSwitchRole('student')}
                className={`py-1 px-2 sm:px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  currentUser.role === 'student'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Student<span className="hidden sm:inline"> View</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              id="header-logout-btn"
              onClick={onLogout}
              className={`p-1.5 sm:p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title="Log Out Session"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. HORIZONTAL FLOOR NAVIGATION BAR (Clean, Clear, 1-Click Responsive Switcher) */}
      <nav 
        id="floor-navigation-bar"
        className={`border-b sticky top-0 z-30 shadow-xs transition-colors ${
          isDark ? 'bg-slate-850/95 border-slate-700 backdrop-blur-md' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          
          {/* Three Line Menu Bar Button + Building & Level Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
            {/* Three-Line Menu Bar (Hamburger Button) in Floor Nav Bar */}
            <button
              type="button"
              id="btn-nav-hamburger-menu"
              onClick={() => setIsDrawerOpen(true)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-xs ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                  : 'bg-blue-800 border-blue-900 text-white hover:bg-blue-900'
              }`}
              title="Open Navigation Menu"
            >
              <Menu className="h-4 w-4" />
              <span className="font-mono">Menu</span>
            </button>

            <span className={`text-[11px] font-black uppercase tracking-wider font-mono mr-1 hidden lg:inline-flex items-center gap-1.5 ${
              isDark ? 'text-blue-400' : 'text-blue-800'
            }`}>
              <Building2 className="h-4 w-4" />
              <span>Floors:</span>
            </span>

            {/* Previous Floor Button */}
            <button
              type="button"
              id="btn-prev-floor"
              onClick={handlePrevFloor}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400'
              }`}
              title="Previous Floor"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* 5 Floor Buttons (0 to 4) - Desktop with full labels, Mobile with compact pills */}
            {/* Desktop Version */}
            <div className="hidden sm:flex items-center gap-1.5">
              {COLLEGE_BLOCK.floors.map((floor) => {
                const isActive = floor.floorNumber === selectedFloorNumber;
                return (
                  <button
                    key={floor.labId}
                    type="button"
                    id={`nav-floor-${floor.floorNumber}`}
                    onClick={() => {
                      setSelectedFloorNumber(floor.floorNumber);
                      if (activeTab === 'elevation') setActiveTab('digital-twin');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900'
                    }`}
                  >
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {floor.floorNumber === 0 ? 'GF' : `${floor.floorNumber}F`}
                    </span>
                    <span className="truncate max-w-[130px] lg:max-w-[170px]">
                      {floor.labCode} • {floor.labName.split(' ')[0]}
                    </span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Version (Compact segmented buttons that fit any phone screen) */}
            <div className="flex sm:hidden items-center gap-1">
              {COLLEGE_BLOCK.floors.map((floor) => {
                const isActive = floor.floorNumber === selectedFloorNumber;
                return (
                  <button
                    key={floor.labId}
                    type="button"
                    onClick={() => {
                      setSelectedFloorNumber(floor.floorNumber);
                      if (activeTab === 'elevation') setActiveTab('digital-twin');
                    }}
                    className={`py-1 px-2.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {floor.floorNumber === 0 ? 'GF' : `${floor.floorNumber}F`}
                  </button>
                );
              })}
            </div>

            {/* Next Floor Button */}
            <button
              type="button"
              id="btn-next-floor"
              onClick={handleNextFloor}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400'
              }`}
              title="Next Floor"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      </nav>

      {/* SLIDE-OUT NAVIGATION DRAWER (Opened via the 3-line menu bar) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 flex animate-in fade-in"
          id="nav-drawer-backdrop"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside 
            className={`relative w-84 sm:w-96 max-w-[85vw] h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-50 border-r transition-transform ${
              isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div>
              {/* Drawer Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-800 text-white border-blue-900'
              }`}>
                <div className="flex items-center gap-3">
                  <img 
                    src="/cit_logo.jpg" 
                    alt="CIT Logo" 
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/60 bg-white flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider leading-tight">
                      CIT Academic Portal Menu
                    </h4>
                    <p className="text-[10px] text-blue-200 font-mono">
                      {COLLEGE_BLOCK.name} (Block-A)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-close-drawer"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Close Menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Sections */}
              <div className="p-4 space-y-5">
                {/* Section: Academic Workspace Views */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block mb-2">
                    Academic Workspace Views
                  </span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('calendar');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer border ${
                        activeTab === 'calendar'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark ? 'border-transparent text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span>Lab Slot Booking (Google Calendar)</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400/20 text-amber-500 border border-amber-400/30">
                        Live Sync
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('digital-twin');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer border ${
                        activeTab === 'digital-twin'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark ? 'border-transparent text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <Monitor className="h-4 w-4 text-blue-500" />
                      <span>Floor Plan Digital Twin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('inventory');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer border ${
                        activeTab === 'inventory'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark ? 'border-transparent text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4 text-emerald-500" />
                      <span>Hardware Equipment Inventory ({devices.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('elevation');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer border ${
                        activeTab === 'elevation'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark ? 'border-transparent text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <Layers className="h-4 w-4 text-indigo-500" />
                      <span>5-Floor Elevation Overview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('logs');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer border ${
                        activeTab === 'logs'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark ? 'border-transparent text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span>System Audit Trail & Logs</span>
                    </button>
                  </div>
                </div>

                {/* Section: Floor Lab Quick Switcher */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block mb-2">
                    Floor Laboratories (5 Total)
                  </span>
                  <div className="space-y-1.5">
                    {COLLEGE_BLOCK.floors.map((fl) => {
                      const isCurrent = fl.floorNumber === selectedFloorNumber;
                      return (
                        <button
                          key={fl.labId}
                          type="button"
                          onClick={() => {
                            setSelectedFloorNumber(fl.floorNumber);
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                              : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-0.5">
                            <span className="text-blue-600 dark:text-blue-400">
                              {fl.floorNumber === 0 ? 'Ground Floor' : `${fl.floorNumber}th Floor`}
                            </span>
                            <span className="text-[10px] text-slate-400">{fl.roomNumber}</span>
                          </div>
                          <div className="text-xs font-bold truncate">
                            {fl.labName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            In-Charge: {fl.facultyInCharge.split(',')[0]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Institutional Info Card */}
                <div className={`p-3 rounded-xl border text-[11px] font-mono space-y-1 ${
                  isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    CIT Institutional Support
                  </div>
                  <div>Hours: 08:30 AM - 05:30 PM</div>
                  <div>Support: libraryblock.support@cit.edu.in</div>
                  <div>Govt. Aided Autonomous Institution</div>
                </div>

              </div>
            </div>

            {/* Drawer Footer */}
            <div className={`p-4 border-t flex items-center justify-between ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-xs font-mono">
                <div className="text-slate-400 text-[10px]">Logged in as</div>
                <strong className="text-slate-900 dark:text-white truncate block max-w-[170px]">
                  {currentUser.username}
                </strong>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="py-1.5 px-3 rounded-lg border text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit</span>
              </button>
            </div>

          </aside>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        
        {/* ACTIVE LAB HERO BANNER (Always shows current floor lab details cleanly) */}
        <section 
          id="active-lab-summary-card"
          className={`p-4 sm:p-5 rounded-xl border shadow-sm transition-colors ${
            isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Lab Identification */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                  isDark ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {currentFloor.floorName.toUpperCase()} • {currentFloor.roomNumber}
                </span>
                <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentFloor.department}
                </span>
              </div>

              <h2 className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-blue-950'}`}>
                {currentFloor.labName}
              </h2>

              {/* In-Charge & Quick Book Action */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>In-Charge:</span>
                  <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{currentFloor.facultyInCharge}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  }`}
                  title={currentUser.role === 'admin' ? "Reserve slot for this laboratory" : "View schedule for this laboratory"}
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  <span>{currentUser.role === 'admin' ? 'Reserve Lab Slot (Google Sync)' : 'View Lab Schedule'}</span>
                </button>
              </div>
            </div>

            {/* Right: Real-time Telemetry Metrics Pill Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
              
              {/* Ping Connectivity */}
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Network</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                  {pingPercentage}%
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {onlineLabDevices}/{currentLabDevices.length} Online
                </span>
              </div>

              {/* Active Power Load */}
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  <span>Power Draw</span>
                </div>
                <div className={`text-base sm:text-lg font-black leading-none ${
                  isDark ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  {totalFloorWatts} W
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {activePoweredDevices} Energized
                </span>
              </div>

              {/* Live Session & Attendance */}
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Class Batch</span>
                </div>
                <div className={`text-base sm:text-lg font-black leading-none ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {currentFloor.currentSession ? `${currentFloor.currentSession.attendance}` : '0'}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Max: {currentFloor.totalCapacity}
                </span>
              </div>

            </div>

          </div>

          {/* Current Academic Session Details strip */}
          {currentFloor.currentSession && (
            <div className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
              isDark ? 'border-slate-700/70 text-slate-300' : 'border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                  SESSION IN PROGRESS
                </span>
                <span><strong>{currentFloor.currentSession.courseCode}</strong>: {currentFloor.currentSession.courseTitle}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span>Batch: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{currentFloor.currentSession.batch}</strong></span>
                <span>Slot: {currentFloor.currentSession.timeSlot}</span>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* VIEW TAB: GOOGLE CALENDAR LAB SLOT BOOKING & SCHEDULING */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'calendar' && (
          <LabCalendarBooking
            floors={COLLEGE_BLOCK.floors}
            selectedFloorNumber={selectedFloorNumber}
            onSelectFloor={(floorNum) => {
              setSelectedFloorNumber(floorNum);
            }}
            bookings={bookings}
            onAddBooking={handleAddBooking}
            onCancelBooking={handleCancelBooking}
            theme={theme}
            currentUserRole={currentUser.role}
            currentUsername={currentUser.username}
          />
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW TAB 1: DIGITAL TWIN FLOOR PLAN & DEVICE INSPECTOR */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'digital-twin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left 7 Columns: Floor Plan Blueprint */}
            <div className="lg:col-span-7 xl:col-span-8">
              <LabFloorPlan
                floor={currentFloor}
                devices={currentLabDevices}
                selectedDevice={selectedDevice}
                onSelectDevice={setSelectedDevice}
                theme={theme}
              />
            </div>

            {/* Right 5 Columns: Selected Device Inspector & Control Panel */}
            <div className="lg:col-span-5 xl:col-span-4">
              {selectedDevice ? (
                <div 
                  id="device-inspector-panel"
                  className={`rounded-xl border shadow-sm p-4 sm:p-5 sticky top-16 transition-colors ${
                    isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Panel Title */}
                  <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className={`text-xs font-black uppercase tracking-wider ${
                          isDark ? 'text-white' : 'text-blue-950'
                        }`}>
                          Telemetry Inspector
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">
                          {selectedDevice.id}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                      selectedDevice.isOnline && selectedDevice.isPoweredOn
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : !selectedDevice.isOnline
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-slate-500/20 text-slate-500 border border-slate-500/30'
                    }`}>
                      {selectedDevice.isOnline ? (selectedDevice.isPoweredOn ? 'RUNNING' : 'STANDBY') : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Device Core Details */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Name</span>
                      <h4 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedDevice.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className={`p-2.5 rounded-lg border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">IP Address</span>
                        <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedDevice.ipAddress}</strong>
                      </div>

                      <div className={`p-2.5 rounded-lg border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">MAC Address</span>
                        <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedDevice.macAddress}</strong>
                      </div>

                      <div className={`p-2.5 rounded-lg border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Bench / Location</span>
                        <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedDevice.bench}</strong>
                      </div>

                      <div className={`p-2.5 rounded-lg border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Instant Power</span>
                        <strong className={selectedDevice.isPoweredOn ? 'text-blue-500 font-bold' : 'text-slate-400'}>
                          {selectedDevice.isPoweredOn ? `${selectedDevice.energyUsage} Watts` : '0 W (Off)'}
                        </strong>
                      </div>
                    </div>

                    {/* Hardware Specifications */}
                    {selectedDevice.specs && (
                      <div className={`p-2.5 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5 font-bold uppercase">Specification</span>
                        <span>{selectedDevice.specs}</span>
                      </div>
                    )}

                    {/* ADMIN ACTION CONTROLS */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Hardware Relay Controls
                        </span>
                        {currentUser.role !== 'admin' && (
                          <span className="text-[10px] font-mono text-amber-500">Read-Only (Student)</span>
                        )}
                      </div>

                      {/* Power Relay Toggle */}
                      <button
                        type="button"
                        id="btn-inspect-toggle-power"
                        disabled={currentUser.role !== 'admin'}
                        onClick={() => handleTogglePower(selectedDevice.id)}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          selectedDevice.isPoweredOn
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        } ${currentUser.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Power className="h-4 w-4" />
                        <span>{selectedDevice.isPoweredOn ? 'Cut AC Relay Power (Turn Off)' : 'Energize AC Relay (Turn On)'}</span>
                      </button>

                      {/* Network ping toggle & Reboot */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="btn-inspect-toggle-network"
                          disabled={currentUser.role !== 'admin'}
                          onClick={() => handleToggleOnline(selectedDevice.id)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedDevice.isOnline
                              ? isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                              : 'bg-blue-600 text-white border-blue-500'
                          } ${currentUser.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Wifi className="h-3.5 w-3.5" />
                          <span>{selectedDevice.isOnline ? 'Simulate Disconnect' : 'Restore Link'}</span>
                        </button>

                        <button
                          type="button"
                          id="btn-inspect-reboot"
                          disabled={currentUser.role !== 'admin' || !selectedDevice.isPoweredOn || isRebooting}
                          onClick={() => handleReboot(selectedDevice.id)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-750' 
                              : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                          } ${(currentUser.role !== 'admin' || !selectedDevice.isPoweredOn || isRebooting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isRebooting ? 'animate-spin' : ''}`} />
                          <span>{isRebooting ? 'Rebooting...' : 'Soft Reboot'}</span>
                        </button>
                      </div>

                    </div>

                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border p-8 text-center ${
                  isDark ? 'bg-slate-850 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <Monitor className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs">Click any workstation or rack unit on the floor plan to view live diagnostics.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW TAB 2: HARDWARE INVENTORY TABLE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'inventory' && (
          <div 
            id="lab-inventory-table-container"
            className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${
              isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            {/* Table Header Controls */}
            <div className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/70 border-slate-200'
            }`}>
              <div>
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                  {currentFloor.labName} • Equipment Inventory
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Displaying {filteredLabDevices.length} system units assigned to {currentFloor.floorName}.
                </p>
              </div>

              {/* Batch Actions for Faculty Admin */}
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-batch-energize"
                    onClick={handleBatchEnergize}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>Energize All</span>
                  </button>

                  <button
                    type="button"
                    id="btn-batch-powerdown"
                    onClick={handleBatchPowerDown}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isDark 
                        ? 'bg-slate-750 border-slate-600 text-slate-200 hover:bg-slate-700' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5 text-rose-500" />
                    <span>Power Down Stations</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Toolbar */}
            <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50/90 border-slate-200'
            }`}>
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, IP, ID, or specification..."
                  className={`w-full px-3 py-1.5 pl-8 rounded-lg text-xs font-mono transition-colors border focus:outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-300 text-slate-800 focus:border-blue-600'
                  }`}
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Equipment Types</option>
                  <option value="workstation">Workstations</option>
                  <option value="server">Servers & Racks</option>
                  <option value="peripheral">Peripherals</option>
                  <option value="safety">Safety Breakers</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Telemetry Statuses</option>
                  <option value="online">Online Only</option>
                  <option value="offline">Offline Only</option>
                  <option value="power_on">Relay ON</option>
                  <option value="power_off">Relay OFF</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[10px] font-black uppercase tracking-wider font-mono ${
                  isDark ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="px-4 py-3">Device Identity</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">IP & MAC Address</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-center">Relay Power</th>
                    <th className="px-4 py-3 text-center">Network Ping</th>
                    <th className="px-4 py-3 text-right">Wattage</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className={`divide-y font-mono ${
                  isDark ? 'divide-slate-700 text-slate-300' : 'divide-slate-200 text-slate-800'
                }`}>
                  {filteredLabDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No equipment matched the active search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLabDevices.map((device) => {
                      const isInspected = selectedDevice?.id === device.id;
                      return (
                        <tr 
                          key={device.id}
                          className={`transition-colors ${
                            isInspected 
                              ? isDark ? 'bg-blue-950/40' : 'bg-blue-50/80' 
                              : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white font-sans">{device.name}</div>
                            <span className="text-[10px] text-slate-400">{device.id}</span>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              device.category === 'server' 
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                : device.category === 'safety'
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : device.category === 'peripheral'
                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {device.category}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-[11px]">
                            <div>{device.ipAddress}</div>
                            <span className="text-[10px] text-slate-400">{device.macAddress}</span>
                          </td>

                          <td className="px-4 py-3 text-[11px]">
                            {device.bench}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              disabled={currentUser.role !== 'admin'}
                              onClick={() => handleTogglePower(device.id)}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                device.isPoweredOn
                                  ? 'bg-blue-600 text-white'
                                  : isDark ? 'bg-slate-750 text-slate-400' : 'bg-slate-200 text-slate-600'
                              } ${currentUser.role !== 'admin' ? 'cursor-not-allowed opacity-75' : ''}`}
                            >
                              {device.isPoweredOn ? 'POWER ON' : 'POWER OFF'}
                            </button>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              device.isOnline
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${device.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {device.isOnline ? 'PING OK' : 'NO LINK'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                            {device.isPoweredOn ? `${device.energyUsage} W` : '0 W'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDevice(device);
                                setActiveTab('digital-twin');
                              }}
                              className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW TAB 3: FULL ARCHITECTURAL BUILDING ELEVATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'elevation' && (
          <div>
            <BlockElevationNav
              floors={COLLEGE_BLOCK.floors}
              selectedFloorNumber={selectedFloorNumber}
              onSelectFloor={(floorNum) => {
                setSelectedFloorNumber(floorNum);
                setActiveTab('digital-twin');
              }}
              devices={devices}
              theme={theme}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW TAB 4: LIVE ACTIVITY & AUDIT LOGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'logs' && (
          <div 
            id="audit-log-container"
            className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${
              isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/70 border-slate-200'
            }`}>
              <div>
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                  System Audit Trail & Live Event Stream
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Real-time telemetry event records for Library Block (Block-A).
                </p>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
              }`}>
                {logs.length} Logged Events
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto font-mono text-xs">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                      log.eventType === 'power'
                        ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                        : log.eventType === 'network'
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    }`}>
                      {log.eventType}
                    </span>

                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {log.deviceName} <span className="text-slate-400 font-normal">({log.deviceId})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 flex-shrink-0">
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <span className="text-slate-500">By: {log.performedBy} ({log.role})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className={`border-t py-4 text-center text-xs font-mono transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>COIMBATORE INSTITUTE OF TECHNOLOGY • Autonomous Govt. Aided Institution</span>
          <span>Library Block (Block-A) • Ground to 4th Floor (5 Labs Total)</span>
        </div>
      </footer>

    </div>
  );
}
