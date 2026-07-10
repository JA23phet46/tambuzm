import { Property, Province, PropertyType, Activity, SearchHistory, BillingRecord } from './types';

export const INITIAL_PROPERTIES: Property[] = [];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act1',
    type: 'message',
    title: 'Welcome to tambu',
    description: 'Post your properties or explore listings across Zambia.',
    time: 'Just now'
  }
];

export const INITIAL_SEARCHES: SearchHistory[] = [
  { id: 'sh1', query: '3BR Apartments, Lusaka East' },
  { id: 'sh2', query: 'Modern Villas, Kitwe' },
  { id: 'sh3', query: 'Office Space, Ndola Central' }
];

export const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  {
    id: 'b1',
    reference: 'FLW-9284711',
    amount: 100.00,
    date: 'Sep 24, 2024',
    status: 'SUCCESSFUL'
  }
];

export const PHOTO_POOL = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
];
