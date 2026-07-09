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
  currentPage: string; // 'discovery' | 'saved' | 'seeker-dashboard' | 'details' | 'checkout' | 'payment-waiting' | 'payment-airtel' | 'filters' | 'add-property' | 'select-photos' | 'login' | 'register'
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
  return true;
}

