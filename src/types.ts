export enum UserRole {
  SEEKER = 'seeker',
  OWNER = 'owner'
}

export enum PropertyType {
  HOUSE = 'House',
  APARTMENT = 'Apartment',
  BOARDING_HOUSE = 'Boarding House'
}

export enum Province {
  LUSAKA = 'Lusaka',
  COPPERBELT = 'Copperbelt',
  SOUTHERN = 'Southern',
  CENTRAL = 'Central',
  NORTH_WESTERN = 'North-Western',
  EASTERN = 'Eastern'
}

export interface NewListingInput {
  name: string;
  location: string;
  province: Province;
  price: number;
  type: PropertyType;
  beds: number;
  baths: number;
  sqm: number;
  distance: string;
  description: string;
  amenities: string[];
  photos: string[];
  phone: string;
  whatsapp: string;
  propertyOfTheWeek?: boolean;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  province: Province;
  price: number;
  type: PropertyType;
  beds: number;
  baths: number;
  sqm: number;
  image: string;
  verified: boolean;
  featured: boolean;
  reviewsCount?: number;
  rating?: number;
  saves?: number;
  views?: number;
  ownerName?: string;
  ownerImage?: string;
  ownerId?: string;
  ownerPhone?: string;
  ownerWhatsapp?: string;
  ownerTrialEndsAt?: string;
  ownerIsSubscribed?: boolean;
  ownerSubscriptionExpiresAt?: string;
  available?: boolean;
  propertyOfTheWeek?: boolean;
  description?: string;
  distance?: string;
  photos?: string[];
  amenities?: string[];
}

export interface Activity {
  id: string;
  type: 'message' | 'price_update';
  title: string;
  description: string;
  time: string;
}

export interface SearchHistory {
  id: string;
  query: string;
}

export interface BillingRecord {
  id: string;
  reference: string;
  amount: number;
  date: string;
  status: 'SUCCESSFUL' | 'FAILED';
}

export interface RentPayment {
  id: string;
  reference: string;
  propertyId: string;
  propertyName: string;
  propertyLocation: string;
  renterId: string;
  renterName: string;
  renterEmail: string;
  renterPhone?: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  status: 'SUCCESSFUL' | 'FAILED';
  date: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AppState {
  currentPage: string; // 'discovery' | 'saved' | 'seeker-dashboard' | 'owner-dashboard' | 'details' | 'checkout' | 'payment-waiting' | 'payment-airtel' | 'filters' | 'add-property' | 'select-photos' | 'login' | 'register'
  selectedProperty: Property | null;
  properties: Property[];
  savedIds: string[];
  userRole: UserRole;
  isLoggedIn: boolean;
  userEmail: string;
  userName: string;
  userPhone: string;
  toast: { message: string; type: 'success' | 'error' } | null;
  searchQuery: string;
  selectedProvince: Province | '';
  minPrice: number;
  maxPrice: number;
  selectedPropertyTypes: PropertyType[];
  selectedAmenities: string[];
  billingRecords: BillingRecord[];
}

export function isPropertyActive(
  p: Property,
  currentUserId?: string | null,
  userTrialEndsAt?: string,
  userIsSubscribed?: boolean,
  userSubscriptionExpiry?: string
): boolean {
  // Exempt default system admin / app owner properties and logins from any deactivation
  if (
    p.ownerId === 'admin_tambu' || 
    p.ownerId === 'demo_owner123' || 
    currentUserId === 'admin_tambu' || 
    currentUserId === 'demo_owner123'
  ) {
    return true;
  }

  // Property of the Week spotlight and Verified properties are always active (exempt)
  if (p.propertyOfTheWeek || p.verified) {
    return true;
  }

  // 1. If it belongs to currently logged in owner/user, check against their live session subscription/trial state
  if (currentUserId && p.ownerId === currentUserId) {
    let isTrialActive = false;
    if (userTrialEndsAt) {
      const trialExpiry = new Date(userTrialEndsAt);
      isTrialActive = trialExpiry.getTime() > Date.now();
    }

    let isSubActive = false;
    if (userIsSubscribed) {
      if (userSubscriptionExpiry) {
        const subExpiry = new Date(userSubscriptionExpiry);
        isSubActive = subExpiry.getTime() > Date.now();
      } else {
        isSubActive = true;
      }
    }

    // Fallback internally on property if live session variables are not provided
    if (!userTrialEndsAt && p.ownerTrialEndsAt) {
      const trialExpiry = new Date(p.ownerTrialEndsAt);
      isTrialActive = trialExpiry.getTime() > Date.now();
    }
    if (userIsSubscribed === undefined && p.ownerIsSubscribed === true) {
      if (p.ownerSubscriptionExpiresAt) {
        const subExpiry = new Date(p.ownerSubscriptionExpiresAt);
        isSubActive = subExpiry.getTime() > Date.now();
      } else {
        isSubActive = true;
      }
    }

    return isTrialActive || isSubActive;
  }

  // 2. Belongs to someone else, check properties embedded inside the listing.
  let isTrialActive = false;
  let isSubActive = false;
  let hasExplicitMetadata = false;

  if (p.ownerTrialEndsAt) {
    hasExplicitMetadata = true;
    const trialExpiry = new Date(p.ownerTrialEndsAt);
    isTrialActive = trialExpiry.getTime() > Date.now();
  }

  if (p.ownerIsSubscribed === true) {
    hasExplicitMetadata = true;
    if (p.ownerSubscriptionExpiresAt) {
      const subExpiry = new Date(p.ownerSubscriptionExpiresAt);
      isSubActive = subExpiry.getTime() > Date.now();
    } else {
      isSubActive = true;
    }
  }

  if (hasExplicitMetadata) {
    return isTrialActive || isSubActive;
  }

  // 3. Fallback for older properties (e.g. listed over a week ago, before metadata was added to property documents)
  // Extract creation date from property ID (e.g. prop_1717758920239)
  if (p.id && p.id.startsWith('prop_')) {
    try {
      const tsPart = p.id.split('_')[1];
      const timestamp = Number(tsPart);
      if (!isNaN(timestamp)) {
        const createdDate = new Date(timestamp);
        // Free trial is 9 days (9 * 24 * 60 * 60 * 1000)
        const expiryTime = createdDate.getTime() + (9 * 24 * 60 * 60 * 1000);
        return expiryTime > Date.now();
      }
    } catch (e) {
      // ignore
    }
  }

  // Exempt default system admin properties (like admin_tambu / demo_owner123) by default if no metadata is found
  if (p.ownerId === 'admin_tambu' || p.ownerId === 'demo_owner123') {
    return true;
  }

  return true;
}

