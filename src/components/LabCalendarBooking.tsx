import React, { useState, useEffect } from 'react';
import { FloorLabInfo, LabBookingSlot, GoogleCalendarEvent } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  Users, 
  BookOpen, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  CalendarDays,
  Sparkles,
  MapPin,
  X,
  Laptop,
  Lock,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken 
} from '../services/firebaseAuth';
import { 
  listCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent 
} from '../services/googleCalendar';

interface LabCalendarBookingProps {
  floors: FloorLabInfo[];
  selectedFloorNumber: number;
  onSelectFloor: (floorNumber: number) => void;
  bookings: LabBookingSlot[];
  onAddBooking: (booking: LabBookingSlot) => void;
  onCancelBooking: (bookingId: string) => void;
  theme: 'light' | 'dark';
  currentUserRole: 'admin' | 'student';
  currentUsername: string;
}

// Standard Academic Slot presets
export const STANDARD_SLOTS = [
  { id: 'S1', label: 'Slot 1 (Morning A)', start: '08:45', end: '10:45' },
  { id: 'S2', label: 'Slot 2 (Morning B)', start: '11:00', end: '13:00' },
  { id: 'S3', label: 'Slot 3 (Afternoon A)', start: '13:45', end: '15:45' },
  { id: 'S4', label: 'Slot 4 (Afternoon B)', start: '16:00', end: '18:00' },
  { id: 'S5', label: 'Slot 5 (Evening Research)', start: '18:15', end: '20:15' },
];

// Quick templates for fast, error-free booking
export const COURSE_TEMPLATES = [
  {
    code: 'CS8611',
    title: 'AI & Deep Learning Practicum',
    batch: 'B.E. CSE - Year III (Batch A)',
    equipment: '28 Workstations, PyTorch CUDA GPU',
    purpose: 'Practical training on deep neural networks and PyTorch pipelines.',
  },
  {
    code: 'IT305',
    title: 'Microservices & Cloud Container Lab',
    batch: 'B.Tech IT - Year III (Batch B)',
    equipment: 'Docker Daemon, Kubernetes MiniKube',
    purpose: 'Containerized deployment and microservices load balancing practicum.',
  },
  {
    code: 'CS204',
    title: 'Operating Systems & Kernel Debugging',
    batch: 'B.E. CSE - Year II (Batch B)',
    equipment: 'Linux Workstations, QEMU Virtual Kernels',
    purpose: 'POSIX thread synchronization and deadlock prevention experiments.',
  },
  {
    code: 'EC306',
    title: 'Smart IoT & Embedded Robotics Practicum',
    batch: 'B.E. ECE - Year III (Batch C)',
    equipment: 'ESP32 Microcontrollers, MQTT Sensor Grid',
    purpose: 'Hardware sensor interfacing and telemetry data stream verification.',
  },
  {
    code: 'PROJ-7',
    title: 'Final Year Capstone Project Research Lab',
    batch: 'B.E. Final Year Project Group',
    equipment: 'High-Performance Workstations',
    purpose: 'Student team self-study, capstone hardware-software co-simulation.',
  },
];

// Helper to convert HH:MM string to total minutes from midnight
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Format a YYYY-MM-DD string into a clean localized date without timezone drift
export const formatLocalDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Robust date math that avoids timezone and daylight-savings offset shifts
export const addDaysToDateString = (dateStr: string, days: number): string => {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Check if a time slot collides with any existing booking for the same lab on the same date
export const checkSlotCollision = (
  date: string,
  labId: string,
  startTime: string,
  endTime: string,
  allBookings: LabBookingSlot[],
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: LabBookingSlot; message?: string } => {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  if (reqEnd <= reqStart) {
    return {
      hasConflict: true,
      message: 'End time must be later than start time.',
    };
  }

  const cleanDate = date.trim();
  const cleanLabId = labId.trim();

  for (const b of allBookings) {
    if (b.status === 'cancelled') continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.date.trim() === cleanDate && b.labId.trim() === cleanLabId) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      // Overlap condition: bStart < reqEnd && bEnd > reqStart
      if (bStart < reqEnd && bEnd > reqStart) {
        return {
          hasConflict: true,
          conflictingBooking: b,
          message: `Slot Conflict: This laboratory is already booked on ${date} from ${b.startTime} to ${b.endTime} for "${b.courseCode} - ${b.courseTitle}" by ${b.organizer} (${b.batch}).`,
        };
      }
    }
  }

  return { hasConflict: false };
};

// Auto-detect the first available standard slot for a given lab and date
export const getFirstAvailableSlot = (
  date: string,
  labId: string,
  allBookings: LabBookingSlot[]
): string => {
  for (const slot of STANDARD_SLOTS) {
    const check = checkSlotCollision(date, labId, slot.start, slot.end, allBookings);
    if (!check.hasConflict) {
      return slot.id;
    }
  }
  return 'custom';
};

export default function LabCalendarBooking({
  floors,
  selectedFloorNumber,
  onSelectFloor,
  bookings,
  onAddBooking,
  onCancelBooking,
  theme,
  currentUserRole,
  currentUsername,
}: LabCalendarBookingProps) {
  const isDark = theme === 'dark';

  // Date selection state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Lab filter state ('all' or specific labId)
  const [filterLabId, setFilterLabId] = useState<string>('all');

  // Keep lab filter aligned if user navigates floors
  useEffect(() => {
    const currentFl = floors.find(f => f.floorNumber === selectedFloorNumber);
    if (currentFl && filterLabId !== 'all' && filterLabId !== currentFl.labId) {
      // Optional auto-sync if desired
    }
  }, [selectedFloorNumber, floors]);

  // Google Calendar Integration states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [syncedEvents, setSyncedEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isFetchingCalendar, setIsFetchingCalendar] = useState<boolean>(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);

  // New Booking Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [newBookingFloorNum, setNewBookingFloorNum] = useState<number>(selectedFloorNumber);
  const [newBookingDate, setNewBookingDate] = useState<string>(selectedDate);
  const [newBookingSlotPreset, setNewBookingSlotPreset] = useState<string>('S1');
  const [customStartTime, setCustomStartTime] = useState('08:45');
  const [customEndTime, setCustomEndTime] = useState('10:45');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [batch, setBatch] = useState('B.E. CSE III-A');
  const [attendance, setAttendance] = useState<number>(28);
  const [equipmentReq, setEquipmentReq] = useState('');
  const [purposeNotes, setPurposeNotes] = useState('');
  const [syncToCalendar, setSyncToCalendar] = useState(true);

  // Confirmation Modal state
  const [confirmationPendingData, setConfirmationPendingData] = useState<{
    type: 'create' | 'delete';
    bookingData?: LabBookingSlot;
    targetId?: string;
    targetTitle?: string;
    googleEventId?: string;
  } | null>(null);
  const [isSubmittingMutation, setIsSubmittingMutation] = useState(false);

  // Toast feedback
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // Check initial cached token on load
  useEffect(() => {
    getAccessToken().then(token => {
      if (token) {
        setGoogleToken(token);
        fetchGoogleCalendarEvents(token);
      }
    });
  }, []);

  // Fetch real Google Calendar events
  const fetchGoogleCalendarEvents = async (token: string) => {
    setIsFetchingCalendar(true);
    setCalendarSyncError(null);
    try {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const startOfDay = new Date(y, m, d, 0, 0, 0);

      const endOfDay = new Date(y, m, d, 23, 59, 59);
      endOfDay.setDate(endOfDay.getDate() + 7); // View next 7 days

      const events = await listCalendarEvents(
        token,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      setSyncedEvents(events);
    } catch (err: any) {
      console.error('Failed to list Google Calendar events:', err);
      setCalendarSyncError(err.message || 'Could not fetch Google Calendar events.');
    } finally {
      setIsFetchingCalendar(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setCalendarSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast('success', `Connected to Google Calendar (${result.user.email})`);
        fetchGoogleCalendarEvents(result.accessToken);
      }
    } catch (error: any) {
      console.error('Google Sign In Failed:', error);
      showToast('error', error.message || 'Google Calendar connection failed.');
      setCalendarSyncError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Google Sign Out
  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      setSyncedEvents([]);
      showToast('success', 'Disconnected from Google Calendar.');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Date navigation helpers with zero UTC drift
  const handleDateChange = (daysDelta: number) => {
    const nextStr = addDaysToDateString(selectedDate, daysDelta);
    setSelectedDate(nextStr);
    if (googleToken) {
      fetchGoogleCalendarEvents(googleToken);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setSelectedDate(todayStr);
    if (googleToken) {
      fetchGoogleCalendarEvents(googleToken);
    }
  };

  // Find target floor for modal
  const targetFloor = floors.find(f => f.floorNumber === newBookingFloorNum) || floors[0];

  // Calculate effective start and end for current modal selection
  const modalEffectiveStart = newBookingSlotPreset !== 'custom'
    ? (STANDARD_SLOTS.find(s => s.id === newBookingSlotPreset)?.start || '08:45')
    : customStartTime;

  const modalEffectiveEnd = newBookingSlotPreset !== 'custom'
    ? (STANDARD_SLOTS.find(s => s.id === newBookingSlotPreset)?.end || '10:45')
    : customEndTime;

  // Real-time conflict status for the active modal configuration
  const modalSlotConflict = checkSlotCollision(
    newBookingDate,
    targetFloor.labId,
    modalEffectiveStart,
    modalEffectiveEnd,
    bookings
  );

  // Open booking modal with automatic free slot detection
  const openBookingModalForLab = (floorNum: number, targetDate: string, preferredSlotId?: string) => {
    setNewBookingFloorNum(floorNum);
    setNewBookingDate(targetDate);
    
    const targetFl = floors.find(f => f.floorNumber === floorNum) || floors[0];
    let chosenSlotId = preferredSlotId;
    
    // If a slot ID was requested, verify if it is available on this date & lab
    if (chosenSlotId && chosenSlotId !== 'custom') {
      const preset = STANDARD_SLOTS.find(s => s.id === chosenSlotId);
      if (preset) {
        const check = checkSlotCollision(targetDate, targetFl.labId, preset.start, preset.end, bookings);
        if (check.hasConflict) {
          chosenSlotId = getFirstAvailableSlot(targetDate, targetFl.labId, bookings);
        }
      }
    } else if (!chosenSlotId) {
      chosenSlotId = getFirstAvailableSlot(targetDate, targetFl.labId, bookings);
    }

    setNewBookingSlotPreset(chosenSlotId || 'S1');
    const foundPreset = STANDARD_SLOTS.find(s => s.id === chosenSlotId);
    if (foundPreset) {
      setCustomStartTime(foundPreset.start);
      setCustomEndTime(foundPreset.end);
    } else {
      setCustomStartTime('08:45');
      setCustomEndTime('10:45');
    }

    // Pre-fill role-appropriate defaults
    if (currentUserRole === 'student') {
      setBatch('B.E. CSE Student Practice Group');
      setAttendance(6);
      if (!courseCode) setCourseCode('PROJ-CS');
      if (!courseTitle) setCourseTitle('Student Team Practicum & Simulation Work');
    } else {
      setBatch('B.E. CSE III-A');
      setAttendance(28);
      if (!courseCode) setCourseCode('CS8611');
      if (!courseTitle) setCourseTitle('AI & Deep Learning Practicum');
    }

    setIsBookingModalOpen(true);
  };

  // Apply course template
  const applyCourseTemplate = (template: typeof COURSE_TEMPLATES[0]) => {
    setCourseCode(template.code);
    setCourseTitle(template.title);
    setBatch(template.batch);
    setEquipmentReq(template.equipment);
    setPurposeNotes(template.purpose);
  };

  // Initiate Create Booking Form submission
  const handleInitiateCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseCode.trim() || !courseTitle.trim()) {
      showToast('error', 'Please enter course code and subject title.');
      return;
    }

    let start = customStartTime;
    let end = customEndTime;
    const preset = STANDARD_SLOTS.find(s => s.id === newBookingSlotPreset);
    if (preset && newBookingSlotPreset !== 'custom') {
      start = preset.start;
      end = preset.end;
    }

    // STRICT COLLISION CHECK: Prevent booking overlapping slots
    const collisionCheck = checkSlotCollision(
      newBookingDate,
      targetFloor.labId,
      start,
      end,
      bookings
    );

    if (collisionCheck.hasConflict) {
      showToast('error', collisionCheck.message || 'Slot collision detected! This laboratory is already booked during this time.');
      return;
    }

    const bookingPayload: LabBookingSlot = {
      id: `BOOK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      labId: targetFloor.labId,
      labName: targetFloor.labName,
      floorNumber: targetFloor.floorNumber,
      roomNumber: targetFloor.roomNumber,
      date: newBookingDate,
      startTime: start,
      endTime: end,
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      organizer: currentUsername,
      organizerEmail: googleUser?.email || `${currentUsername.toLowerCase().replace(/[^a-z]/g, '')}@cit.edu.in`,
      role: currentUserRole === 'admin' ? 'Faculty' : 'Student',
      batch: batch,
      attendance: attendance,
      equipmentRequirements: equipmentReq,
      purposeNotes: purposeNotes,
      status: 'confirmed',
      syncedToGoogleCalendar: false,
      createdAt: new Date().toISOString(),
    };

    // Close booking form and open explicit confirmation dialog
    setIsBookingModalOpen(false);
    setConfirmationPendingData({
      type: 'create',
      bookingData: bookingPayload,
      targetTitle: `${bookingPayload.courseCode} - ${bookingPayload.courseTitle}`,
    });
  };

  // Initiate Delete/Cancel
  const handleInitiateCancel = (booking: LabBookingSlot) => {
    // Admin can cancel any booking; student can cancel their own bookings
    const isOwner = booking.organizer.toLowerCase() === currentUsername.toLowerCase() || booking.role === 'Student';
    if (currentUserRole !== 'admin' && !isOwner) {
      showToast('error', 'Students can only cancel their own reservations.');
      return;
    }

    setConfirmationPendingData({
      type: 'delete',
      targetId: booking.id,
      targetTitle: `${booking.courseCode} (${booking.labName})`,
      googleEventId: booking.googleCalendarEventId,
    });
  };

  // Confirm and execute the mutation
  const handleExecuteConfirmedAction = async () => {
    if (!confirmationPendingData) return;
    setIsSubmittingMutation(true);

    try {
      if (confirmationPendingData.type === 'create') {
        const booking = confirmationPendingData.bookingData as LabBookingSlot;
        let googleEventId: string | undefined;
        let htmlLink: string | undefined;

        // If Google Calendar is connected, create real event in primary Google Calendar
        if (googleToken && syncToCalendar) {
          try {
            const summary = `Lab Slot: ${booking.courseCode} - ${booking.labName}`;
            const description = 
              `Coimbatore Institute of Technology • Library Block (Block-A)\n` +
              `Floor: ${booking.floorNumber === 0 ? 'Ground Floor' : `${booking.floorNumber}th Floor`} (${booking.roomNumber})\n` +
              `Course: ${booking.courseCode} - ${booking.courseTitle}\n` +
              `Organizer: ${booking.organizer} (${booking.role})\n` +
              `Batch: ${booking.batch} (Estimated: ${booking.attendance} Students)\n` +
              (booking.equipmentRequirements ? `Equipment: ${booking.equipmentRequirements}\n` : '') +
              (booking.purposeNotes ? `Notes: ${booking.purposeNotes}\n` : '') +
              `CIT Lab Twin Portal Booking.`;

            const location = `${booking.roomNumber}, Library Block (Block-A), Coimbatore Institute of Technology, Avanashi Road, Coimbatore-641014`;

            const createdGEvent = await createCalendarEvent(googleToken, {
              summary,
              description,
              location,
              startDate: booking.date,
              startTime: booking.startTime,
              endDate: booking.date,
              endTime: booking.endTime,
              timeZone: 'Asia/Kolkata',
            });

            googleEventId = createdGEvent.id;
            htmlLink = createdGEvent.htmlLink;
            booking.googleCalendarEventId = googleEventId;
            booking.htmlLink = htmlLink;
            booking.syncedToGoogleCalendar = true;

            // Refresh live Google Calendar events stream
            fetchGoogleCalendarEvents(googleToken);
            showToast('success', `Slot reserved & synced to Google Calendar (${googleUser?.email})!`);
          } catch (calErr: any) {
            console.warn('Google Calendar sync encountered an issue:', calErr);
            booking.syncedToGoogleCalendar = false;
            showToast('success', `Lab slot reserved locally! (Google Calendar note: ${calErr.message || 'calendar sync unavailable'})`);
          }
        } else {
          showToast('success', 'Lab slot reserved successfully!');
        }

        // Add to main state (persisted to localStorage)
        onAddBooking(booking);

        // Reset form inputs
        setCourseCode('');
        setCourseTitle('');
        setEquipmentReq('');
        setPurposeNotes('');
      } else if (confirmationPendingData.type === 'delete') {
        const { targetId, googleEventId } = confirmationPendingData;
        if (targetId) {
          if (googleToken && googleEventId) {
            try {
              await deleteCalendarEvent(googleToken, googleEventId);
              fetchGoogleCalendarEvents(googleToken);
            } catch (calErr) {
              console.warn('Could not delete from Google Calendar:', calErr);
            }
          }

          onCancelBooking(targetId);
          showToast('success', 'Lab slot reservation cancelled.');
        }
      }
    } catch (err: any) {
      console.error('Action failed:', err);
      showToast('error', err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmittingMutation(false);
      setConfirmationPendingData(null);
    }
  };

  // Filter bookings for selected date & lab
  const filteredBookings = bookings.filter(b => {
    const matchesDate = b.date.trim() === selectedDate.trim();
    const matchesLab = filterLabId === 'all' || b.labId === filterLabId;
    return matchesDate && matchesLab;
  });

  return (
    <div 
      id="lab-calendar-booking-module"
      className="space-y-5"
    >
      {/* Toast Notification */}
      {feedbackToast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span className="text-xs font-bold font-sans">{feedbackToast.message}</span>
          <button 
            type="button" 
            onClick={() => setFeedbackToast(null)} 
            className="p-1 text-white/80 hover:text-white cursor-pointer ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. GOOGLE CALENDAR SYNC & ACTION BANNER */}
      <section 
        id="google-calendar-auth-card"
        className={`p-4 sm:p-5 rounded-xl border shadow-sm transition-colors ${
          isDark 
            ? 'bg-slate-850 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Branding & Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Google Calendar Logo Icon */}
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-2 shadow-xs flex-shrink-0 flex items-center justify-center">
              <svg className="w-7 h-7" viewBox="0 0 48 48">
                <rect width="40" height="34" x="4" y="9" rx="3" fill="#ffffff"/>
                <path fill="#1a73e8" d="M4 12a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v8H4z"/>
                <path fill="#ea4335" d="M36 3v8h-4V3zM16 3v8h-4V3z"/>
                <path fill="#4285f4" d="M41 43H7a3 3 0 0 1-3-3V20h40v20a3 3 0 0 1-3 3z"/>
                <circle cx="16" cy="27" r="2.5" fill="#ffffff"/>
                <circle cx="24" cy="27" r="2.5" fill="#ffffff"/>
                <circle cx="32" cy="27" r="2.5" fill="#ffffff"/>
                <circle cx="16" cy="35" r="2.5" fill="#ffffff"/>
                <circle cx="24" cy="35" r="2.5" fill="#ffffff"/>
                <circle cx="32" cy="35" r="2.5" fill="#ffffff"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                  CIT Lab Slot Scheduling & Calendar Integration
                </h3>
                {googleToken ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    GOOGLE SYNC ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                    PORTAL READY
                  </span>
                )}
              </div>

              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {googleToken && googleUser ? (
                  <span>
                    Synchronized with <strong>{googleUser.email}</strong> • Reservations automatically create calendar entries with real-time conflict prevention.
                  </span>
                ) : (
                  <span>
                    Reserve slots across all 5 labs in Block-A. Sign in with Google to automatically add events to your phone calendar.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Connect or Disconnect button and Primary Action */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 self-start md:self-auto">
            {googleToken ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-refresh-calendar-events"
                  onClick={() => fetchGoogleCalendarEvents(googleToken)}
                  disabled={isFetchingCalendar}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Reload Google Calendar Events"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetchingCalendar ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync Events</span>
                </button>

                <button
                  type="button"
                  id="btn-disconnect-google-calendar"
                  onClick={handleGoogleSignOut}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-rose-950/40' 
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              /* Google Sign-In button */
              <button
                type="button"
                id="btn-connect-google-calendar"
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold font-sans border border-slate-300 shadow-xs transition-all flex items-center gap-2.5 cursor-pointer hover:shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>{isAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}

            {/* Book Slot Button (Available to both Faculty and Students) */}
            <button
              type="button"
              id="btn-open-book-slot-modal"
              onClick={() => openBookingModalForLab(selectedFloorNumber, selectedDate)}
              className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>{currentUserRole === 'admin' ? 'Book Slot (Faculty)' : 'Reserve Slot (Student)'}</span>
            </button>
          </div>
        </div>

        {calendarSyncError && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{calendarSyncError}</span>
          </div>
        )}
      </section>

      {/* 2. FILTER TOOLBAR: DATE SELECTOR & LAB FILTER */}
      <div className={`p-3.5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Date Selector with Previous/Next Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="btn-date-prev"
              onClick={() => handleDateChange(-1)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400'
              }`}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              id="btn-date-today"
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              id="btn-date-next"
              onClick={() => handleDateChange(1)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400'
              }`}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  if (googleToken) fetchGoogleCalendarEvents(googleToken);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer w-full sm:w-auto ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                  : 'bg-white border-slate-300 text-slate-800 focus:border-blue-600'
              }`}
            />

            <span className={`text-xs font-mono font-bold whitespace-nowrap hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {formatLocalDate(selectedDate)}
            </span>
          </div>
        </div>

        {/* Laboratory Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className={`text-xs font-bold uppercase tracking-wider font-mono whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Lab:
          </span>
          <select
            value={filterLabId}
            onChange={(e) => {
              setFilterLabId(e.target.value);
              const matched = floors.find(f => f.labId === e.target.value);
              if (matched) {
                onSelectFloor(matched.floorNumber);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors w-full md:w-auto ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white' 
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="all">All 5 Laboratories (Library Block)</option>
            {floors.map(floor => (
              <option key={floor.labId} value={floor.labId}>
                {floor.floorNumber === 0 ? 'GF' : `${floor.floorNumber}F`}: {floor.labName} ({floor.roomNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2.5 DAILY PERIOD AVAILABILITY MATRIX (Collision Prevention Visualizer) */}
      {(() => {
        const activeFocusFloor = filterLabId !== 'all'
          ? (floors.find(f => f.labId === filterLabId) || floors[0])
          : (floors.find(f => f.floorNumber === selectedFloorNumber) || floors[0]);

        return (
          <div className={`p-4 rounded-xl border shadow-sm transition-colors ${
            isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                  Period Availability • {activeFocusFloor.floorNumber === 0 ? 'GF' : `${activeFocusFloor.floorNumber}F`}: {activeFocusFloor.labName} ({activeFocusFloor.roomNumber})
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Available
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Reserved (Locked)
                </span>
              </div>
            </div>

            {/* 5 Period Slots Grid (S1 to S5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {STANDARD_SLOTS.map((slot) => {
                const collision = checkSlotCollision(
                  selectedDate,
                  activeFocusFloor.labId,
                  slot.start,
                  slot.end,
                  bookings
                );
                const isBooked = collision.hasConflict;

                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isBooked
                        ? isDark 
                          ? 'bg-rose-950/20 border-rose-800/60 text-rose-300' 
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                        : isDark
                          ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/60'
                          : 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                          {slot.id}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isBooked 
                            ? 'bg-rose-500 text-white shadow-2xs' 
                            : 'bg-emerald-600 text-white shadow-2xs'
                        }`}>
                          {isBooked ? 'Locked' : 'Available'}
                        </span>
                      </div>

                      <div className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                        {slot.start} - {slot.end}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {slot.label.split('(')[1]?.replace(')', '') || slot.label}
                      </div>

                      {isBooked && collision.conflictingBooking && (
                        <div className="mt-2 pt-2 border-t border-rose-300/40 dark:border-rose-800/40 text-[11px] font-mono leading-tight">
                          <span className="font-bold block truncate text-rose-700 dark:text-rose-300">
                            {collision.conflictingBooking.courseCode}
                          </span>
                          <span className="text-[10px] opacity-80 block truncate">
                            {collision.conflictingBooking.organizer} ({collision.conflictingBooking.batch})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2">
                      {isBooked ? (
                        <div className="w-full py-1.5 text-center rounded text-[10px] font-mono font-bold bg-rose-200/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Reserved</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openBookingModalForLab(activeFocusFloor.floorNumber, selectedDate, slot.id)}
                          className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Book {slot.id}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 3. TIME SLOT MATRIX ACROSS LABORATORIES */}
      <section 
        id="lab-booking-schedule-matrix"
        className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${
          isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/70 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
              Lab Schedule for {formatLocalDate(selectedDate)}
            </h3>
          </div>
          <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {filteredBookings.length} Active Booking{filteredBookings.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Schedule List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {floors
            .filter(f => filterLabId === 'all' || f.labId === filterLabId)
            .map(floor => {
              const floorBookings = filteredBookings.filter(b => b.labId === floor.labId);

              return (
                <div 
                  key={floor.labId}
                  className={`p-4 sm:p-5 transition-colors ${
                    floor.floorNumber === selectedFloorNumber 
                      ? isDark ? 'bg-blue-950/20' : 'bg-blue-50/40' 
                      : ''
                  }`}
                >
                  {/* Floor Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        floor.floorNumber === selectedFloorNumber
                          ? 'bg-blue-600 text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {floor.floorNumber === 0 ? 'LEVEL GF' : `LEVEL ${floor.floorNumber}F`}
                      </span>
                      <h4 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {floor.labName}
                      </h4>
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        • {floor.roomNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectFloor(floor.floorNumber);
                        }}
                        className={`text-xs font-bold underline transition-colors cursor-pointer ${
                          isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-900'
                        }`}
                      >
                        Inspect Floor Plan
                      </button>

                      <button
                        type="button"
                        onClick={() => openBookingModalForLab(floor.floorNumber, selectedDate)}
                        className="py-1 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Reserve Slot</span>
                      </button>
                    </div>
                  </div>

                  {/* Slots for this Lab */}
                  {floorBookings.length === 0 ? (
                    <div className={`p-4 rounded-lg border border-dashed text-center text-xs flex items-center justify-between ${
                      isDark ? 'border-slate-700 text-slate-400 bg-slate-900/30' : 'border-slate-300 text-slate-500 bg-slate-50'
                    }`}>
                      <span>All period slots available on this date. Laboratory ready for reservation.</span>
                      <button
                        type="button"
                        onClick={() => openBookingModalForLab(floor.floorNumber, selectedDate)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        + Quick Book First Slot
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {floorBookings.map((booking) => {
                        const canCancel = currentUserRole === 'admin' || 
                          booking.organizer.toLowerCase() === currentUsername.toLowerCase() || 
                          booking.role === 'Student';

                        return (
                          <div
                            key={booking.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isDark 
                                ? 'bg-slate-800/90 border-slate-700 hover:border-blue-500/60' 
                                : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                            }`}
                          >
                            {/* Slot Timing & Sync Tag */}
                            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{booking.startTime} - {booking.endTime}</span>
                              </div>

                              {booking.syncedToGoogleCalendar ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                  <span>Google Calendar</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-500/10">
                                  CIT Portal
                                </span>
                              )}
                            </div>

                            {/* Course Title & Batch */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                                  {booking.courseCode}
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  booking.role === 'Faculty' 
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                }`}>
                                  {booking.role}
                                </span>
                              </div>
                              <h5 className={`text-xs font-extrabold mt-1 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {booking.courseTitle}
                              </h5>
                            </div>

                            {/* Organizer & Batch Details */}
                            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-mono space-y-1 text-slate-500 dark:text-slate-400">
                              <div className="flex items-center justify-between">
                                <span>Organizer:</span>
                                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{booking.organizer}</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Batch:</span>
                                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{booking.batch}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Attendance:</span>
                                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{booking.attendance} Students</span>
                              </div>
                            </div>

                            {/* Actions: View in Calendar & Cancel */}
                            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                              {booking.htmlLink ? (
                                <a
                                  href={booking.htmlLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <span>Open in Calendar</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400">Confirmed</span>
                              )}

                              {/* Cancel Booking Action */}
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => handleInitiateCancel(booking)}
                                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Cancel Reservation"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* 4. GOOGLE CALENDAR SYNCED EVENTS STREAM */}
      {googleToken && (
        <section 
          id="google-synced-events-card"
          className={`p-4 sm:p-5 rounded-xl border shadow-sm transition-colors ${
            isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                Upcoming Events From Your Google Calendar (Next 7 Days)
              </h3>
            </div>
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Account: {googleUser?.email}
            </span>
          </div>

          {isFetchingCalendar ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              <span>Fetching live events from Google Calendar API...</span>
            </div>
          ) : syncedEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No calendar events found in this date window.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {syncedEvents.slice(0, 6).map((evt) => {
                const startTime = evt.start.dateTime 
                  ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'All Day';
                const eventDate = evt.start.dateTime
                  ? new Date(evt.start.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : evt.start.date;

                return (
                  <div 
                    key={evt.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400 font-bold mb-1">
                      <span>{eventDate}</span>
                      <span>{startTime}</span>
                    </div>
                    <h5 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {evt.summary || '(Untitled Event)'}
                    </h5>
                    {evt.location && (
                      <p className={`text-[11px] truncate mt-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>{evt.location}</span>
                      </p>
                    )}
                    {evt.htmlLink && (
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-500 hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <span>Open Event</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: LAB SLOT RESERVATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {isBookingModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsBookingModalOpen(false)}
        >
          <div 
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/80 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Reserve Laboratory Slot
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Coimbatore Institute of Technology • Library Block (Block-A)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleInitiateCreateBooking} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Target Laboratory Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  Select Laboratory (Floor & Room)
                </label>
                <select
                  value={newBookingFloorNum}
                  onChange={(e) => {
                    const flNum = Number(e.target.value);
                    setNewBookingFloorNum(flNum);
                    const fl = floors.find(f => f.floorNumber === flNum) || floors[0];
                    // If current slot preset is taken in new lab, auto-pick first free slot
                    const check = checkSlotCollision(newBookingDate, fl.labId, modalEffectiveStart, modalEffectiveEnd, bookings);
                    if (check.hasConflict) {
                      const freeSlotId = getFirstAvailableSlot(newBookingDate, fl.labId, bookings);
                      setNewBookingSlotPreset(freeSlotId);
                      const p = STANDARD_SLOTS.find(s => s.id === freeSlotId);
                      if (p) {
                        setCustomStartTime(p.start);
                        setCustomEndTime(p.end);
                      }
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-bold border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  {floors.map(f => (
                    <option key={f.labId} value={f.floorNumber}>
                      {f.floorNumber === 0 ? 'GF' : `${f.floorNumber}F`}: {f.labName} ({f.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  Reservation Date
                </label>
                <input
                  type="date"
                  required
                  value={newBookingDate}
                  onChange={(e) => {
                    setNewBookingDate(e.target.value);
                    // Check if current slot is free on new date
                    const check = checkSlotCollision(e.target.value, targetFloor.labId, modalEffectiveStart, modalEffectiveEnd, bookings);
                    if (check.hasConflict) {
                      const freeSlotId = getFirstAvailableSlot(e.target.value, targetFloor.labId, bookings);
                      setNewBookingSlotPreset(freeSlotId);
                      const p = STANDARD_SLOTS.find(s => s.id === freeSlotId);
                      if (p) {
                        setCustomStartTime(p.start);
                        setCustomEndTime(p.end);
                      }
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Visual Slot Selector Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-mono">
                  Select Academic Period Slot
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STANDARD_SLOTS.map(s => {
                    const slotCheck = checkSlotCollision(
                      newBookingDate,
                      targetFloor.labId,
                      s.start,
                      s.end,
                      bookings
                    );
                    const isSelected = newBookingSlotPreset === s.id;
                    const isOccupied = slotCheck.hasConflict;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => {
                          setNewBookingSlotPreset(s.id);
                          setCustomStartTime(s.start);
                          setCustomEndTime(s.end);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isOccupied
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-500 opacity-60 cursor-not-allowed'
                              : isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500 cursor-pointer'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase">
                            {s.id}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            isSelected 
                              ? 'bg-white/20 text-white'
                              : isOccupied 
                                ? 'bg-rose-500/20 text-rose-500' 
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isOccupied ? 'Occupied' : 'Free'}
                          </span>
                        </div>
                        <div className="text-xs font-bold font-mono mt-1">
                          {s.start} - {s.end}
                        </div>
                        <div className="text-[10px] opacity-80 truncate">
                          {s.label.split('(')[1]?.replace(')', '') || s.label}
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom slot option button */}
                  <button
                    type="button"
                    onClick={() => setNewBookingSlotPreset('custom')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newBookingSlotPreset === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase block">
                      Custom
                    </span>
                    <div className="text-xs font-bold mt-1">Custom Hours</div>
                    <div className="text-[10px] opacity-80">Manual Start & End</div>
                  </button>
                </div>
              </div>

              {/* Real-time Conflict Alert Banner */}
              {modalSlotConflict.hasConflict && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-black uppercase tracking-wide block text-rose-800 dark:text-rose-200">
                      Slot Conflict Detected • Laboratory Already Booked
                    </span>
                    <p className="mt-0.5 leading-relaxed font-sans">
                      {modalSlotConflict.message}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                      Please pick another available slot chip above or select a different laboratory floor.
                    </p>
                  </div>
                </div>
              )}

              {/* Custom start & end time if selected */}
              {newBookingSlotPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-dashed border-blue-400 bg-blue-50/20">
                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono mb-1">Start Time</label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className={`w-full px-2 py-1 rounded text-xs font-mono border ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase font-mono mb-1">End Time</label>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className={`w-full px-2 py-1 rounded text-xs font-mono border ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Quick Template Fillers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                    Quick Templates:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COURSE_TEMPLATES.map(t => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => applyCourseTemplate(t)}
                      className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                        courseCode === t.code
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t.code} • {t.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Code & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                    Course / Ref Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS8611"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                    Subject / Lab Practicum Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence & Deep Learning Practicum"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Batch & Attendance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                    Student Batch / Department
                  </label>
                  <input
                    type="text"
                    required
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                    Estimated Student Headcount
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={targetFloor.totalCapacity}
                    value={attendance}
                    onChange={(e) => setAttendance(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Equipment Requirements */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  Hardware & Equipment Needed (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 28 Workstations, Overhead Projector, Ubuntu 24.04 OS"
                  value={equipmentReq}
                  onChange={(e) => setEquipmentReq(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Google Calendar Sync Option */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/60 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-bold">Sync To Google Calendar</span>
                    <p className="text-[10px] text-slate-400">
                      {googleToken 
                        ? `Will post directly to your primary calendar (${googleUser?.email})`
                        : 'Sign in with Google on top banner to automatically post events to your calendar.'}
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={syncToCalendar && !!googleToken}
                  disabled={!googleToken}
                  onChange={(e) => setSyncToCalendar(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={modalSlotConflict.hasConflict}
                  className={`py-2 px-5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 ${
                    modalSlotConflict.hasConflict
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-800/60 cursor-not-allowed opacity-90'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {modalSlotConflict.hasConflict ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      <span>Slot Occupied (Cannot Book)</span>
                    </>
                  ) : (
                    <span>Review & Reserve Slot</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CONFIRMATION DIALOG */}
      {/* ------------------------------------------------------------- */}
      {confirmationPendingData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            if (!isSubmittingMutation) setConfirmationPendingData(null);
          }}
        >
          <div 
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 transition-all ${
              isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                confirmationPendingData.type === 'create'
                  ? 'bg-blue-600/20 text-blue-500'
                  : 'bg-rose-600/20 text-rose-500'
              }`}>
                {confirmationPendingData.type === 'create' ? (
                  <CalendarIcon className="h-6 w-6" />
                ) : (
                  <Trash2 className="h-6 w-6" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">
                  {confirmationPendingData.type === 'create'
                    ? 'Confirm Lab Slot Reservation'
                    : 'Confirm Slot Cancellation'}
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {confirmationPendingData.type === 'create'
                    ? (googleToken && syncToCalendar ? 'Google Calendar Synchronized' : 'CIT Lab Portal Reservation')
                    : 'Irreversible Slot Release'}
                </span>
              </div>
            </div>

            {/* Confirmation Description */}
            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Action Target</span>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                  {confirmationPendingData.targetTitle}
                </strong>
              </div>

              {confirmationPendingData.type === 'create' && confirmationPendingData.bookingData && (
                <div className="font-mono text-[11px] space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>Lab: <strong>{confirmationPendingData.bookingData.labName}</strong></div>
                  <div>Room: {confirmationPendingData.bookingData.roomNumber}</div>
                  <div>Date: {formatLocalDate(confirmationPendingData.bookingData.date)}</div>
                  <div>Time: {confirmationPendingData.bookingData.startTime} - {confirmationPendingData.bookingData.endTime}</div>
                  <div>Organizer: {confirmationPendingData.bookingData.organizer} ({confirmationPendingData.bookingData.role})</div>
                  {googleToken && syncToCalendar && (
                    <div className="text-blue-500 font-bold">
                      Calendar Sync: {googleUser?.email} (Primary)
                    </div>
                  )}
                </div>
              )}

              {confirmationPendingData.type === 'delete' && (
                <p className="text-xs text-rose-500">
                  Are you sure you want to cancel this reservation? The slot will be immediately released for other faculty and students.
                </p>
              )}
            </div>

            {/* Dialog Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingMutation}
                onClick={() => setConfirmationPendingData(null)}
                className={`py-2 px-4 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Dismiss
              </button>

              <button
                type="button"
                disabled={isSubmittingMutation}
                onClick={handleExecuteConfirmedAction}
                className={`py-2 px-5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                  confirmationPendingData.type === 'create'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                } ${isSubmittingMutation ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmittingMutation ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {confirmationPendingData.type === 'create'
                      ? 'Confirm & Finalize Reservation'
                      : 'Confirm Cancellation'}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
