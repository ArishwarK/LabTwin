import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDocFromServer, 
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LabBookingSlot, ActivityLog, LabDevice } from '../types';

// Singleton Firebase initialization
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

/* CRITICAL: The app will break without specifying firestoreDatabaseId */
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth: Auth = getAuth(app);

// Skill-mandated error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Skill-mandated connection test on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // A 404/not-found from getDocFromServer is normal for a test document and confirms server connectivity
    return true;
  }
}
testConnection().catch(() => {});

// Firestore Realtime Service APIs

/**
 * Realtime subscription to Lab Bookings
 */
export function subscribeToBookings(
  onData: (bookings: LabBookingSlot[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'bookings';
  try {
    const q = query(collection(db, path), orderBy('date', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: LabBookingSlot[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as LabBookingSlot);
        });
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Persist or update a Lab Booking
 */
export async function saveBookingToFirestore(booking: LabBookingSlot): Promise<void> {
  const path = `bookings/${booking.id}`;
  try {
    const cleanBooking = {
      ...booking,
      id: booking.id,
      labId: booking.labId || 'lab_default',
      labName: booking.labName || 'Laboratory',
      floorNumber: Number(booking.floorNumber ?? 0),
      roomNumber: String(booking.roomNumber || '001'),
      date: String(booking.date || ''),
      startTime: String(booking.startTime || '09:00'),
      endTime: String(booking.endTime || '11:00'),
      courseCode: String(booking.courseCode || 'GENERAL'),
      courseTitle: String(booking.courseTitle || ''),
      organizer: String(booking.organizer || 'Academic Faculty'),
      organizerEmail: String(booking.organizerEmail || ''),
      role: String(booking.role || 'Faculty'),
      batch: String(booking.batch || ''),
      attendance: Number(booking.attendance || 0),
      equipmentRequirements: String(booking.equipmentRequirements || ''),
      purposeNotes: String(booking.purposeNotes || ''),
      status: booking.status || 'confirmed',
      syncedToGoogleCalendar: Boolean(booking.syncedToGoogleCalendar),
      googleCalendarEventId: booking.googleCalendarEventId || '',
      createdAt: booking.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'bookings', booking.id), cleanBooking, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove a Lab Booking
 */
export async function deleteBookingFromFirestore(bookingId: string): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Realtime subscription to Lab Device States
 */
export function subscribeToDeviceStates(
  onData: (devices: Record<string, Partial<LabDevice>>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'devices';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const stateMap: Record<string, Partial<LabDevice>> = {};
        snapshot.forEach((docSnap) => {
          stateMap[docSnap.id] = docSnap.data() as Partial<LabDevice>;
        });
        onData(stateMap);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save device state updates (power, energy, status)
 */
export async function saveDeviceStateToFirestore(device: LabDevice): Promise<void> {
  const path = `devices/${device.id}`;
  try {
    const payload = {
      id: device.id,
      labId: device.labId,
      floorNumber: device.floorNumber,
      name: device.name,
      isOnline: Boolean(device.isOnline),
      isPoweredOn: Boolean(device.isPoweredOn),
      energyUsage: Number(device.energyUsage || 0),
      lastPing: device.lastPing || new Date().toLocaleTimeString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'devices', device.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Realtime subscription to Activity Logs
 */
export function subscribeToActivityLogs(
  onData: (logs: ActivityLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'activity_logs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as ActivityLog);
        });
        onData(logs);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Append an activity audit log
 */
export async function saveActivityLogToFirestore(log: ActivityLog): Promise<void> {
  const path = `activity_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'activity_logs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
