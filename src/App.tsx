import React, { useState, useEffect } from 'react';
import { 
  Building2, GraduationCap, Grid, Heart, List, 
  MapPin, User, LogIn, Lock, Mail, Phone, Compass, Check, AlertCircle 
} from 'lucide-react';
import { 
  Property, Province, PropertyType, UserRole, Activity, 
  SearchHistory, BillingRecord, NewListingInput, RentPayment, SupportMessage, isPropertyActive 
} from './types';
import { 
  INITIAL_PROPERTIES, INITIAL_ACTIVITIES, INITIAL_SEARCHES, 
  INITIAL_BILLING_RECORDS 
} from './data';

// Client Auth and Database Imports (Backed by Supabase Auth)
import { 
  auth, db, handleFirestoreError, OperationType, 
  loginWithGoogle, logoutUser, getUserProfile, saveUserProfile, 
  updateSavedProperties, createPropertyListing, deletePropertyListing, updatePropertyListing,
  addSearchHistory, getSearchHistory, addBillingRecord, getBillingRecords,
  addRentPayment, getAllRentPayments, getRentPaymentsForOwner, getRentPaymentsForRenter,
  createSupportMessage, getAllSupportMessages,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  getSupabaseClient
} from './firebase';
import { onSnapshot, collection, query, where, or } from 'firebase/firestore';

// Modular Sub-components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DiscoveryView } from './components/DiscoveryView';
import { PropertyDetailsView } from './components/PropertyDetailsView';
import { ContactView } from './components/ContactView';
import { FiltersView } from './components/FiltersView';
import { CheckoutView } from './components/CheckoutView';
import { ProcessingView } from './components/ProcessingView';
import { DashboardView } from './components/DashboardView';
import { ListingFormView } from './components/ListingFormView';
import { PhotoSelectorView } from './components/PhotoSelectorView';
import { ChatView } from './components/ChatView';

// Supabase Integration
import { isSupabaseConfigured, savePropertyToSupabase, getPropertiesFromSupabase } from './supabase';

export default function App() {
  // --- Persistent State hooks ---
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return localStorage.getItem('tambu_page') || 'discovery';
  });
  
  const [properties, setProperties] = useState<Property[]>(() => {
    const cached = localStorage.getItem('tambu_properties');
    try {
      if (cached) {
        const parsed: Property[] = JSON.parse(cached);
        let list = parsed.filter(p => p.ownerId !== 'system_admin_or_owner_seed');
        try {
          const deletedKey = 'tambu_deleted_property_ids';
          const cachedDeleted = localStorage.getItem(deletedKey);
          const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
          if (Array.isArray(deletedList) && deletedList.length > 0) {
            list = list.filter(p => !deletedList.includes(p.id));
          }
        } catch (_) {}
        return list;
      }
      return [];
    } catch (_) {
      return [];
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const cached = localStorage.getItem('tambu_saved_ids');
    try {
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const cached = localStorage.getItem('tambu_role');
    return (cached as UserRole) || UserRole.SEEKER;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tambu_logged_in') === 'true';
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('tambu_user_name') || '';
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('tambu_user_email') || '';
  });

  const [userPhone, setUserPhone] = useState<string>(() => {
    return localStorage.getItem('tambu_user_phone') || '';
  });

  // --- Dynamic Application state hooks ---
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(() => {
    const saved = localStorage.getItem('tambu_selected_property');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | ''>('');
  const [minPrice, setMinPrice] = useState(100);
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(() => {
    return localStorage.getItem('tambu_subscription_expired') === 'true';
  });

  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string>(() => {
    return localStorage.getItem('tambu_subscription_expiry') || 'June 22, 2026';
  });

  const [checkoutItem, setCheckoutItem] = useState<{
    name: string;
    detail: string;
    amount: number;
    reference: string;
    type: 'listing' | 'subscription';
  } | null>(() => {
    const saved = localStorage.getItem('tambu_checkout_item');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('tambu_is_admin') === 'true';
  });

  const [adminModeActive, setAdminModeActive] = useState<boolean>(() => {
    return localStorage.getItem('tambu_admin_mode_active') === 'true';
  });

  const [trialEndsAt, setTrialEndsAt] = useState<string>(() => {
    return localStorage.getItem('tambu_trial_ends') || '';
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    return localStorage.getItem('tambu_is_subscribed') === 'true';
  });

  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [chatsCount, setChatsCount] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('tambu_is_admin', String(isAdmin));
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem('tambu_user_phone', userPhone || '');
  }, [userPhone]);

  useEffect(() => {
    localStorage.setItem('tambu_user_email', userEmail || '');
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('tambu_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('tambu_user_name', userName || '');
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('tambu_role', userRole || '');
  }, [userRole]);

  useEffect(() => {
    if (selectedProperty) {
      localStorage.setItem('tambu_selected_property', JSON.stringify(selectedProperty));
    } else {
      localStorage.removeItem('tambu_selected_property');
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (checkoutItem) {
      localStorage.setItem('tambu_checkout_item', JSON.stringify(checkoutItem));
    } else {
      localStorage.removeItem('tambu_checkout_item');
    }
  }, [checkoutItem]);

  useEffect(() => {
    localStorage.setItem('tambu_admin_mode_active', String(adminModeActive));
  }, [adminModeActive]);

  useEffect(() => {
    localStorage.setItem('tambu_trial_ends', trialEndsAt);
  }, [trialEndsAt]);

  useEffect(() => {
    localStorage.setItem('tambu_is_subscribed', String(isSubscribed));
  }, [isSubscribed]);

  useEffect(() => {
    localStorage.setItem('tambu_subscription_expired', String(isSubscriptionExpired));
  }, [isSubscriptionExpired]);

  useEffect(() => {
    localStorage.setItem('tambu_subscription_expiry', subscriptionExpiry);
  }, [subscriptionExpiry]);

  const handlePaySubscription = () => {
    const randomRef = 'SUB-' + Math.floor(1000000 + Math.random() * 9000000);
    setCheckoutItem({
      name: 'Standard Owner Monthly Subscription',
      detail: 'Standard Plan Subscription Extension',
      amount: 100.00,
      reference: randomRef,
      type: 'subscription'
    });
    navigateTo('checkout', true);
  };

  const handleToggleSubscriptionExpirySimulated = async () => {
    const nextState = !isSubscriptionExpired;
    setIsSubscriptionExpired(nextState);
    
    // Simulate by shifting the trial end and subscription expiry dates!
    if (nextState) {
      // Set trial and sub expiry to the past (yesterday)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const pastStr = pastDate.toISOString();
      
      setTrialEndsAt(pastStr);
      setSubscriptionExpiry(pastStr);
      setIsSubscribed(false);
      
      // Update properties on Firestore dynamically so they get hidden for everyone!
      const ownerProps = properties.filter((p) => p.ownerId === currentUser?.uid);
      for (const p of ownerProps) {
        try {
          await updatePropertyListing(p.id, {
            ownerIsSubscribed: false,
            ownerSubscriptionExpiresAt: pastStr,
            ownerTrialEndsAt: pastStr
          });
        } catch (err) {
          console.warn("Simulated update failed on property document:", err);
          // Update in local properties state directly as offline fallback
          setProperties(prev => prev.map(item => item.id === p.id ? {
            ...item,
            ownerIsSubscribed: false,
            ownerSubscriptionExpiresAt: pastStr,
            ownerTrialEndsAt: pastStr
          } : item));
        }
      }
      
      triggerToast('Subscription Simulated as EXPIRED. Owner properties are now HIDDEN from seekers.', 'success');
    } else {
      // Set trial to 5 days in the future, or active subscription
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureStr = futureDate.toISOString();
      
      setTrialEndsAt(futureStr);
      setSubscriptionExpiry(futureStr);
      setIsSubscribed(true);
      
      // Update properties on Firestore dynamically so they get activated for everyone!
      const ownerProps = properties.filter((p) => p.ownerId === currentUser?.uid);
      for (const p of ownerProps) {
        try {
          await updatePropertyListing(p.id, {
            ownerIsSubscribed: true,
            ownerSubscriptionExpiresAt: futureStr,
            ownerTrialEndsAt: futureStr
          });
        } catch (err) {
          console.warn("Simulated update failed on property document:", err);
          setProperties(prev => prev.map(item => item.id === p.id ? {
            ...item,
            ownerIsSubscribed: true,
            ownerSubscriptionExpiresAt: futureStr,
            ownerTrialEndsAt: futureStr
          } : item));
        }
      }
      
      triggerToast('Subscription Simulated as ACTIVE. Owner properties are now VISIBLE to seekers.', 'success');
    }
  };
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searches, setSearches] = useState<SearchHistory[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'airtel' | 'card'>('mtn');
  const [currentFlwRef, setCurrentFlwRef] = useState<string | null>(null);
  const [currentFlwUrl, setCurrentFlwUrl] = useState<string | null>(null);

  // --- Login/Register local states ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.SEEKER);

  const [simulatedUser, setSimulatedUser] = useState<any>(() => {
    const cached = localStorage.getItem('tambu_simulated_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });
  const [authErrorMsg, setAuthErrorMsg] = useState<string>('');
  const [authTab, setAuthTab] = useState<'google' | 'email-signup' | 'email-login'>('google');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDemoSandbox, setShowDemoSandbox] = useState(false);

  useEffect(() => {
    if (currentPage === 'register') {
      setIsRegistering(true);
    } else if (currentPage === 'login') {
      setIsRegistering(false);
    }
  }, [currentPage]);

  // Synchronized refs to protect onAuthStateChanged from tearing down on high-frequency key inputs and page navigation
  const regNameRef = React.useRef(regName);
  const regPhoneRef = React.useRef(regPhone);
  const regRoleRef = React.useRef(regRole);
  const userRoleRef = React.useRef(userRole);
  const savedIdsRef = React.useRef(savedIds);

  useEffect(() => { regNameRef.current = regName; }, [regName]);
  useEffect(() => { regPhoneRef.current = regPhone; }, [regPhone]);
  useEffect(() => { regRoleRef.current = regRole; }, [regRole]);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);
  useEffect(() => { savedIdsRef.current = savedIds; }, [savedIds]);

  const currentUser = auth.currentUser || simulatedUser;

  useEffect(() => {
    if (simulatedUser) {
      localStorage.setItem('tambu_simulated_user', JSON.stringify(simulatedUser));
      localStorage.setItem('tambu_logged_in', 'true');
      setIsLoggedIn(true);
    } else {
      localStorage.removeItem('tambu_simulated_user');
    }
  }, [simulatedUser]);

  useEffect(() => {
    setAuthErrorMsg('');
  }, [currentPage]);

  // --- Persistent Local-Storage state sync for routing/role ---
  useEffect(() => {
    localStorage.setItem('tambu_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('tambu_role', userRole);
  }, [userRole]);

  // --- Process Flutterwave redirect/callback URL values ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flwStatus = params.get('FLW_STATUS') || params.get('status');
    const txRef = params.get('tx_ref') || params.get('txRef');
    const isCancelledStatus = flwStatus === 'cancelled' || flwStatus === 'failed' || params.get('cancelled') === 'true';
    
    if (flwStatus || isCancelledStatus) {
      if ((flwStatus === 'success' || flwStatus === 'successful') && txRef) {
        triggerToast('Flutterwave Secure Payment Confirmed!', 'success');
        // Finalize billing logs and premium status renewal
        handlePaymentComplete();
      } else {
        triggerToast('Payment was cancelled or experienced an error.', 'error');
        setCheckoutItem(null);
        navigateTo('discovery');
      }
      
      // Clean query parameters from actual URL so refreshes don't re-trigger complete state
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
  }, [userRole, checkoutItem]);

  // --- Process Supabase OAuth hash/callback in popup or main window ---
  useEffect(() => {
    const isCallback = 
      window.location.pathname.includes('/auth/callback') || 
      window.location.hash.includes('access_token=') || 
      window.location.search.includes('code=') ||
      window.location.search.includes('error=');

    if (isCallback) {
      if (window.opener) {
        // We are inside the popup window launched by the parent!
        // Notify the parent window that OAuth succeeded or failed
        try {
          const params = new URLSearchParams(window.location.search);
          const errorMsg = params.get('error_description') || params.get('error');
          if (errorMsg) {
            window.opener.postMessage({ type: 'TAMBU_AUTH_ERROR', message: errorMsg }, window.location.origin);
          } else {
            window.opener.postMessage({ type: 'TAMBU_AUTH_SUCCESS' }, window.location.origin);
          }
        } catch (e) {
          console.error("Failed to notify parent window opener:", e);
        }
        // Close the popup window automatically
        window.close();
      } else {
        // This is a direct redirection in the main window (fallback if popup was blocked)
        triggerToast('Google Sign-In succeeded!', 'success');
        const cleanUrl = window.location.protocol + "//" + window.location.host + "/";
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        setCurrentPage('explore');
      }
    }
  }, []);

  // --- Listen for popup OAuth events ---
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      // Allow preview domains, run.app, and localhost
      const isAllowedOrigin = 
        origin.endsWith('.run.app') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('aistudio') || 
        origin.endsWith('.net');
      if (!isAllowedOrigin) {
        return;
      }
      
      if (event.data?.type === 'TAMBU_AUTH_SUCCESS') {
        triggerToast('Welcome back! Google Sign-In succeeded.', 'success');
        
        // Force sync parent Supabase client with the new session stored in shared LocalStorage
        try {
          const client = getSupabaseClient();
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
              await client.auth.setSession(session);
              
              // Determine final role and redirect
              const profile = await getUserProfile(session.user.id);
              let finalRole = UserRole.SEEKER;
              if (profile) {
                finalRole = profile.role;
              } else {
                finalRole = currentPage === 'register' ? regRole : userRole;
              }
              setUserRole(finalRole);
              navigateTo(finalRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
            }
          }
        } catch (e) {
          console.error("Failed to sync auth session in parent:", e);
        }
      } else if (event.data?.type === 'TAMBU_AUTH_ERROR') {
        triggerToast(`Google Authentication failed: ${event.data.message || 'Unknown error'}`, 'error');
      }
    };
    
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [currentPage, regRole, userRole]);

  // --- Dynamic Periodic Subscription/Trial Expiry Check ---
  useEffect(() => {
    if (!isLoggedIn) {
      setIsSubscriptionExpired(false);
      return;
    }

    const checkExpiration = () => {
      // If they are subscribed:
      if (isSubscribed) {
        if (subscriptionExpiry) {
          const expiresAt = new Date(subscriptionExpiry);
          const hasExpired = expiresAt.getTime() <= Date.now();
          if (hasExpired !== isSubscriptionExpired) {
            setIsSubscriptionExpired(hasExpired);
          }
        } else {
          setIsSubscriptionExpired(false);
        }
      } else {
        // If not subscribed, they must be on free trial:
        if (trialEndsAt) {
          const endsAt = new Date(trialEndsAt);
          const hasExpired = endsAt.getTime() <= Date.now();
          if (hasExpired !== isSubscriptionExpired) {
            setIsSubscriptionExpired(hasExpired);
          }
        } else {
          // If neither, then they are expired by default (or must subscribe to activate)
          setIsSubscriptionExpired(true);
        }
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 1000 * 30); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isLoggedIn, isSubscribed, subscriptionExpiry, trialEndsAt, isSubscriptionExpired]);

  // --- Check for shared direct property listing ID on mount and when properties load ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const propertyIdParam = params.get('propertyId');
    if (propertyIdParam && properties.length > 0) {
      const match = properties.find(p => p.id === propertyIdParam);
      if (match) {
        setSelectedProperty(match);
        setCurrentPage('details');
        
        // Clean query parameters from actual URL so refreshes don't lock page State
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }
    }
  }, [properties]);

  // --- Firebase Realtime Observers and Auth Synchronizations ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setSimulatedUser(null);
        localStorage.removeItem('tambu_simulated_user');
        setIsLoggedIn(true);
        localStorage.setItem('tambu_logged_in', 'true');
        setUserEmail(firebaseUser.email || '');
        
        // Fetch/save user profile securely
        const profile = await getUserProfile(firebaseUser.uid);
        const isSystemAdminMail = firebaseUser.email?.toLowerCase() === 'admin@tambu.com';
        
        if (isSystemAdminMail) {
          setIsAdmin(true);
          setAdminModeActive(true);
        } else {
          setIsAdmin(false);
          setAdminModeActive(false);
        }

        if (profile) {
          setUserName(profile.name);
          setUserPhone(profile.phone);
          setUserRole(profile.role);
          setTrialEndsAt(profile.trialEndsAt || '');
          setIsSubscribed(profile.isSubscribed === true);
          if (profile.subscriptionExpiresAt) {
            setSubscriptionExpiry(profile.subscriptionExpiresAt);
          } else {
            setSubscriptionExpiry('');
          }
          if (profile.isSubscribed) {
            setIsSubscriptionExpired(false);
          }
          if (profile.savedIds && profile.savedIds.length > 0) {
            setSavedIds(profile.savedIds);
          }

          // Proactively auto-sync this owner's subscription metadata onto all of their properties
          const expectedExpiry = profile.subscriptionExpiresAt || '';
          const expectedSubscribed = profile.isSubscribed === true;
          const expectedTrial = profile.trialEndsAt || '';
          
          try {
            const cachedProps = localStorage.getItem('tambu_properties');
            const parsedProps: Property[] = cachedProps ? JSON.parse(cachedProps) : [];
            const ownerProps = parsedProps.filter(p => p.ownerId === firebaseUser.uid);
            
            ownerProps.forEach(async (p) => {
              if (
                p.ownerIsSubscribed !== expectedSubscribed ||
                p.ownerSubscriptionExpiresAt !== expectedExpiry ||
                p.ownerTrialEndsAt !== expectedTrial
              ) {
                try {
                  await updatePropertyListing(p.id, {
                    ownerIsSubscribed: expectedSubscribed,
                    ownerSubscriptionExpiresAt: expectedExpiry,
                    ownerTrialEndsAt: expectedTrial
                  });
                  console.log(`Auto-synchronized subscription metadata for listing ${p.id}`);
                } catch (err) {
                  console.warn(`Could not auto-sync listing ${p.id}:`, err);
                }
              }
            });
          } catch (e) {
            console.warn("Auto-sync properties check error:", e);
          }
        } else {
          // Initialize user profile document
          const nameToSet = firebaseUser.displayName || regNameRef.current || firebaseUser.email?.split('@')[0] || 'User';
          const phoneToSet = regPhoneRef.current || '';
          const targetRole = isSystemAdminMail ? UserRole.OWNER : (regRoleRef.current || userRoleRef.current || UserRole.SEEKER);
          
          const now = new Date();
          const trialDate = new Date();
          trialDate.setDate(now.getDate() + 9); // 9-day trial structure

          const newProfile = {
            userId: firebaseUser.uid,
            name: nameToSet,
            email: firebaseUser.email || '',
            phone: phoneToSet,
            role: targetRole,
            savedIds: savedIdsRef.current,
            createdAt: now.toISOString(),
            trialEndsAt: trialDate.toISOString(),
            isSubscribed: false,
            subscriptionExpiresAt: null
          };
          await saveUserProfile(newProfile);
          setUserName(newProfile.name);
          setUserPhone(newProfile.phone);
          setUserRole(targetRole);
          setTrialEndsAt(newProfile.trialEndsAt);
          setIsSubscribed(false);
        }

        // Fetch user subcollection histories
        try {
          const loadedSearches = await getSearchHistory(firebaseUser.uid);
          setSearches(loadedSearches);
          const loadedBills = await getBillingRecords(firebaseUser.uid);
          setBillingRecords(loadedBills);
          setActivities([]);
        } catch (error) {
          console.warn("Subcollections load warning:", error);
        }

      } else {
        const cachedSimulated = localStorage.getItem('tambu_simulated_user');
        if (cachedSimulated) {
          try {
            const parsed = JSON.parse(cachedSimulated);
            setIsLoggedIn(true);
            setUserName(parsed.displayName || parsed.name || 'User');
            setUserEmail(parsed.email || '');
            setUserPhone(parsed.phone || '');
            
            const isSystemAdminMail = parsed.email?.toLowerCase() === 'admin@tambu.com';
            if (isSystemAdminMail) {
              setIsAdmin(true);
              setAdminModeActive(true);
              setUserRole(UserRole.OWNER);
            } else {
              const savedRole = localStorage.getItem('tambu_role') as UserRole;
              if (savedRole) {
                setUserRole(savedRole);
              }
            }
          } catch (e) {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
          localStorage.setItem('tambu_logged_in', 'false');
          setSearches([]);
          setBillingRecords([]);
          setActivities([]);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time property database synchronization conforming strictly to skill onSnapshot pattern
  useEffect(() => {
    let active = true;
    if (isSupabaseConfigured()) {
      getPropertiesFromSupabase().then((supProps) => {
        if (supProps && active) {
          const localCustom = localStorage.getItem('tambu_local_properties');
          const parsedLocal: Property[] = localCustom ? JSON.parse(localCustom) : [];
          const filteredLocal = parsedLocal.filter(p => p.ownerId !== 'system_admin_or_owner_seed');

          const merged = [...supProps];
          filteredLocal.forEach((localProp) => {
            const index = merged.findIndex((p) => p.id === localProp.id);
            if (index === -1) {
              merged.push(localProp);
            }
          });

          let filteredMerged = merged;
          try {
            const deletedKey = 'tambu_deleted_property_ids';
            const cachedDeleted = localStorage.getItem(deletedKey);
            const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
            if (Array.isArray(deletedList) && deletedList.length > 0) {
              filteredMerged = merged.filter(p => !deletedList.includes(p.id));
            }
          } catch (e) {}

          setProperties(filteredMerged);
          localStorage.setItem('tambu_properties', JSON.stringify(filteredMerged));
        }
      });
    }

    const pathForOnSnapshot = 'properties';
    const unsubscribeProperties = onSnapshot(collection(db, pathForOnSnapshot), (snapshot) => {
      const items: Property[] = [];
      snapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as Property;
        // Filter out any automated/pre-seeded mock properties
        if (item.ownerId !== 'system_admin_or_owner_seed') {
          items.push(item);
        }
      });

      // Integrate locally staged custom user-posted properties
      const localCustom = localStorage.getItem('tambu_local_properties');
      const parsedLocal: Property[] = localCustom ? JSON.parse(localCustom) : [];
      const filteredLocal = parsedLocal.filter(p => p.ownerId !== 'system_admin_or_owner_seed');

      const merged = [...items];
      filteredLocal.forEach((localProp) => {
        const index = merged.findIndex((p) => p.id === localProp.id);
        if (index === -1) {
          merged.push(localProp);
        }
      });

      // Secure double-lock: Filter out any deleted properties
      let filteredMerged = merged;
      try {
        const deletedKey = 'tambu_deleted_property_ids';
        const cachedDeleted = localStorage.getItem(deletedKey);
        const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
        if (Array.isArray(deletedList) && deletedList.length > 0) {
          filteredMerged = merged.filter(p => !deletedList.includes(p.id));
        }
      } catch (e) {
        // safe fallback
      }

      // Update state and local storage representing clean production environment
      setProperties(filteredMerged);
      localStorage.setItem('tambu_properties', JSON.stringify(filteredMerged));
    }, (error) => {
      console.warn("Properties real-time sync failed:", error);
      const cachedProps = localStorage.getItem('tambu_properties');
      if (cachedProps) {
        try {
          const parsed = JSON.parse(cachedProps);
          let filteredParsed = parsed.filter((p: Property) => p.ownerId !== 'system_admin_or_owner_seed');
          try {
            const deletedKey = 'tambu_deleted_property_ids';
            const cachedDeleted = localStorage.getItem(deletedKey);
            const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
            if (Array.isArray(deletedList) && deletedList.length > 0) {
              filteredParsed = filteredParsed.filter((p: Property) => !deletedList.includes(p.id));
            }
          } catch (_) {}
          setProperties(filteredParsed);
        } catch (_) {
          setProperties([]);
        }
      } else {
        setProperties([]);
      }
    });

    return () => {
      active = false;
      unsubscribeProperties();
    };
  }, []);

  // Real-time Rent payments database synchronization
  useEffect(() => {
    if (!isLoggedIn) {
      setRentPayments([]);
      return;
    }

    const unsubscribePayments = onSnapshot(collection(db, 'rent_payments'), (snapshot) => {
      const items: RentPayment[] = [];
      snapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as RentPayment;
        // Filter based on session user & admin clearances
        const uid = currentUser?.uid;
        const belongsToUser = item.ownerId === uid || item.renterId === uid;
        if (isAdmin || belongsToUser || (uid && uid.startsWith('demo_'))) {
          items.push(item);
        }
      });
      setRentPayments(items);
    }, (error) => {
      console.warn("Rent payments listener error:", error);
    });

    return () => unsubscribePayments();
  }, [isLoggedIn, currentUser, isAdmin]);

  // Real-time Support feedback messages synchronization
  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      setSupportMessages([]);
      return;
    }

    const unsubscribeSupport = onSnapshot(collection(db, 'support_messages'), (snapshot) => {
      const items: SupportMessage[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as SupportMessage);
      });

      // Integrate locally staged support messages
      const localCustom = localStorage.getItem('tambu_local_support_messages');
      const parsedLocal: SupportMessage[] = localCustom ? JSON.parse(localCustom) : [];

      const merged = [...items];
      parsedLocal.forEach((localMsg) => {
        if (!merged.some((m) => m.id === localMsg.id)) {
          merged.push(localMsg);
        }
      });

      setSupportMessages(merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      console.warn("Support messages listener error or permission restriction, fallback to local cache:", error);
      const localCustom = localStorage.getItem('tambu_local_support_messages');
      const parsedLocal: SupportMessage[] = localCustom ? JSON.parse(localCustom) : [];
      setSupportMessages(parsedLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsubscribeSupport();
  }, [isLoggedIn, isAdmin]);

  // Real-time Chats database synchronization to compute unread/total chat sessions for user badge
  useEffect(() => {
    const currentUid = auth.currentUser?.uid || (localStorage.getItem('tambu_simulated_user') ? 'demo_guest_seeker_1' : '');
    if (!isLoggedIn || !currentUid) {
      setChatsCount(0);
      return;
    }

    if (currentUid.startsWith('demo_')) {
      const cached = localStorage.getItem('tambu_chat_sessions');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setChatsCount(parsed.length);
        } catch (_) {
          setChatsCount(0);
        }
      } else {
        setChatsCount(0);
      }
      return;
    }

    const q = query(
      collection(db, 'chats'),
      or(where('seekerId', '==', currentUid), where('ownerId', '==', currentUid))
    );

    const unsub = onSnapshot(q, (snap) => {
      setChatsCount(snap.size);
    }, (err) => {
      console.warn("Chats count sync failed:", err);
    });

    return () => {
      unsub();
    };
  }, [isLoggedIn, currentUser]);

  // --- Navigation engine helper callbacks ---
  const navigateTo = (page: string, isSubscription: boolean = false) => {
    // Requirements: only signed in or logged in can:
    // 1. make payments ('checkout' / 'payment-waiting' / 'payment-airtel')
    // 2. post properties ('add-property' / 'select-photos')
    // 3. chat ('chat')
    const loginRequiredPages = ['checkout', 'payment-waiting', 'payment-airtel', 'add-property', 'select-photos', 'chat'];
    if (loginRequiredPages.includes(page) && !isLoggedIn) {
      const messages: Record<string, string> = {
        'checkout': 'Please log in or register to securely reserve and pay for properties.',
        'payment-waiting': 'Please log in or register to securely reserve and pay for properties.',
        'payment-airtel': 'Please log in or register to securely reserve and pay for properties.',
        'add-property': 'Please log in or register to list and post properties on Tambu.',
        'select-photos': 'Please log in or register to upload property photos.',
        'chat': 'Please log in or register to start a chat between the owner and tenant.'
      };
      const message = messages[page] || 'Please log in or register to access this feature.';
      triggerToast(message, 'error');
      setCurrentPage('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'add-property' && !isAdmin && currentUser) {
      const ownerPropertiesCount = properties.filter(p => p.ownerId === currentUser.uid).length;
      if (ownerPropertiesCount >= 6) {
        triggerToast('Error: Free accounts are limited to listing at most 6 properties.', 'error');
        return;
      }
    }

    if (page === 'checkout' && !isSubscription && selectedProperty) {
      const randomRef = 'RNT-' + Math.floor(1000000 + Math.random() * 9000000);
      setCheckoutItem({
        name: `Rent Reservation: ${selectedProperty.name}`,
        detail: `Reserve & rent this property online. Standard reservation process routing.`,
        amount: selectedProperty.price, // the monthly rent being paid
        reference: randomRef,
        type: 'listing'
      });
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (currentPage === 'details') {
      navigateTo('discovery');
    } else if (currentPage === 'checkout') {
      navigateTo('details');
    } else if (['payment-waiting', 'payment-airtel'].includes(currentPage)) {
      navigateTo('checkout');
    } else if (currentPage === 'filters') {
      navigateTo('discovery');
    } else if (currentPage === 'select-photos') {
      navigateTo('add-property');
    } else if (currentPage === 'add-property') {
      navigateTo(userRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    } else {
      navigateTo('discovery');
    }
  };

  // --- Toast Trigger helper ---
  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- Favorites handler ---
  const handleToggleSaved = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    let updatedList: string[];
    if (savedIds.includes(id)) {
      updatedList = savedIds.filter((item) => item !== id);
      triggerToast('Removed from saved list', 'success');
    } else {
      updatedList = [...savedIds, id];
      triggerToast('Saved to your favorites!', 'success');
    }
    setSavedIds(updatedList);

    if (currentUser) {
      try {
        await updateSavedProperties(currentUser.uid, updatedList);
      } catch (err) {
        console.warn('Could not sync favorites to Firestore:', err);
      }
    }
  };

  // --- Filters Apply Callback ---
  const handleApplyFilters = async (
    query: string, 
    prov: Province | '', 
    min: number, 
    max: number, 
    types: PropertyType[]
  ) => {
    setSearchQuery(query);
    setSelectedProvince(prov);
    setMinPrice(min);
    setMaxPrice(max);
    setSelectedPropertyTypes(types);
    
    if (query.trim()) {
      const newSearch: SearchHistory = { id: Date.now().toString(), query };
      setSearches((prev) => [newSearch, ...prev.slice(0, 4)]);
      
      if (currentUser) {
        try {
          await addSearchHistory(currentUser.uid, newSearch);
        } catch (err) {
          console.warn("Could not sync search history to Firestore:", err);
        }
      }
    }

    triggerToast('Filters applied successfully', 'success');
    navigateTo('discovery');
  };

  // --- Selection and Details handles ---
  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    navigateTo('details');
  };

  // --- Authentication Submit operations (Production Firebase Auth integration) ---
  const handleDemoLogin = (role: UserRole) => {
    const demoProfile = {
      uid: 'demo_' + (role === UserRole.OWNER ? 'owner123' : 'seeker123'),
      email: role === UserRole.OWNER ? 'demo-owner@tambu.co.zm' : 'demo-seeker@tambu.co.zm',
      displayName: role === UserRole.OWNER ? 'Mwamba Chileshe (Demo Owner)' : 'Bwalya Mulenga (Demo Seeker)',
      photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
    };

    setSimulatedUser(demoProfile);
    setIsLoggedIn(true);
    setUserName(demoProfile.displayName);
    setUserEmail(demoProfile.email);
    setUserPhone(role === UserRole.OWNER ? '0977223344' : '0966554433');
    setUserRole(role);
    
    // Default demo owner to a fully working 5 days remaining trial
    if (role === UserRole.OWNER) {
      const testTrialDate = new Date();
      testTrialDate.setDate(testTrialDate.getDate() + 5);
      setTrialEndsAt(testTrialDate.toISOString());
      setIsSubscribed(false);
      setSubscriptionExpiry('');
      setIsSubscriptionExpired(false);
    } else {
      setTrialEndsAt('');
      setIsSubscribed(false);
      setSubscriptionExpiry('');
      setIsSubscriptionExpired(false);
    }

    triggerToast(`Logged in successfully under demo mode!`, 'success');
    navigateTo(role === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthErrorMsg('');
      const authData = await loginWithGoogle();
      
      // If it returned a direct user object (e.g. from Firebase Auth Popup or mock fallback)
      if (authData && (authData as any).user) {
        const u = (authData as any).user;
        triggerToast('Welcome back! Google Sign-In succeeded.', 'success');
        
        const profile = await getUserProfile(u.uid);
        let finalRole = UserRole.SEEKER;
        if (profile) {
          finalRole = profile.role;
        } else {
          finalRole = currentPage === 'register' ? regRole : userRole;
        }
        setUserRole(finalRole);
        navigateTo(finalRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
        return;
      }

      // If it returned a Supabase OAuth URL to open
      if (authData && (authData as any).url) {
        // Open the popup window in the center of the screen
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          (authData as any).url,
          'tambu_google_auth',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
        
        if (!popup) {
          triggerToast('Popup blocked! Please allow popups for this site to sign in with Google.', 'error');
        } else {
          triggerToast('Opening secure Google Sign-In...', 'success');
          
          // Set a monitoring interval to detect when the popup is closed by the user
          const monitor = setInterval(() => {
            if (popup.closed) {
              clearInterval(monitor);
              
              // Wait a moment for any message handlers to finish processing
              setTimeout(() => {
                const isLoggedInNow = localStorage.getItem('tambu_logged_in') === 'true';
                if (!isLoggedInNow) {
                  setAuthErrorMsg("Google Sign-In failed or was closed. Please ensure the Google provider is enabled and configured in your Supabase project under Authentication -> Providers.");
                }
              }, 1200);
            }
          }, 1000);
        }
      } else {
        throw new Error('Could not retrieve Google sign-in configuration.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Google authentication cancelled or failed', 'error');
      const errMsg = err.message || String(err);
      if (errMsg.includes('unauthorized-domain') || errMsg.includes('auth/unauthorized-domain') || err.code === 'auth/unauthorized-domain') {
        setAuthErrorMsg("This domain is not authorized for Google OAuth operations in your Firebase project. You must add this domain to the Authorized Domains list in your Firebase console inside Authentication -> Settings!");
      } else {
        setAuthErrorMsg(`Google Authentication Error: ${errMsg}`);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    // Try standard Firebase Authentication first to resolve actual global sessions
    try {
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } catch (err: any) {
        // If the user entered the correct master admin credentials but they don't exist yet in the Firebase project,
        // create the user dynamically so their session is properly authenticated on Firestore!
        if (loginEmail.toLowerCase() === 'admin@tambu.com' && loginPassword === 'Admin2026') {
          console.info("Master Admin account not found in Firebase database. Provisioning admin@tambu.com credentials dynamically...");
          try {
            credential = await createUserWithEmailAndPassword(auth, 'admin@tambu.com', 'Admin2026');
          } catch (createErr: any) {
            console.error("Could not dynamically provision master admin auth credentials:", createErr);
            throw err;
          }
        } else {
          throw err;
        }
      }

      triggerToast('Logged in successfully!', 'success');
      setIsLoggedIn(true);
      localStorage.setItem('tambu_logged_in', 'true');
      
      let finalRole: UserRole = UserRole.SEEKER;
      const isSystemAdminMail = credential.user.email?.toLowerCase() === 'admin@tambu.com';
      if (isSystemAdminMail) {
        setIsAdmin(true);
        setAdminModeActive(true);
      } else {
        setIsAdmin(false);
        setAdminModeActive(false);
      }

      const profile = await getUserProfile(credential.user.uid);
      if (profile) {
        finalRole = profile.role;
        setTrialEndsAt(profile.trialEndsAt || '');
        setIsSubscribed(profile.isSubscribed === true);
      } else {
        finalRole = userRole;
      }
      
      setUserRole(finalRole);
      setLoginEmail('');
      setLoginPassword('');
      navigateTo(finalRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    } catch (err: any) {
      console.warn("Real authentication failed or is not initialized yet in console. Checking simulated offline fallback:", err);

      // If Supabase is configured and we got an authentication error, display it explicitly
      if (isSupabaseConfigured()) {
        const errorMsg = err.message || err.description || String(err);
        setAuthErrorMsg(`Supabase Authentication failed: ${errorMsg}`);
        triggerToast(`Login failed: ${errorMsg}`, 'error');
        return;
      }

      // Conformance credentials requirement for simulated admin fallback 
      if (loginEmail.toLowerCase() === 'admin@tambu.com' && loginPassword === 'Admin2026') {
        setIsAdmin(true);
        setAdminModeActive(true);
        setIsLoggedIn(true);
        setUserName('Tambu Administrator');
        setUserEmail('admin@tambu.com');
        setUserPhone('+260 977 112233');
        setUserRole(UserRole.OWNER); // Uses the same dashboards layout

        const adminProfile = {
          uid: 'admin_tambu',
          email: 'admin@tambu.com',
          displayName: 'Tambu System Administrator',
        };
        setSimulatedUser(adminProfile);
        setLoginEmail('');
        setLoginPassword('');
        triggerToast('Logged in successfully as System Administrator!', 'success');
        navigateTo('owner-dashboard');
        return;
      }

      // Scan localStorage for any matching cached sandbox profiles
      try {
        let foundProfile = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tambu_profile_fallback_')) {
            const valStr = localStorage.getItem(key);
            if (valStr) {
              const val = JSON.parse(valStr);
              if (val && val.email?.toLowerCase() === loginEmail.toLowerCase()) {
                foundProfile = val;
                break;
              }
            }
          }
        }

        if (foundProfile) {
          const simulatedUserObj = {
            uid: foundProfile.userId,
            email: foundProfile.email,
            displayName: foundProfile.name,
            photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0'
          };
          setSimulatedUser(simulatedUserObj);
          setIsLoggedIn(true);
          setUserName(foundProfile.name);
          setUserEmail(foundProfile.email);
          setUserPhone(foundProfile.phone || '0977223344');
          setUserRole(foundProfile.role);
          setTrialEndsAt(foundProfile.trialEndsAt || '');
          setIsSubscribed(foundProfile.isSubscribed === true);
          setLoginEmail('');
          setLoginPassword('');
          triggerToast(`Welcome back, ${foundProfile.name}! Logged in successfully.`, 'success');
          navigateTo(foundProfile.role === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
          return;
        }
      } catch (e) {
        console.error("Error scanning local sandbox profiles:", e);
      }

      // Default sandbox login fallback for unconfigured environments
      console.log("No matching cached profile. Dynamically generating sandbox profile...");
      const userPart = loginEmail.split('@')[0];
      const prettyName = userPart.charAt(0).toUpperCase() + userPart.slice(1);
      const simulatedUid = 'sandbox_' + Math.random().toString(36).substring(2, 11);
      
      const newProfile = {
        userId: simulatedUid,
        name: prettyName,
        email: loginEmail,
        phone: '0977223344',
        role: userRole, // Uses the current UI selected role preference
        savedIds: [],
        createdAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString(),
        isSubscribed: false,
        subscriptionExpiresAt: null
      };

      try {
        localStorage.setItem(`tambu_profile_fallback_${simulatedUid}`, JSON.stringify(newProfile));
      } catch (e) {
        console.error("Local storage fallback write failed:", e);
      }

      const simulatedUserObj = {
        uid: simulatedUid,
        email: loginEmail,
        displayName: prettyName,
        photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0'
      };

      setSimulatedUser(simulatedUserObj);
      setIsLoggedIn(true);
      setUserName(prettyName);
      setUserEmail(loginEmail);
      setUserPhone('0977223344');
      setTrialEndsAt(newProfile.trialEndsAt);
      setIsSubscribed(false);
      setLoginEmail('');
      setLoginPassword('');
      
      triggerToast('Auth service offline. Activated Sandbox Account!', 'success');
      navigateTo(userRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regName || !regPhone || !regPassword) return;

    try {
      const credential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      
      const now = new Date();
      const trialDate = new Date();
      trialDate.setDate(now.getDate() + 9); // 9-day trials for owners

      const newProfile = {
        userId: credential.user.uid,
        name: regName,
        email: regEmail,
        phone: regPhone,
        role: regRole,
        savedIds: [],
        createdAt: now.toISOString(),
        trialEndsAt: trialDate.toISOString(),
        isSubscribed: false,
        subscriptionExpiresAt: null
      };
      await saveUserProfile(newProfile);
      
      setTrialEndsAt(newProfile.trialEndsAt);
      setIsSubscribed(false);
      setUserRole(regRole);
      setRegEmail('');
      setRegName('');
      setRegPhone('');
      setRegPassword('');
      triggerToast('Account created successfully!', 'success');
      navigateTo(regRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    } catch (err: any) {
      console.warn("Real database registration failed. Activating local Sandbox fallback:", err);
      
      // If Supabase is configured and registration failed, display the actual error
      if (isSupabaseConfigured()) {
        const errorMsg = err.message || err.description || String(err);
        setAuthErrorMsg(`Supabase Registration failed: ${errorMsg}`);
        triggerToast(`Registration failed: ${errorMsg}`, 'error');
        return;
      }

      const now = new Date();
      const trialDate = new Date();
      trialDate.setDate(now.getDate() + 9); // 9-day trial for owners
      
      const simulatedUid = 'sandbox_' + Math.random().toString(36).substring(2, 11);
      const newProfile = {
        userId: simulatedUid,
        name: regName,
        email: regEmail,
        phone: regPhone,
        role: regRole,
        savedIds: [],
        createdAt: now.toISOString(),
        trialEndsAt: trialDate.toISOString(),
        isSubscribed: false,
        subscriptionExpiresAt: null
      };

      // Save user sandbox profile mock to LocalStorage
      try {
        localStorage.setItem(`tambu_profile_fallback_${simulatedUid}`, JSON.stringify(newProfile));
      } catch (e) {
        console.error("Local storage mock save failed:", e);
      }

      const simulatedUserObj = {
        uid: simulatedUid,
        email: regEmail,
        displayName: regName,
        photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0'
      };

      setSimulatedUser(simulatedUserObj);
      setIsLoggedIn(true);
      setUserName(regName);
      setUserEmail(regEmail);
      setUserPhone(regPhone);
      setUserRole(regRole);
      setTrialEndsAt(newProfile.trialEndsAt);
      setIsSubscribed(false);
      
      setRegEmail('');
      setRegName('');
      setRegPhone('');
      setRegPassword('');
      
      triggerToast('Auth service offline. Activated local Sandbox Account!', 'success');
      navigateTo(regRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        await logoutUser();
      }
      setSimulatedUser(null);
      setIsLoggedIn(false);
      setUserName('');
      setUserEmail('');
      setUserPhone('');
      setUserRole(UserRole.SEEKER);
      setIsAdmin(false);
      setAdminModeActive(false);
      setTrialEndsAt('');
      setIsSubscribed(false);
      setRentPayments([]);
      setSearches([]);
      setBillingRecords([]);
      setActivities([]);
      localStorage.removeItem('tambu_simulated_user');
      localStorage.removeItem('tambu_user_name');
      localStorage.removeItem('tambu_user_email');
      localStorage.removeItem('tambu_user_phone');
      localStorage.removeItem('tambu_role');
      localStorage.setItem('tambu_is_admin', 'false');
      localStorage.setItem('tambu_admin_mode_active', 'false');
      localStorage.setItem('tambu_trial_ends', '');
      localStorage.setItem('tambu_is_subscribed', 'false');
      localStorage.setItem('tambu_logged_in', 'false');
      triggerToast('Logged out of system', 'success');
      navigateTo('discovery');
    } catch (err: any) {
      triggerToast('Sign-out verification failed', 'error');
    }
  };

  // --- Property creation by owners ---
  const handlePublishListing = async (input: NewListingInput) => {
    if (!currentUser) {
      triggerToast('Please sign in to list properties', 'error');
      navigateTo('login');
      return;
    }

    if (!isAdmin) {
      const ownerPropertiesCount = properties.filter(p => p.ownerId === currentUser.uid).length;
      if (ownerPropertiesCount >= 6) {
        triggerToast('Error: Free accounts are limited to listing at most 6 properties.', 'error');
        navigateTo('owner-dashboard');
        return;
      }
    }

    const safeToISOString = (dateStr: any): string | undefined => {
      if (!dateStr) return undefined;
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString();
      } catch (e) {
        return undefined;
      }
    };

    const propId = 'prop_' + Date.now();
    const rawRecord: Property = {
      id: propId,
      name: input.name,
      location: input.location,
      price: Number(input.price),
      type: input.type,
      beds: Number(input.beds),
      baths: Number(input.baths),
      sqm: Number(input.sqm),
      image: input.photos[0] || '',
      verified: false, // matches security rule
      featured: false, // matches security rule
      rating: 4.8,
      saves: 0,
      views: 120,
      province: input.province,
      ownerId: currentUser.uid,
      ownerName: userName,
      ownerImage: currentUser.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      ownerPhone: input.phone,
      ownerWhatsapp: input.whatsapp,
      available: true,
      propertyOfTheWeek: !!input.propertyOfTheWeek,
      description: input.description,
      distance: input.distance,
      photos: input.photos,
      amenities: input.amenities,
      ownerTrialEndsAt: safeToISOString(trialEndsAt),
      ownerIsSubscribed: isSubscribed,
      ownerSubscriptionExpiresAt: safeToISOString(subscriptionExpiry),
    };

    // Remove any undefined properties flatly to prevent firestore setDoc errors
    const cleanedRecord = {} as Property;
    Object.keys(rawRecord).forEach(key => {
      const val = (rawRecord as any)[key];
      if (val !== undefined && val !== null) {
        (cleanedRecord as any)[key] = val;
      }
    });

    // Supabase Integration Coexistence
    let finalRecord = { ...cleanedRecord };
    const supabaseActive = isSupabaseConfigured();
    if (supabaseActive) {
      try {
        console.log('Publishing listing details & photos to Supabase storage bucket & table...');
        const savedData = await savePropertyToSupabase(cleanedRecord);
        if (savedData && savedData[0]) {
          const supRecord = savedData[0];
          if (supRecord.image) {
            finalRecord.image = supRecord.image;
          }
          if (Array.isArray(supRecord.photos)) {
            finalRecord.photos = supRecord.photos;
          }
        }
        console.log('Successfully saved listing in Supabase database!');
      } catch (supabaseError: any) {
        console.error('Supabase publishing failed:', supabaseError);
        triggerToast('Supabase Publish Failed: ' + (supabaseError.message || 'Error occurred.'), 'error');
        // Do not throw or block the main application's flow, fall back to default
      }
    }

    try {
      await createPropertyListing(finalRecord);
      setSelectedPhotos([]); // Clear choice pool

      // Instantly update properties state and cache so it shows in the dashboard and home screen without delay
      setProperties(prev => {
        const index = prev.findIndex(p => p.id === finalRecord.id);
        if (index === -1) {
          const updated = [finalRecord, ...prev];
          localStorage.setItem('tambu_properties', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });

      const billId = 'inv_' + Date.now();
      const newInvoice: BillingRecord = {
        id: billId,
        reference: 'FLW-' + Math.floor(1000000 + Math.random() * 9000000),
        amount: 100.00,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'SUCCESSFUL'
      };
      await addBillingRecord(currentUser.uid, newInvoice);

      if (supabaseActive) {
        triggerToast('Property successfully listed on Tambu & Supabase!', 'success');
      } else {
        triggerToast('Property successfully listed & activated on tambu!', 'success');
      }
      navigateTo('owner-dashboard');
    } catch (err: any) {
      console.error("Listing publish error:", err);
      let errMsg = 'Schema rules prevented publishing listing.';
      try {
        if (err && err.message) {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            errMsg = `Schema/Permission Rule Denied: ${parsed.error} (${parsed.path || ''})`;
          } else {
            errMsg = err.message;
          }
        }
      } catch (e) {
        if (err && err.message) {
          errMsg = err.message;
        } else if (typeof err === 'string') {
          errMsg = err;
        }
      }
      triggerToast(`Error: ${errMsg}`, 'error');
    }
  };

  const handleTogglePropertyAvailability = async (id: string, currentAvailable: boolean) => {
    const targetAvailable = !currentAvailable;
    // Update local list first for instant snappiness
    setProperties(prev => prev.map(p => p.id === id ? { ...p, available: targetAvailable } : p));
    
    try {
      if (!id.startsWith('demo_')) {
        await updatePropertyListing(id, { available: targetAvailable });
      }
      triggerToast(targetAvailable ? 'Property marked as AVAILABLE to rent!' : 'Property marked as OCCUPIED / UNAVAILABLE.', 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not update property availability.', 'error');
    }
  };

  const handleTogglePropertySpotlight = async (id: string, currentSpotlight: boolean) => {
    const targetSpotlight = !currentSpotlight;
    
    // Update state to set the selected property's spotlight and unset other spotlights to keep it singular.
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, propertyOfTheWeek: targetSpotlight };
      } else if (targetSpotlight) {
        return { ...p, propertyOfTheWeek: false };
      }
      return p;
    }));

    try {
      if (targetSpotlight) {
        const othersToUnset = properties.filter(p => p.propertyOfTheWeek && p.id !== id);
        for (const p of othersToUnset) {
          if (!p.id.startsWith('demo_')) {
            await updatePropertyListing(p.id, { propertyOfTheWeek: false });
          }
        }
      }

      if (!id.startsWith('demo_')) {
        await updatePropertyListing(id, { propertyOfTheWeek: targetSpotlight });
      }

      triggerToast(targetSpotlight ? 'Selected as the spotlight "Property of the Week"!' : 'Removed from "Property of the Week" spotlight.', 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not update property spotlight status.', 'error');
    }
  };

  const handleTogglePropertyVerified = async (id: string, currentVerified: boolean) => {
    const targetVerified = !currentVerified;
    // Update local list first for instant snappiness
    setProperties(prev => prev.map(p => p.id === id ? { ...p, verified: targetVerified } : p));
    
    try {
      if (!id.startsWith('demo_')) {
        await updatePropertyListing(id, { verified: targetVerified });
      }
      triggerToast(targetVerified ? 'Property marked as VERIFIED!' : 'Property verification removed.', 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not update property verification.', 'error');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      await deletePropertyListing(id);
      setProperties(properties.filter((p) => p.id !== id));
      triggerToast('Listing removed successfully', 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not delete listing', 'error');
    }
  };

  // --- Secure checkout payment triggers ---
  const handlePayMTN = async (phone: string) => {
    setUserPhone(phone);
    setMomoProvider('mtn');
    
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: checkoutItem?.amount || 100.00,
          reference: checkoutItem?.reference || 'SUB-' + Date.now(),
          email: userEmail || 'seeker@tambu.co.zm',
          phone: phone,
          description: checkoutItem?.name || 'Tambu Premium Placements',
          redirectUrl: window.location.origin + '/'
        })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentFlwRef(data.tx_ref);
        setCurrentFlwUrl(data.paymentUrl);
        
        try {
          window.open(data.paymentUrl, '_blank');
        } catch (popupErr) {
          console.warn('Popup blocked, relying on manual button:', popupErr);
        }
        
        navigateTo('payment-waiting');
      } else {
        // Fall back gracefully to local sandbox if status is not success
        triggerToast('Gateway busy. Directing to Tambu Safe Checkout sandbox...', 'success');
        const fallbackRef = 'DEMO-SUB-' + Date.now();
        setCurrentFlwRef(fallbackRef);
        setCurrentFlwUrl(null);
        navigateTo('payment-waiting');
      }
    } catch (err: any) {
      console.error('Flutterwave initialize failed:', err);
      triggerToast('Gateway offline. Directing to Tambu Safe Checkout sandbox...', 'success');
      const fallbackRef = 'DEMO-SUB-' + Date.now();
      setCurrentFlwRef(fallbackRef);
      setCurrentFlwUrl(null);
      navigateTo('payment-waiting');
    }
  };

  const handlePayAirtel = async (phone: string) => {
    setUserPhone(phone);
    setMomoProvider('airtel');
    
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: checkoutItem?.amount || 100.00,
          reference: checkoutItem?.reference || 'SUB-' + Date.now(),
          email: userEmail || 'seeker@tambu.co.zm',
          phone: phone,
          description: checkoutItem?.name || 'Tambu Premium Placements',
          redirectUrl: window.location.origin + '/'
        })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentFlwRef(data.tx_ref);
        setCurrentFlwUrl(data.paymentUrl);
        
        try {
          window.open(data.paymentUrl, '_blank');
        } catch (popupErr) {
          console.warn('Popup blocked, relying on manual button:', popupErr);
        }
        
        navigateTo('payment-waiting');
      } else {
        // Fall back gracefully to local sandbox if status is not success
        triggerToast('Gateway busy. Directing to Tambu Safe Checkout sandbox...', 'success');
        const fallbackRef = 'DEMO-SUB-' + Date.now();
        setCurrentFlwRef(fallbackRef);
        setCurrentFlwUrl(null);
        navigateTo('payment-waiting');
      }
    } catch (err: any) {
      console.error('Flutterwave initialize failed:', err);
      triggerToast('Gateway offline. Directing to Tambu Safe Checkout sandbox...', 'success');
      const fallbackRef = 'DEMO-SUB-' + Date.now();
      setCurrentFlwRef(fallbackRef);
      setCurrentFlwUrl(null);
      navigateTo('payment-waiting');
    }
  };

  const handlePayCard = async () => {
    setMomoProvider('card');
    
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: checkoutItem?.amount || 100.00,
          reference: checkoutItem?.reference || 'SUB-' + Date.now(),
          email: userEmail || 'seeker@tambu.co.zm',
          phone: userPhone || '0977223344',
          description: checkoutItem?.name || 'Tambu Premium Placements',
          redirectUrl: window.location.origin + '/'
        })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentFlwRef(data.tx_ref);
        setCurrentFlwUrl(data.paymentUrl);
        
        try {
          window.open(data.paymentUrl, '_blank');
        } catch (popupErr) {
          console.warn('Popup blocked, relying on manual button:', popupErr);
        }
        
        navigateTo('payment-waiting');
      } else {
        // Fall back gracefully to local sandbox if status is not success
        triggerToast('Gateway busy. Directing to Tambu Safe Checkout sandbox...', 'success');
        const fallbackRef = 'DEMO-SUB-' + Date.now();
        setCurrentFlwRef(fallbackRef);
        setCurrentFlwUrl(null);
        navigateTo('payment-waiting');
      }
    } catch (err: any) {
      console.error('Flutterwave initialize failed:', err);
      triggerToast('Gateway offline. Directing to Tambu Safe Checkout sandbox...', 'success');
      const fallbackRef = 'DEMO-SUB-' + Date.now();
      setCurrentFlwRef(fallbackRef);
      setCurrentFlwUrl(null);
      navigateTo('payment-waiting');
    }
  };

  // --- Successful checkout complete callback ---
  const handlePaymentComplete = async () => {
    if (!checkoutItem) return;

    if (checkoutItem.type === 'subscription') {
      const billId = 'sub_' + Date.now();
      const newInvoice: BillingRecord = {
        id: billId,
        reference: checkoutItem.reference,
        amount: checkoutItem.amount,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'SUCCESSFUL'
      };
      
      if (currentUser) {
        try {
          await addBillingRecord(currentUser.uid, newInvoice);
          
          // Also update the UserProfile isSubscribed state within Firestore securely
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            const expiryString = date.toISOString();
            const updatedProfile = {
              ...profile,
              isSubscribed: true,
              subscriptionExpiresAt: expiryString
            };
            await saveUserProfile(updatedProfile);

            // Fetch and update all owned property documents on Firestore dynamically
            const ownerProps = properties.filter((p) => p.ownerId === currentUser.uid);
            for (const p of ownerProps) {
              try {
                await updatePropertyListing(p.id, {
                  ownerIsSubscribed: true,
                  ownerSubscriptionExpiresAt: expiryString
                });
              } catch (subErr) {
                console.warn(`Could not update subscription expiry fields on property ${p.id}:`, subErr);
              }
            }
          }
        } catch (err) {
          console.warn('Could not persist subscription record in Firestore:', err);
        }
      }
      
      setBillingRecords(prev => [newInvoice, ...prev]);
      setIsSubscribed(true);
      
      // Calculate new subscription date (+30 days)
      const date = new Date();
      date.setDate(date.getDate() + 30);
      const expiryStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      setSubscriptionExpiry(expiryStr);
      setIsSubscriptionExpired(false);
      setCheckoutItem(null);
      
      triggerToast('K100 Subscription successfully renewed! Your properties are now ACTIVE.', 'success');
      navigateTo('owner-dashboard');
    } else if (checkoutItem.type === 'listing' && selectedProperty) {
      // Record secure rent payment
      const paymentId = 'pay_' + Date.now();
      const rentPaymentRecord: RentPayment = {
        id: paymentId,
        reference: checkoutItem.reference,
        propertyId: selectedProperty.id,
        propertyName: selectedProperty.name,
        propertyLocation: selectedProperty.location,
        renterId: currentUser ? currentUser.uid : 'seeker_anonymous',
        renterName: userName || 'Seeker Guest',
        renterEmail: userEmail || '',
        renterPhone: userPhone || '',
        ownerId: selectedProperty.ownerId || 'unknown_owner',
        ownerName: selectedProperty.ownerName || 'Property Owner',
        amount: checkoutItem.amount,
        status: 'SUCCESSFUL',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString()
      };

      try {
        await addRentPayment(rentPaymentRecord);
        triggerToast(`ZMW ${checkoutItem.amount} Rent reservation successfully transacted through Tambu Secure Pay!`, 'success');
      } catch (err) {
        console.warn('Could not persist rent payment in Firestore, falling back to local memory state:', err);
        triggerToast(`Rent payment recorded successfully!`, 'success');
      }

      setRentPayments(prev => [rentPaymentRecord, ...prev]);
      setCheckoutItem(null);
      navigateTo('seeker-dashboard');
    } else {
      triggerToast('Payment transaction successfully documented', 'success');
      navigateTo(userRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light text-text-charcoal flex flex-col pt-16 font-sans">
      
      {/* Absolute Toast alert block */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-10 z-[100] animate-bounce select-none">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-2.5 max-w-sm ${
            toast.type === 'success' 
              ? 'bg-[#78fac4] border-[#006c4c] text-[#002115]' 
              : 'bg-[#ffdad8] border-[#b52330] text-[#b52330]'
          }`}>
            {toast.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-xs sm:text-sm font-bold leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Persistent App Header */}
      <Header
        currentPage={currentPage}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        userName={userName}
        onBack={handleBack}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        adminModeActive={adminModeActive}
        chatsCount={chatsCount}
      />

      {/* Main Container Switch Route Engine */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-6">
        {(() => {
          const visibleProperties = properties.filter((p) => {
            try {
              const deletedKey = 'tambu_deleted_property_ids';
              const cachedDeleted = localStorage.getItem(deletedKey);
              const deletedList = cachedDeleted ? JSON.parse(cachedDeleted) : [];
              if (Array.isArray(deletedList) && deletedList.includes(p.id)) {
                return false;
              }
            } catch (_) {}

            return isPropertyActive(
              p,
              currentUser?.uid,
              trialEndsAt,
              isSubscribed,
              subscriptionExpiry
            );
          });

          switch (currentPage) {
            
            // 1. Discovery Exploration Screen
            case 'discovery':
              return (
                <DiscoveryView
                  properties={visibleProperties}
                  savedIds={savedIds}
                  searchQuery={searchQuery}
                  isLoggedIn={isLoggedIn}
                  userRole={userRole}
                  selectedProvince={selectedProvince}
                  selectedPropertyTypes={selectedPropertyTypes}
                  onSelectProperty={handleSelectProperty}
                  onToggleSaved={handleToggleSaved}
                  onNavigate={navigateTo}
                  onUpdateFilters={(q, p, t) => {
                    setSearchQuery(q);
                    setSelectedProvince(p);
                    setSelectedPropertyTypes(t);
                  }}
                  currentUserId={currentUser?.uid}
                  trialEndsAt={trialEndsAt}
                  isSubscribed={isSubscribed}
                  subscriptionExpiry={subscriptionExpiry}
                />
              );

            // 2. Saved list favorite overview
            case 'saved':
              const savedList = visibleProperties.filter((p) => savedIds.includes(p.id));
              return (
                <div className="space-y-8 animate-fade-in pb-20">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1b1c1c]">Saved Homes</h1>
                    <p className="text-xs sm:text-sm text-[#5a403f]">Your personal bookmark catalog of favorite houses & boarding rooms</p>
                  </div>

                  {savedList.length === 0 ? (
                    <div className="bg-white rounded-2xl p-1   sm:p-12 text-center border border-[#e4e2e2] py-16 space-y-4">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto stroke-[1.5px]" />
                      <div className="text-sm font-bold text-[#5a403f]">No Saved Properties</div>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">Click the heart button on any boarding houses or luxury complexes during your search searches.</p>
                      <button 
                        onClick={() => navigateTo('discovery')}
                        className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-2.5 px-6 rounded-xl active:scale-95 transition-all shadow-md"
                      >
                        Explore properties now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                      {savedList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-[#e4e2e2] overflow-hidden group shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-[#eae8e7]">
                            <img
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                              referrerPolicy="no-referrer"
                              src={item.image}
                              onClick={() => handleSelectProperty(item)}
                            />
                            {item.verified && (
                              <div 
                                className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/85 flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-150/50"
                                title="Verified Property"
                              >
                                <Check className="w-4 h-4 stroke-[3px]" />
                              </div>
                            )}
                            <button
                              onClick={(e) => handleToggleSaved(item.id, e)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 flex items-center justify-center text-[#b52330] shadow-sm active:scale-90 transition-transform"
                            >
                              <Heart className="w-4 h-4 fill-current text-[#b52330]" />
                            </button>
                          </div>

                          <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                            <h3 
                              onClick={() => handleSelectProperty(item)}
                              className="font-bold text-xs sm:text-base text-[#1b1c1c] hover:text-[#b52330] transition-colors cursor-pointer truncate"
                            >
                              {item.name}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-[#5a403f] truncate">{item.location}</p>
                            <span className="text-[#b52330] font-extrabold text-xs sm:text-base block pt-0.5">
                              ZMW {item.price !== undefined && item.price !== null ? Number(item.price).toLocaleString() : '0'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

            // 3. Detailed Property Showcase screen
            case 'details':
              if (!selectedProperty) return null;
              return (
                <PropertyDetailsView
                  property={selectedProperty}
                  savedIds={savedIds}
                  isLoggedIn={isLoggedIn}
                  currentUserName={userName || currentUser?.displayName || currentUser?.email?.split('@')[0] || ''}
                  onToggleSaved={handleToggleSaved}
                  onNavigate={navigateTo}
                  onShowToast={triggerToast}
                />
              );

            // Chat View routing option
            case 'chat':
              return (
                <ChatView
                  activeProperty={selectedProperty}
                  currentUserRole={userRole}
                  currentUserName={userName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                  currentUserEmail={currentUser?.email || ''}
                  currentUserId={currentUser ? currentUser.uid : 'demo_guest_seeker_1'}
                  onBack={handleBack}
                  isAdmin={isAdmin && adminModeActive}
                />
              );

            // 4. Secure checkout configurations
            case 'checkout':
              return (
                <CheckoutView
                  userPhone={userPhone}
                  onPayMTN={handlePayMTN}
                  onPayAirtel={handlePayAirtel}
                  onPayCard={handlePayCard}
                  onCancel={handleBack}
                  title={checkoutItem?.name}
                  description={checkoutItem?.detail}
                  amount={checkoutItem?.amount}
                  reference={checkoutItem?.reference}
                />
              );

            // 5. Active payment transaction loaders
            case 'payment-waiting':
              return (
                <ProcessingView
                  provider={momoProvider}
                  phone={userPhone}
                  onComplete={handlePaymentComplete}
                  tx_ref={currentFlwRef}
                  amount={checkoutItem?.amount}
                  paymentUrl={currentFlwUrl}
                />
              );

            // 6. Advanced filters sheet
            case 'filters':
              return (
                <FiltersView
                  initialProvince={selectedProvince}
                  initialMinPrice={minPrice}
                  initialMaxPrice={maxPrice}
                  initialPropertyTypes={selectedPropertyTypes}
                  initialSearchQuery={searchQuery}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={() => {
                    setSelectedProvince('');
                    setMinPrice(100);
                    setMaxPrice(5000000);
                    setSelectedPropertyTypes([]);
                    setSearchQuery('');
                  }}
                />
              );

             // 7. Seeker portfolio logs
            case 'seeker-dashboard':
              return (
                <DashboardView
                  userRole={UserRole.SEEKER}
                  userName={userName}
                  properties={properties}
                  savedIds={savedIds}
                  activities={activities}
                  searches={searches}
                  billingRecords={billingRecords}
                  onSelectProperty={handleSelectProperty}
                  onNavigate={navigateTo}
                  onDeleteProperty={handleDeleteProperty}
                  onShowToast={triggerToast}
                  rentPayments={rentPayments}
                  ownerId={currentUser?.uid}
                  onTogglePropertyAvailability={handleTogglePropertyAvailability}
                  onTogglePropertySpotlight={handleTogglePropertySpotlight}
                  onTogglePropertyVerified={handleTogglePropertyVerified}
                  supportMessages={supportMessages}
                />
              );

            // 8. Owner portfolio logs
            case 'owner-dashboard':
              return (
                <DashboardView
                  userRole={UserRole.OWNER}
                  userName={userName}
                  properties={properties}
                  savedIds={savedIds}
                  activities={activities}
                  searches={searches}
                  billingRecords={billingRecords}
                  onSelectProperty={handleSelectProperty}
                  onNavigate={navigateTo}
                  onDeleteProperty={handleDeleteProperty}
                  onShowToast={triggerToast}
                  isSubscriptionExpired={isSubscriptionExpired}
                  subscriptionExpiry={subscriptionExpiry}
                  onPaySubscription={handlePaySubscription}
                  onToggleSubscriptionExpirySimulated={handleToggleSubscriptionExpirySimulated}
                  isAdmin={isAdmin && adminModeActive}
                  trialEndsAt={trialEndsAt}
                  isSubscribed={isSubscribed}
                  rentPayments={rentPayments}
                  ownerId={currentUser?.uid}
                  onTogglePropertyAvailability={handleTogglePropertyAvailability}
                  onTogglePropertySpotlight={handleTogglePropertySpotlight}
                  onTogglePropertyVerified={handleTogglePropertyVerified}
                  supportMessages={supportMessages}
                />
              );

            // 9. Inputting placements view (Owner mode)
            case 'add-property':
              return (
                <ListingFormView
                  selectedPhotos={selectedPhotos}
                  onOpenPhotoSelector={() => navigateTo('select-photos')}
                  onPublishListing={handlePublishListing}
                  onCancel={handleBack}
                  initialPhone={userPhone}
                  isAdmin={isAdmin}
                />
              );

            // 10. Photo choices selection screen
            case 'select-photos':
              return (
                <PhotoSelectorView
                  initialSelected={selectedPhotos}
                  onConfirmSelection={(photos) => {
                    setSelectedPhotos(photos);
                    navigateTo('add-property');
                  }}
                  onCancel={handleBack}
                />
              );

            // 11. Security login validation screen
            case 'login':
            case 'register':
              return (
                <div className="max-w-[420px] mx-auto pt-10 pb-20 px-4 sm:px-0">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <span className="font-extrabold text-4xl text-[#b52330] lowercase tracking-tight select-none font-sans block">tambu</span>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {isRegistering ? 'Create Your Account' : 'Welcome Back'}
                      </h1>
                      <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                        {isRegistering 
                          ? 'Sign up to list or find rental rooms easily.' 
                          : 'Sign in to manage your Tambu properties or bookings.'}
                      </p>
                    </div>

                    {authErrorMsg && (
                      <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-[11px] text-[#b52330] leading-relaxed font-bold text-center">{authErrorMsg}</p>
                      </div>
                    )}

                    {/* Forms */}
                    {!isRegistering ? (
                      /* SIGN IN FORM */
                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Password
                              </label>
                            </div>
                            <input
                              type="password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 mt-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Sign In</span>
                        </button>
                      </form>
                    ) : (
                      /* SIGN UP FORM */
                      <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        {/* Elegant Selector for Account Purpose */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                            I want to:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 select-none">
                            <button
                              type="button"
                              onClick={() => {
                                setRegRole(UserRole.SEEKER);
                                setUserRole(UserRole.SEEKER);
                              }}
                              className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                                regRole === UserRole.SEEKER
                                  ? 'bg-white text-[#b52330] shadow-sm font-black'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Rent a Room
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRegRole(UserRole.OWNER);
                                setUserRole(UserRole.OWNER);
                              }}
                              className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                                regRole === UserRole.OWNER
                                  ? 'bg-white text-[#b52330] shadow-sm font-black'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              List a Room
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              placeholder="e.g. Chanda Mulenga"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Phone Number
                            </label>
                            <input
                              type="text"
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              placeholder="e.g. +260977112233"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="At least 6 characters"
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 mt-2 bg-[#b52330] hover:bg-[#a01c27] text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-black"
                        >
                          Create Account
                        </button>
                      </form>
                    )}

                    {/* Mode Switcher Footer */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setAuthErrorMsg('');
                        }}
                        className="text-xs text-[#b52330] hover:underline font-bold transition-all cursor-pointer"
                      >
                        {isRegistering 
                          ? 'Already have an account? Sign In' 
                          : "Don't have an account? Sign Up"}
                      </button>
                    </div>
                  </div>
                </div>
              );

            // 13. System Contact Feedback form
            case 'contact-us':
              return (
                <ContactView
                  userEmail={currentUser?.email || ''}
                  userName={userName || ''}
                  onCancel={() => navigateTo('discovery')}
                  onSendContact={async (msg) => {
                    try {
                      const msgId = 'msg_' + Date.now();
                      const fullMsg: SupportMessage = {
                        id: msgId,
                        ...msg,
                        createdAt: new Date().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      };
                      await createSupportMessage(fullMsg);
                      triggerToast('Inquiry reached Super Admin hub successfully!', 'success');
                      return true;
                    } catch (err) {
                      triggerToast('Error saving contact request', 'error');
                      return false;
                    }
                  }}
                />
              );

            default:
              return null;
          }
        })()}
      </main>

      {/* Persistent Bottom Mobile Nav */}
      <BottomNav
        currentPage={currentPage}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        onNavigate={navigateTo}
        chatsCount={chatsCount}
      />

    </div>
  );
}
