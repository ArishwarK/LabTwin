export interface LabDevice {
  id: string;
  labId: string;
  floorNumber: number;
  name: string;
  bench: string;
  category: 'workstation' | 'server' | 'peripheral' | 'safety';
  ipAddress: string;
  macAddress: string;
  locationRoom: string;
  isOnline: boolean;
  isPoweredOn: boolean;
  energyUsage: number; // Simulated wattage (W)
  lastPing: string;
  specs?: string;
  os?: string;
}

export interface LabSessionInfo {
  courseCode: string;
  courseTitle: string;
  faculty: string;
  batch: string;
  timeSlot: string;
  attendance: number;
  status: 'in-progress' | 'scheduled' | 'free';
}

export interface FloorLabInfo {
  floorNumber: number; // 0 = Ground, 1, 2, 3, 4
  floorName: string;
  labId: string;
  labCode: string;
  labName: string;
  roomNumber: string;
  department: string;
  facultyInCharge: string;
  facultyEmail: string;
  labTechnician: string;
  totalCapacity: number;
  operatingHours: string;
  currentSession: LabSessionInfo;
  description: string;
}

export interface CollegeBlock {
  id: string;
  name: string;
  code: string;
  campusName: string;
  location: string;
  totalFloors: number;
  floors: FloorLabInfo[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  performedBy: string;
  role: 'admin' | 'system' | 'student';
  labId: string;
  floorNumber: number;
  deviceId: string;
  deviceName: string;
  eventType: 'power' | 'network' | 'system' | 'user';
  description: string;
}

export interface LabBookingSlot {
  id: string;
  googleCalendarEventId?: string;
  labId: string;
  labName: string;
  floorNumber: number;
  roomNumber: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "09:00")
  endTime: string; // HH:mm (e.g. "11:00")
  courseCode: string;
  courseTitle: string;
  organizer: string;
  organizerEmail: string;
  role: 'Faculty' | 'Student' | 'Research Scholar';
  batch: string;
  attendance: number;
  equipmentRequirements?: string;
  purposeNotes?: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  htmlLink?: string;
  syncedToGoogleCalendar: boolean;
  createdAt: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  creator?: { email: string; displayName?: string };
}

