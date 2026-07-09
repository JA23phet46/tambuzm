import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, collection, query, where, getDocFromServer, onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Property, Activity, SearchHistory, BillingRecord, UserRole, RentPayment, SupportMessage } from './types';
import { INITIAL_PROPERTIES } from './data';
import { getSupabaseClient, savePropertyToSupabase, updatePropertyInSupabase, deletePropertyFromSupabase, isSupabaseConfigured } from './supabase';
export { getSupabaseClient };

// Support Vercel deployment: load from environment variables first, fall back to development configuration
const config = {
  apiKey: ((import.meta as any).env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: ((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: ((import.meta as any).env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: ((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: ((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: ((import.meta as any).env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  measurementId: ((import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID as string) || firebaseConfig.measurementId,
};

const databaseId = ((import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId;

const app = initializeApp(config);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app); /* CRITICAL: The app will break without this line */
export const firebaseAuth = getAuth(app);

// Track local Supabase auth user synchronously for App.tsx access
let activeSupabaseUser: any = null;

// Try to load cached demo user if not configured
try {
  const cachedDemo = localStorage.getItem('supabase_demo_user');
  if (cachedDemo) {
    activeSupabaseUser = JSON.parse(cachedDemo);
  }
} catch (e) {
  // Safe fail
}

const supabase = getSupabaseClient();
if (supabase) {
  // Fetch initial user synchronously on module load
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      activeSupabaseUser = user;
    }
  });

  // Keep user sync'd during session lifecycle
  supabase.auth.onAuthStateChange((event, session) => {
    activeSupabaseUser = session?.user || null;
  });
}

// Normalized Supabase/Firebase auth client compatibility wrapper
export const auth: any = {
  get currentUser() {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser) {
      return {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0],
        phone: fbUser.phoneNumber || '',
        photoURL: fbUser.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      };
    }
    if (!activeSupabaseUser) return null;
    return {
      uid: activeSupabaseUser.id || activeSupabaseUser.uid,
      id: activeSupabaseUser.id || activeSupabaseUser.uid,
      email: activeSupabaseUser.email,
      displayName: activeSupabaseUser.displayName || activeSupabaseUser.user_metadata?.full_name || activeSupabaseUser.user_metadata?.display_name || activeSupabaseUser.email?.split('@')[0],
      phone: activeSupabaseUser.phone || activeSupabaseUser.user_metadata?.phone || '',
      photoURL: activeSupabaseUser.photoURL || activeSupabaseUser.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
    };
  }
};

// Compatible onAuthStateChanged replacement pointing to both Firebase and Supabase Auth
export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  // 1. Listen to real Firebase Auth changes
  const fbUnsubscribe = fbOnAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      const normalizedUser = {
        uid: user.uid,
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        phone: user.phoneNumber || '',
        photoURL: user.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      };
      callback(normalizedUser);
    } else {
      // If no Firebase user, check if we have an active Supabase user
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: { user: sbUser } } = await client.auth.getUser();
          if (sbUser) {
            const normalizedUser = {
              uid: sbUser.id,
              id: sbUser.id,
              email: sbUser.email,
              displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.display_name || sbUser.email?.split('@')[0],
              phone: sbUser.user_metadata?.phone || '',
              photoURL: sbUser.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
            };
            activeSupabaseUser = sbUser;
            callback(normalizedUser);
            return;
          }
        } catch (e) {}
      }
      
      // Fallback to local storage mock user
      let initialUser = null;
      try {
        const cachedDemo = localStorage.getItem('supabase_demo_user');
        if (cachedDemo) {
          const parsed = JSON.parse(cachedDemo);
          initialUser = {
            uid: parsed.id || parsed.uid,
            id: parsed.id || parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName || parsed.email?.split('@')[0],
            phone: parsed.phone || '',
            photoURL: parsed.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
          };
        }
      } catch (e) {}
      callback(initialUser);
    }
  });

  // 2. Listen to Supabase Auth changes if configured
  let sbUnsubscribe = () => {};
  const client = getSupabaseClient();
  if (client) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      activeSupabaseUser = user;
      if (user) {
        const normalizedUser = {
          uid: user.id,
          id: user.id,
          email: user.email,
          displayName: user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0],
          phone: user.user_metadata?.phone || '',
          photoURL: user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
        };
        callback(normalizedUser);
      } else {
        // Only trigger null if Firebase is also null
        if (!firebaseAuth.currentUser) {
          callback(null);
        }
      }
    });
    sbUnsubscribe = () => subscription.unsubscribe();
  }

  // 3. Listen to mock auth changes
  const handleMockAuth = (e: any) => {
    callback(e.detail);
  };
  window.addEventListener('mock_auth_change', handleMockAuth);

  return () => {
    fbUnsubscribe();
    sbUnsubscribe();
    window.removeEventListener('mock_auth_change', handleMockAuth);
  };
}

// Compatible signInWithEmailAndPassword replacement pointing to Firebase Auth with Supabase fallback
export async function signInWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      if (data.user) {
        return {
          user: {
            uid: data.user.id,
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || email.split('@')[0],
            phone: data.user.user_metadata?.phone || '',
            photoURL: data.user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
          }
        };
      }
    } catch (err: any) {
      console.warn("Supabase Auth signIn failed, throwing:", err);
      throw err;
    }
  }

  try {
    const credential = await fbSignInWithEmailAndPassword(firebaseAuth, email, password);
    return {
      user: {
        uid: credential.user.uid,
        id: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || email.split('@')[0],
        phone: credential.user.phoneNumber || '',
        photoURL: credential.user.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      }
    };
  } catch (err: any) {
    console.warn("Firebase Auth signIn failed:", err);
    throw err;
  }
}

// Compatible createUserWithEmailAndPassword replacement pointing to Firebase Auth with Supabase fallback
export async function createUserWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      if (data.user) {
        return {
          user: {
            uid: data.user.id,
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || email.split('@')[0],
            phone: data.user.user_metadata?.phone || '',
            photoURL: data.user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
          }
        };
      }
    } catch (err: any) {
      console.warn("Supabase Auth signUp failed, throwing:", err);
      throw err;
    }
  }

  try {
    const credential = await fbCreateUserWithEmailAndPassword(firebaseAuth, email, password);
    return {
      user: {
        uid: credential.user.uid,
        id: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || email.split('@')[0],
        phone: credential.user.phoneNumber || '',
        photoURL: credential.user.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      }
    };
  } catch (err: any) {
    console.warn("Firebase Auth signUp failed:", err);
    throw err;
  }
}

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
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        }
      });
      if (error) {
        console.error('Google Sign In Error:', error);
        throw error;
      }
      return data;
    } catch (e) {
      console.warn("Supabase Google Sign-In failed, fallback to Firebase:", e);
    }
  }

  // Try real Firebase Google Sign-In popup
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(firebaseAuth, provider);
    return {
      user: {
        uid: credential.user.uid,
        id: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || credential.user.email?.split('@')[0],
        phone: credential.user.phoneNumber || '',
        photoURL: credential.user.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      }
    };
  } catch (err: any) {
    console.warn("Firebase Google Sign-In failed:", err);
    throw err;
  }
}

export async function logoutUser() {
  try {
    await fbSignOut(firebaseAuth);
  } catch (e) {
    console.warn("Firebase signout error:", e);
  }
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.error('Supabase Logout error:', e);
    }
  }
  localStorage.removeItem('supabase_demo_user');
  activeSupabaseUser = null;
  window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: null }));
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
  if (!uid) return null;

  if (uid.startsWith('sandbox_') || uid.startsWith('demo_') || uid === 'admin_tambu') {
    const isOwner = uid.includes('owner') || uid === 'admin_tambu' || uid.startsWith('sandbox_');
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - 1);
    const trialEndsDate = new Date(createdAtDate);
    trialEndsDate.setDate(trialEndsDate.getDate() + 7);

    const defaultProfile: FirebaseUserProfile = {
      userId: uid,
      name: uid === 'admin_tambu' ? 'Tambu System Administrator' : (isOwner ? 'Mwamba Chileshe (Demo Owner)' : 'Bwalya Mulenga (Demo Seeker)'),
      email: uid === 'admin_tambu' ? 'admin@tambu.com' : (isOwner ? 'demo-owner@tambu.co.zm' : 'demo-seeker@tambu.co.zm'),
      phone: uid === 'admin_tambu' ? '+260 977 112233' : (isOwner ? '0977223344' : '0966554433'),
      role: isOwner ? UserRole.OWNER : UserRole.SEEKER,
      savedIds: [],
      createdAt: createdAtDate.toISOString(),
      trialEndsAt: trialEndsDate.toISOString(),
      isSubscribed: uid === 'admin_tambu' ? true : false,
      subscriptionExpiresAt: null
    };

    try {
      localStorage.setItem(`tambu_profile_fallback_${uid}`, JSON.stringify(defaultProfile));
    } catch (e) {}

    return defaultProfile;
  }

  // 1. ALWAYS query Supabase profiles table first for true database-stored role across all devices
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (!error && data) {
        const profile: FirebaseUserProfile = {
          userId: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role as UserRole,
          savedIds: data.saved_ids || [],
          createdAt: data.created_at,
          trialEndsAt: data.trial_ends_at,
          isSubscribed: !!data.is_subscribed,
          subscriptionExpiresAt: data.subscription_expires_at,
        };
        try {
          localStorage.setItem(`tambu_profile_fallback_${uid}`, JSON.stringify(profile));
        } catch (e) {}
        return profile;
      }
    } catch (e) {
      console.warn("Supabase profile get failed:", e);
    }
  }

  // 2. Try Firestore users collection
  const path = `users/${uid}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      const profile = docSnap.data() as FirebaseUserProfile;
      try {
        localStorage.setItem(`tambu_profile_fallback_${uid}`, JSON.stringify(profile));
      } catch (e) {}
      return profile;
    }
  } catch (error) {
    // ignore
  }

  // 3. Fallback to LocalStorage fallback if network/db query failed
  try {
    const cachedFallback = localStorage.getItem(`tambu_profile_fallback_${uid}`);
    if (cachedFallback) {
      const parsed = JSON.parse(cachedFallback);
      if (parsed && parsed.role) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read profile fallback from LocalStorage:", e);
  }

  return null;
}

export async function saveUserProfile(profile: FirebaseUserProfile): Promise<void> {
  if (profile.userId.startsWith('demo_') || profile.userId.startsWith('sandbox_') || profile.userId === 'admin_tambu') {
    console.log('Simulated profile saved:', profile);
    try {
      localStorage.setItem(`tambu_profile_fallback_${profile.userId}`, JSON.stringify(profile));
    } catch (e) {
      console.error("Local storage fallback write failed:", e);
    }
    return;
  }

  // 1. Try Supabase upsert
  const client = getSupabaseClient();
  if (client) {
    try {
      const payload = {
        user_id: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '0977223344',
        role: profile.role,
        saved_ids: profile.savedIds || [],
        created_at: profile.createdAt || new Date().toISOString(),
        trial_ends_at: profile.trialEndsAt || null,
        is_subscribed: !!profile.isSubscribed,
        subscription_expires_at: profile.subscriptionExpiresAt || null,
      };
      const { error } = await client
        .from('profiles')
        .upsert([payload]);
      if (error) {
        console.warn("Supabase profile save failed:", error.message);
      }
    } catch (e) {
      console.warn("Supabase profile save failed:", e);
    }
  }

  // 2. Always persist a local copy in LocalStorage as a highly reliable fallback
  try {
    localStorage.setItem(`tambu_profile_fallback_${profile.userId}`, JSON.stringify(profile));
  } catch (e) {
    console.error("Local storage fallback write failed:", e);
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
  if (payment.renterId.startsWith('demo_') || payment.ownerId.startsWith('demo_') || payment.renterId.startsWith('sandbox_') || payment.ownerId.startsWith('sandbox_') || payment.renterId === 'admin_tambu' || payment.ownerId === 'admin_tambu') {
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
  if (!uid || uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
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
  // Always update local cache for instant availability
  const cacheKey = 'tambu_local_properties';
  try {
    const cached = localStorage.getItem(cacheKey);
    const list: Property[] = cached ? JSON.parse(cached) : [];
    if (!list.some(p => p.id === property.id)) {
      list.unshift(property);
      localStorage.setItem(cacheKey, JSON.stringify(list));
    }
  } catch (e) {}

  // Also update tambu_properties main cache so listings appear instantly on home screen and dashboards
  const propCacheKey = 'tambu_properties';
  try {
    const cachedProps = localStorage.getItem(propCacheKey);
    const propList: Property[] = cachedProps ? JSON.parse(cachedProps) : [];
    if (!propList.some(p => p.id === property.id)) {
      propList.unshift(property);
      try {
        localStorage.setItem(propCacheKey, JSON.stringify(propList));
      } catch (quotaErr) {
        try {
          // If quota exceeded, slice to latest 15 properties
          const trimmed = propList.slice(0, 15);
          localStorage.setItem(propCacheKey, JSON.stringify(trimmed));
        } catch (innerErr) {
          localStorage.removeItem(propCacheKey);
        }
      }
    }
  } catch (e) {
    console.warn("Error caching property to localStorage:", e);
  }

  try {
    await savePropertyToSupabase(property);
  } catch (err) {
    console.warn("Supabase property save failed:", err);
  }

  const path = `properties/${property.id}`;
  try {
    await setDoc(doc(db, 'properties', property.id), {
      ...property,
      verified: property.verified || false,
      featured: property.featured || false
    });
  } catch (error) {
    console.warn("Firestore write for property failed, relying on local sync:", error);
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
    await deletePropertyFromSupabase(propertyId);
  } catch (err) {
    console.warn('Supabase delete bypassed or failed:', err);
  }
  try {
    await deleteDoc(doc(db, 'properties', propertyId));
    console.log('Property deleted from Firestore successfully:', propertyId);
  } catch (error) {
    console.warn('Firestore delete failed or offline fallback, handled gracefully:', error);
    // If they are a verified real login and not simulated, propagate the error context for audit traces
    if (uid && !uid.startsWith('demo_') && !uid.startsWith('sandbox_') && uid !== 'admin_tambu') {
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
  if (propertyId.startsWith('demo_') || !uid || uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
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
    await updatePropertyInSupabase(propertyId, fields);
  } catch (err) {
    console.warn('Supabase update bypassed or failed:', err);
  }
  try {
    await updateDoc(doc(db, 'properties', propertyId), fields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- SEARCH HISTORY CRUD ---
export async function addSearchHistory(uid: string, search: SearchHistory): Promise<void> {
  if (!uid || uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
    console.log('Simulated search history added:', search);
    try {
      const key = `tambu_searches_${uid}`;
      const cached = localStorage.getItem(key);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(search);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
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
    console.warn("Firestore search history write failed, using local cache:", error);
    try {
      const key = `tambu_searches_${uid}`;
      const cached = localStorage.getItem(key);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(search);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
  }
}

export async function getSearchHistory(uid: string): Promise<SearchHistory[]> {
  if (!uid) return [];
  if (uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
    try {
      const key = `tambu_searches_${uid}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
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
    console.warn("Firestore search history get failed, using local cache:", error);
    try {
      const key = `tambu_searches_${uid}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  }
}

// --- BILLING RECORD CRUD ---
export async function addBillingRecord(uid: string, record: BillingRecord): Promise<void> {
  if (!uid || uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
    console.log('Simulated billing record added:', record);
    try {
      const key = `tambu_billing_${uid}`;
      const cached = localStorage.getItem(key);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
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
    console.warn("Firestore billing write failed, using local cache:", error);
    try {
      const key = `tambu_billing_${uid}`;
      const cached = localStorage.getItem(key);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }
}

export async function getBillingRecords(uid: string): Promise<BillingRecord[]> {
  if (!uid) return [];
  if (uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
    try {
      const key = `tambu_billing_${uid}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
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
    console.warn("Firestore billing get failed, using local cache:", error);
    try {
      const key = `tambu_billing_${uid}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  }
}

// --- SUPPORT MESSAGES (CONTACT US) ---
export async function createSupportMessage(message: SupportMessage): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid.startsWith('demo_') || uid.startsWith('sandbox_') || uid === 'admin_tambu') {
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
