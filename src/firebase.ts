import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, collection, query, where, getDocFromServer, onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Property, Activity, SearchHistory, BillingRecord, UserRole, RentPayment, SupportMessage } from './types';
import { INITIAL_PROPERTIES } from './data';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// --- TEST CONNECTION AND AUTO-SEEDS MANDATED BY SKILLS ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- ERROR HANDLING INTERFACES & FUNCS ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

// --- SEED SECTOR FOR INITIAL DATA SEAMLESS EXPERIENCE ---
export async function seedInitialPropertiesIfEmpty() {
  const path = 'properties';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log('Seeding initial properties catalog...');
      // Batch seed via sequential setDocs (safe/zero client constraint conflict)
      for (const prop of INITIAL_PROPERTIES) {
        // Enforce mock UIDs for seeding (ensure client-side ownerId exists or is public)
        const seededProp = {
          ...prop,
          ownerId: 'demo_owner123',
          verified: prop.verified || false,
          featured: prop.featured || false,
        };
        await setDoc(doc(db, path, prop.id), seededProp);
      }
    }
  } catch (err) {
    // Suppress seed errors in standard console but document it
    console.warn('Seeding skipped or already handled:', err);
  }
}

// Automatic seeding disabled per user request: "stop posting properties automatically by itself"
// seedInitialPropertiesIfEmpty();

// --- AUTHENTICATION PROVIDERS HOOKS ---
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// --- USER PROFILE HOOKS ---
export interface FirebaseUserProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  savedIds: string[];
  createdAt?: string;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string | null;
}

export async function getUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  if (uid.startsWith('demo_')) {
    const isOwner = uid.includes('owner');
    // For demo/simulated logins: make a default 9-day trial countdown
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - 1); // signed up 1 day ago
    const trialEndsDate = new Date(createdAtDate);
    trialEndsDate.setDate(trialEndsDate.getDate() + 9); // ends in 8 days

    return {
      userId: uid,
      name: isOwner ? 'Mwamba Chileshe (Demo Owner)' : 'Bwalya Mulenga (Demo Seeker)',
      email: isOwner ? 'demo-owner@tambu.co.zm' : 'demo-seeker@tambu.co.zm',
      phone: isOwner ? '0977223344' : '0966554433',
      role: isOwner ? UserRole.OWNER : UserRole.SEEKER,
      savedIds: [],
      createdAt: createdAtDate.toISOString(),
      trialEndsAt: trialEndsDate.toISOString(),
      isSubscribed: false,
      subscriptionExpiresAt: null
    };
  }
  const path = `users/${uid}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return docSnap.data() as FirebaseUserProfile;
    }
    return null;
  } catch (error) {
    // If not found or restricted, gracefully handle
    return null;
  }
}

export async function saveUserProfile(profile: FirebaseUserProfile): Promise<void> {
  if (profile.userId.startsWith('demo_') || profile.userId === 'admin_tambu') {
    console.log('Simulated profile saved:', profile);
    return;
  }
  const path = `users/${profile.userId}`;
  try {
    const profileToSave: any = {
      userId: profile.userId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone || '0977223344',
      role: profile.role,
      savedIds: profile.savedIds || []
    };

    if (profile.createdAt) profileToSave.createdAt = profile.createdAt;
    if (profile.trialEndsAt) profileToSave.trialEndsAt = profile.trialEndsAt;
    if (profile.isSubscribed !== undefined) profileToSave.isSubscribed = profile.isSubscribed;
    if (profile.subscriptionExpiresAt !== undefined) profileToSave.subscriptionExpiresAt = profile.subscriptionExpiresAt;

    await setDoc(doc(db, 'users', profile.userId), profileToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- RENT PAYMENTS SECURE LOGS HOOKS ---
export async function addRentPayment(payment: RentPayment): Promise<void> {
  if (payment.renterId.startsWith('demo_') || payment.ownerId.startsWith('demo_') || payment.renterId === 'admin_tambu' || payment.ownerId === 'admin_tambu') {
    console.log('Simulated rent payment logged:', payment);
    // Persist mock locally
    const cacheKey = 'tambu_local_rent_payments';
    const cached = localStorage.getItem(cacheKey);
    const paymentsList = cached ? JSON.parse(cached) : [];
    paymentsList.unshift(payment);
    localStorage.setItem(cacheKey, JSON.stringify(paymentsList));
    return;
  }
  const path = `rent_payments/${payment.id}`;
  try {
    await setDoc(doc(db, 'rent_payments', payment.id), payment);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllRentPayments(): Promise<RentPayment[]> {
  const path = 'rent_payments';
  try {
    const qSnap = await getDocs(collection(db, 'rent_payments'));
    const list: RentPayment[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as RentPayment);
    });
    
    // Mix in local simulated payments
    const cached = localStorage.getItem('tambu_local_rent_payments');
    if (cached) {
      const localList = JSON.parse(cached);
      list.unshift(...localList);
    }
    
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("Could not query all rent payments, fallback to simulated cache");
    const cached = localStorage.getItem('tambu_local_rent_payments');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function getRentPaymentsForOwner(ownerId: string): Promise<RentPayment[]> {
  const path = 'rent_payments';
  try {
    const q = query(collection(db, 'rent_payments'), where('ownerId', '==', ownerId));
    const qSnap = await getDocs(q);
    const list: RentPayment[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as RentPayment);
    });

    // Clean up duplicates and mix local cache
    const cached = localStorage.getItem('tambu_local_rent_payments');
    if (cached) {
      const localList: RentPayment[] = JSON.parse(cached);
      localList.forEach(p => {
        if (p.ownerId === ownerId && !list.some(existing => existing.id === p.id)) {
          list.push(p);
        }
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("Firestore permissions prevented flat search, fallback to local simulated search");
    const cached = localStorage.getItem('tambu_local_rent_payments');
    if (cached) {
      const localList: RentPayment[] = JSON.parse(cached);
      return localList.filter(p => p.ownerId === ownerId);
    }
    return [];
  }
}

export async function getRentPaymentsForRenter(renterId: string): Promise<RentPayment[]> {
  const path = 'rent_payments';
  try {
    const q = query(collection(db, 'rent_payments'), where('renterId', '==', renterId));
    const qSnap = await getDocs(q);
    const list: RentPayment[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as RentPayment);
    });

    const cached = localStorage.getItem('tambu_local_rent_payments');
    if (cached) {
      const localList: RentPayment[] = JSON.parse(cached);
      localList.forEach(p => {
        if (p.renterId === renterId && !list.some(existing => existing.id === p.id)) {
          list.push(p);
        }
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("Firestore query error for renter, fallback to local simulated search");
    const cached = localStorage.getItem('tambu_local_rent_payments');
    if (cached) {
      const localList: RentPayment[] = JSON.parse(cached);
      return localList.filter(p => p.renterId === renterId);
    }
    return [];
  }
}

export async function updateSavedProperties(uid: string, savedIds: string[]): Promise<void> {
  if (uid.startsWith('demo_') || uid === 'admin_tambu') {
    console.log('Simulated saved properties updated:', savedIds);
    return;
  }
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { savedIds });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- PROPERTIES CRUD HOOKS ---
export async function createPropertyListing(property: Property): Promise<void> {
  if (property.ownerId.startsWith('demo_') || property.ownerId === 'admin_tambu') {
    console.log('Simulated property created:', property);
    const cacheKey = 'tambu_local_properties';
    const cached = localStorage.getItem(cacheKey);
    const list: Property[] = cached ? JSON.parse(cached) : [];
    list.push(property);
    localStorage.setItem(cacheKey, JSON.stringify(list));
    return;
  }
  const path = `properties/${property.id}`;
  try {
    await setDoc(doc(db, 'properties', property.id), {
      ...property,
      verified: false, // strictly enforce security constraints
      featured: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePropertyListing(propertyId: string): Promise<void> {
  // Always mark as deleted locally to prevent instantaneous reappearance in real-time syncs
  const deletedKey = 'tambu_deleted_property_ids';
  try {
    const cachedDeleted = localStorage.getItem(deletedKey);
    const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
    if (!deletedList.includes(propertyId)) {
      deletedList.push(propertyId);
      localStorage.setItem(deletedKey, JSON.stringify(deletedList));
    }
  } catch (e) {
    console.warn('Error saving deleted properties cache:', e);
  }

  // Filter local custom properties cache too
  const cacheKey = 'tambu_local_properties';
  const cachedLocal = localStorage.getItem(cacheKey);
  if (cachedLocal) {
    try {
      const list: Property[] = JSON.parse(cachedLocal);
      const filtered = list.filter(p => p.id !== propertyId);
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (e) {
      // safe fallback
    }
  }

  const uid = auth.currentUser?.uid;
  const path = `properties/${propertyId}`;
  try {
    await deleteDoc(doc(db, 'properties', propertyId));
    console.log('Property deleted from Firestore successfully:', propertyId);
  } catch (error) {
    console.warn('Firestore delete failed or offline fallback, handled gracefully:', error);
    // If they are a verified real login and not simulated, propagate the error context for audit traces
    if (uid && !uid.startsWith('demo_') && uid !== 'admin_tambu') {
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch (_) {
        // Suppress propagation so UI flow is never broken during mock admin actions
      }
    }
  }
}

export async function updatePropertyListing(propertyId: string, fields: Partial<Property>): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (propertyId.startsWith('demo_') || !uid || uid.startsWith('demo_') || uid === 'admin_tambu') {
    console.log('Simulated property updated:', propertyId, fields);
    const cacheKey = 'tambu_local_properties';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const list: Property[] = JSON.parse(cached);
      const updated = list.map(p => p.id === propertyId ? { ...p, ...fields } : p);
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
    return;
  }
  const path = `properties/${propertyId}`;
  try {
    await updateDoc(doc(db, 'properties', propertyId), fields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- SEARCH HISTORY CRUD ---
export async function addSearchHistory(uid: string, search: SearchHistory): Promise<void> {
  if (uid.startsWith('demo_') || uid === 'admin_tambu') {
    console.log('Simulated search history added:', search);
    return;
  }
  const path = `users/${uid}/searches/${search.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'searches', search.id), {
      id: search.id,
      query: search.query,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getSearchHistory(uid: string): Promise<SearchHistory[]> {
  if (uid.startsWith('demo_')) {
    return [];
  }
  const path = `users/${uid}/searches`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'searches'));
    const searches: SearchHistory[] = [];
    snap.forEach(docSnap => {
      searches.push(docSnap.data() as SearchHistory);
    });
    return searches;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// --- BILLING RECORD CRUD ---
export async function addBillingRecord(uid: string, record: BillingRecord): Promise<void> {
  if (uid.startsWith('demo_') || uid === 'admin_tambu') {
    console.log('Simulated billing record added:', record);
    return;
  }
  const path = `users/${uid}/billing_records/${record.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'billing_records', record.id), {
      id: record.id,
      userId: uid,
      reference: record.reference,
      amount: record.amount,
      date: record.date,
      status: record.status
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getBillingRecords(uid: string): Promise<BillingRecord[]> {
  if (uid.startsWith('demo_')) {
    return [];
  }
  const path = `users/${uid}/billing_records`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'billing_records'));
    const records: BillingRecord[] = [];
    snap.forEach(docSnap => {
      records.push(docSnap.data() as BillingRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// --- SUPPORT MESSAGES (CONTACT US) ---
export async function createSupportMessage(message: SupportMessage): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid.startsWith('demo_') || uid === 'admin_tambu') {
    console.log('Simulated support message created:', message);
    const cacheKey = 'tambu_local_support_messages';
    const cached = localStorage.getItem(cacheKey);
    const list = cached ? JSON.parse(cached) : [];
    list.unshift(message);
    localStorage.setItem(cacheKey, JSON.stringify(list));
    return;
  }
  const path = `support_messages/${message.id}`;
  try {
    await setDoc(doc(db, 'support_messages', message.id), message);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllSupportMessages(): Promise<SupportMessage[]> {
  try {
    const qSnap = await getDocs(collection(db, 'support_messages'));
    const list: SupportMessage[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as SupportMessage);
    });
    
    // Mix in local simulated support messages
    const cached = localStorage.getItem('tambu_local_support_messages');
    if (cached) {
      const localList = JSON.parse(cached);
      localList.forEach((item: SupportMessage) => {
        if (!list.some(el => el.id === item.id)) {
          list.push(item);
        }
      });
    }
    
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("Could not query support messages from Firestore, fallback to cache", error);
    const cached = localStorage.getItem('tambu_local_support_messages');
    return cached ? JSON.parse(cached) : [];
  }
}

// --- REAL-TIME CHATS WITH FIRESTORE & OFFLINE COEXISTENCE ---
export async function createOrGetChat(property: Property, seekerId: string, seekerName: string): Promise<string> {
  const chatId = `chat_${property.id}_${seekerId.replace(/[^a-zA-Z0-9_\-]/g, '')}`;
  const docRef = doc(db, 'chats', chatId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const newChat: any = {
        id: chatId,
        propertyId: property.id,
        propertyName: property.name,
        propertyImage: property.image,
        seekerId: seekerId,
        seekerName: seekerName,
        ownerId: property.ownerId || 'demo_owner123',
        ownerName: property.ownerName || 'Mwamba Chileshe',
        lastMessage: 'Let’s talk about the property specs!',
        messages: [
          {
            id: 'msg_welcome_' + Date.now(),
            senderId: property.ownerId || 'demo_owner123',
            senderRole: 'owner',
            senderName: property.ownerName || 'Mwamba Chileshe',
            text: `Hello! Thanks for your interest in "${property.name}". How can I help you today? Ask me about the rent, security deposit, or water and power backup!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ],
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, newChat);
    }
    return chatId;
  } catch (error) {
    console.warn('createOrGetChat Firestore write blocked or failed, fallback to local cache:', error);
    const cached = localStorage.getItem('tambu_chat_sessions');
    let sessionList = cached ? JSON.parse(cached) : [];
    if (!sessionList.some((s: any) => s.id === chatId)) {
      const fallbackChat = {
        id: chatId,
        propertyId: property.id,
        propertyName: property.name,
        propertyImage: property.image,
        seekerId: seekerId,
        seekerName: seekerName,
        ownerId: property.ownerId || 'demo_owner123',
        ownerName: property.ownerName || 'Mwamba Chileshe',
        lastMessage: 'Let’s talk about the property specs!',
        messages: [
          {
            id: 'msg_welcome_' + Date.now(),
            senderId: property.ownerId || 'demo_owner123',
            senderRole: 'owner',
            senderName: property.ownerName || 'Mwamba Chileshe',
            text: `Hello! Thanks for your interest in "${property.name}". How can I help you today? Ask me about the rent, security deposit, or water and power backup!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]
      };
      sessionList = [fallbackChat, ...sessionList];
      localStorage.setItem('tambu_chat_sessions', JSON.stringify(sessionList));
    }
    return chatId;
  }
}

export async function sendChatMessage(chatId: string, senderId: string, senderRole: 'seeker' | 'owner', senderName: string, text: string): Promise<void> {
  const docRef = doc(db, 'chats', chatId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const messages = data.messages || [];
      const newMsg = {
        id: 'msg_' + Date.now(),
        senderId,
        senderRole,
        senderName,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const updatedMessages = [...messages, newMsg];
      await updateDoc(docRef, {
        messages: updatedMessages,
        lastMessage: text
      });
    } else {
      // If document doesn't exist, try local cache fallback
      throw new Error("Chat document not found on Firestore");
    }
  } catch (error) {
    console.warn('sendChatMessage Firestore update failed, writing to local cache instead:', error);
    const cached = localStorage.getItem('tambu_chat_sessions');
    if (cached) {
      const sessions = JSON.parse(cached);
      const updated = sessions.map((s: any) => {
        if (s.id === chatId) {
          const newMsg = {
            id: 'msg_' + Date.now(),
            senderId,
            senderRole,
            senderName,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          return {
            ...s,
            lastMessage: text,
            messages: [...s.messages, newMsg]
          };
        }
        return s;
      });
      localStorage.setItem('tambu_chat_sessions', JSON.stringify(updated));
    }
  }
}
