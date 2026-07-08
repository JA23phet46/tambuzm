import React, { useState } from 'react';
import { 
  Plus, Trash2, Download, Search, Check, ChevronRight, MessageSquare, 
  ArrowUpRight, Heart, Star, Sparkles, Filter, Calendar, Shield, CreditCard, Users, Landmark
} from 'lucide-react';
import { Property, UserRole, Activity, SearchHistory, BillingRecord, RentPayment, SupportMessage, isPropertyActive } from '../types';

interface DashboardViewProps {
  userRole: UserRole;
  userName: string;
  properties: Property[];
  savedIds: string[];
  activities: Activity[];
  searches: SearchHistory[];
  billingRecords: BillingRecord[];
  onSelectProperty: (property: Property) => void;
  onNavigate: (page: string) => void;
  onDeleteProperty: (id: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  subscriptionExpiry?: string;
  isSubscriptionExpired?: boolean;
  onPaySubscription?: () => void;
  onToggleSubscriptionExpirySimulated?: () => void;
  isAdmin?: boolean;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  rentPayments?: RentPayment[];
  ownerId?: string;
  onTogglePropertyAvailability?: (id: string, currentAvailable: boolean) => void;
  onTogglePropertySpotlight?: (id: string, currentSpotlight: boolean) => void;
  onTogglePropertyVerified?: (id: string, currentVerified: boolean) => void;
  supportMessages?: SupportMessage[];
  onSwitchRole?: (role: UserRole) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userRole,
  userName,
  properties,
  savedIds,
  activities,
  searches,
  billingRecords,
  onSelectProperty,
  onNavigate,
  onDeleteProperty,
  onShowToast,
  subscriptionExpiry = 'June 22, 2026',
  isSubscriptionExpired = false,
  onPaySubscription = () => {},
  onToggleSubscriptionExpirySimulated = () => {},
  isAdmin = false,
  trialEndsAt = '',
  isSubscribed = false,
  rentPayments = [],
  ownerId = '',
  onTogglePropertyAvailability = (id: string, currentAvailable: boolean) => {},
  onTogglePropertySpotlight = (id: string, currentSpotlight: boolean) => {},
  onTogglePropertyVerified = (id: string, currentVerified: boolean) => {},
  supportMessages = [],
  onSwitchRole = (role: UserRole) => {}
}) => {
  const firstName = userName.split(' ')[0] || 'Friend';
  
  // State for rent payment search/filtering
  const [paySearchQuery, setPaySearchQuery] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState<'ALL' | 'SUCCESSFUL' | 'FAILED'>('ALL');

  // Owned listings or favorited listings
  const savedProperties = properties.filter((p) => savedIds.includes(p.id));
  
  // Filter listings owned by this user or let admin view all listings in the system
  const myProperties = isAdmin 
    ? properties 
    : (ownerId
        ? properties.filter((p) => p.ownerId === ownerId || p.ownerName === userName || !p.ownerId)
        : properties
      );

  // trial period tracker computations
  const hasTrial = !isSubscribed && !isAdmin && userRole === UserRole.OWNER;
  let trialDaysRemaining: number | null = null;
  if (hasTrial) {
    if (trialEndsAt) {
      const trialDiffStr = new Date(trialEndsAt).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(trialDiffStr / (1000 * 60 * 60 * 24)));
    } else {
      // Grace period fallback matching 9 days trials mandate
      trialDaysRemaining = 8; 
    }
  }
  const isTrialExpired = hasTrial && trialDaysRemaining === 0;
  const isTrialActive = hasTrial && trialDaysRemaining !== null && trialDaysRemaining > 0;

  // subscription days remaining calculations
  let subscriptionDaysRemaining: number | null = null;
  if (isSubscribed && subscriptionExpiry) {
    try {
      const subExpiryDate = new Date(subscriptionExpiry);
      const subDiff = subExpiryDate.getTime() - Date.now();
      subscriptionDaysRemaining = Math.max(0, Math.ceil(subDiff / (1000 * 60 * 60 * 24)));
    } catch (_) {
      // safe fallback
    }
  }

  // Filter renter rent payments made specifically to properties belonging to this owner, or show all for admin
  const filteredRentPayments = rentPayments.filter((payment) => {
    // Permission check
    const belongsToOwner = payment.ownerId === ownerId || payment.renterId === ownerId;
    const shouldDisplay = isAdmin || belongsToOwner;

    if (!shouldDisplay) return false;

    const matchesSearch = paySearchQuery
      ? payment.propertyName.toLowerCase().includes(paySearchQuery.toLowerCase()) ||
        payment.renterName.toLowerCase().includes(paySearchQuery.toLowerCase()) ||
        payment.renterEmail.toLowerCase().includes(paySearchQuery.toLowerCase()) ||
        (payment.renterPhone && payment.renterPhone.toLowerCase().includes(paySearchQuery.toLowerCase())) ||
        payment.reference.toLowerCase().includes(paySearchQuery.toLowerCase())
      : true;

    const matchesStatus = payStatusFilter === 'ALL' ? true : payment.status === payStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // aggregate statistics for system (Admin mode) vs landlord (Owner mode)
  const systemAggregateRentValue = rentPayments
    .filter(p => p.status === 'SUCCESSFUL')
    .reduce((sum, p) => sum + p.amount, 0);

  const myAggregateRentValue = rentPayments
    .filter(p => p.status === 'SUCCESSFUL' && p.ownerId === ownerId)
    .reduce((sum, p) => sum + p.amount, 0);

  const handleDownloadInvoice = (reference: string) => {
    onShowToast(`Invoice receipt ${reference} downloaded successfully!`, 'success');
  };

  const handleDownloadRentReceipt = (id: string) => {
    onShowToast(`Rent reservation document ${id} downloaded successfully!`, 'success');
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20 pt-2">
      
      {/* Dynamic Greetings Banner */}
      <section className="bg-gradient-to-r from-[#b52330] to-[#9a1c26] text-white p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 space-y-2.5">
          <div className="flex gap-2 items-center">
            <span className="bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
              Zambian Real Estate Portal
            </span>
            {isAdmin && (
              <span className="bg-[#78fac4] text-[#002115] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 shadow-sm">
                <Shield className="w-3 h-3" /> System Administrator
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {firstName}! 🇿🇲
          </h1>
          <p className="text-xs sm:text-sm text-[#ffdad8] max-w-xl leading-relaxed">
            {isAdmin 
              ? 'Welcome to the master admin hub. Oversee live renter payments, track system-wide placements, check owner standard subscription logs, and verify compliance.'
              : userRole === UserRole.OWNER 
                ? 'Manage your property placements, track free trial timelines, view active renter rent payments, and check billing history logs.'
                : 'Browse personalized recommendations, saved listings shortcuts, and active search histories.'
            }
          </p>

          {/* Quick Role Switcher for instant Seeker <-> Lister toggling */}
          <div className="flex items-center gap-2 bg-white/20 p-1.5 rounded-xl backdrop-blur-sm self-start inline-flex mt-3 border border-white/20">
            <span className="text-[10px] font-bold text-white/90 pl-1 uppercase tracking-wider">Account Mode:</span>
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.SEEKER)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                userRole === UserRole.SEEKER ? 'bg-white text-[#b52330] shadow-sm font-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Seeker Mode
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.OWNER)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                userRole === UserRole.OWNER ? 'bg-white text-[#b52330] shadow-sm font-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Lister (Owner) Mode
            </button>
          </div>
        </div>
      </section>

      {/* RENDER OWNER & ADMIN PORTFOLIO PANEL */}
      {userRole === UserRole.OWNER ? (
        <div className="space-y-10">
          
          {/* PAYMENT MANAGEMENT SECTION */}
          {!isAdmin && (
            <div className="bg-white border border-[#e4e2e2] rounded-2xl p-5 shadow-sm space-y-2">
              <h4 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
                💳 Subscription Payment Notice (K100/mo Standard Plan)
              </h4>
              <p className="text-xs text-[#5a403f] leading-relaxed">
                Users can list property for a subscription fee of K100/month. Please send payment to mobile money number <span className="font-mono font-bold text-[#b52330]">0974661185</span> (Japhet Ndafi). Failure to subscribe will result in your property listing being removed from the platform.
              </p>
            </div>
          )}

          
          {/* Bento Stats Cards (ADMIN vs LANDLORD OWNER VERSION) */}
          {isAdmin ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5a403f] tracking-wide">Total Platform Listings</span>
                  <h3 className="text-2xl font-black text-[#1b1c1c] mt-1">{properties.length} listings</h3>
                </div>
                <div className="w-12 h-12 bg-[#8eeff4] text-[#006e72] rounded-xl flex items-center justify-center font-bold text-lg select-none shadow-sm">
                  🏡
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5a403f] tracking-wide">Renter Payments Processed</span>
                  <h3 className="text-2xl font-black text-[#1b1c1c] mt-1">{rentPayments.length} transactions</h3>
                </div>
                <div className="w-12 h-12 bg-green-50 text-[#006c4c] rounded-xl flex items-center justify-center font-bold text-lg select-none shadow-sm">
                  💵
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#1b5e20] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wide">Total Rent Transacted</span>
                  <h3 className="text-2xl font-black text-[#1b1c1c] mt-1">ZMW {systemAggregateRentValue.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-[#78fac4] text-[#002115] rounded-xl flex items-center justify-center font-bold text-lg select-none shadow-sm">
                  🇿🇲
                </div>
              </div>

              <div className="bg-[#fafff6] p-5 rounded-2xl border-2 border-[#1b5e20] hover:shadow-sm transition-all flex flex-col justify-between group overflow-hidden relative">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wide block">Platform Commission Fee</span>
                  <div className="text-2xl font-black text-[#002115]">K0 (100% Free)</div>
                  <div className="text-[9px] font-bold text-gray-500 block leading-snug">
                    All renter rent payment channels route directly to your account.
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5a403f] tracking-wide">My Active Listings</span>
                  <h3 className="text-2xl font-black text-[#1b1c1c] mt-1">{(isTrialExpired || isSubscriptionExpired) ? 0 : myProperties.length} listings</h3>
                </div>
                <div className="w-12 h-12 bg-[#ffdad8] text-[#b52330] rounded-xl flex items-center justify-center font-bold text-lg select-none shadow-sm">
                  🏡
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5a403f] tracking-wide">Rent Collected via App</span>
                  <h3 className="text-2xl font-black text-emerald-800 mt-1">ZMW {myAggregateRentValue.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-[#78fac4] text-[#002115] rounded-xl flex items-center justify-center font-bold text-lg select-none shadow-sm">
                  🇿🇲
                </div>
              </div>

              {/* End of plan statistics section */}
            </section>
          )}

          {/* PLACEMENTS / LISTINGS MANAGEMENT CAROUSEL */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1b1c1c]">
                  {isAdmin ? 'System Placements Registry (Admin)' : 'Manage Placements'}
                </h2>
                <p className="text-xs text-[#5a403f]">
                  {isAdmin 
                    ? 'Inspect, verify compliance, or remove any property placement in the system catalog' 
                    : 'View, edit, or remove your listed properties'
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('chat')}
                  className="bg-white border border-[#e4e2e2] hover:bg-slate-50 text-[#5a403f] text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-[#b52330]" /> Messages
                </button>
                <button
                  onClick={() => onNavigate('add-property')}
                  className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1 shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Properties
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {myProperties.length === 0 ? (
                <div className="bg-white text-center py-10 rounded-2xl border border-[#e4e2e2] text-xs text-[#5a403f]">
                  No properties currently listed in this catalog. Click "Add Properties" to list.
                </div>
              ) : (
                myProperties.map((p) => {
                  const isPropActive = isPropertyActive(
                    p,
                    ownerId,
                    trialEndsAt,
                    isSubscribed,
                    subscriptionExpiry
                  );

                  const isDeactivatedStr = !isPropActive;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border border-[#e4e2e2] p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-sm"
                    >
                      <div className="flex gap-4 items-center">
                        <img
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          src={p.image}
                          className="w-16 h-16 rounded-lg object-cover bg-[#f0eded]"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-[#1b1c1c] text-sm sm:text-base">{p.name}</h4>
                            {isDeactivatedStr ? (
                              <span className="text-[10px] font-extrabold bg-[#ffdad8] text-[#b52330] px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                                INACTIVE (Expired)
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold bg-green-50 text-[#006c4c] px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                                ACTIVE
                              </span>
                            )}
                            {isAdmin && (
                              <span className="text-[10px] font-semibold text-[#5a403f] bg-slate-100 px-1.5 py-0.5 rounded">
                                Owner ID: {p.ownerId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5a403f]">{p.location}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-[#b52330] font-black">ZMW {p.price.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide px-1 rounded ${
                              p.available !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {p.available !== false ? 'Available to Rent' : 'Occupied / Rent Pending'}
                            </span>
                          </div>

                          {/* Tambu Admin Lister & Subscription Context */}
                          {isAdmin && (
                            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-150/80 rounded-lg space-y-1 text-[11px] sm:text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap text-[#5a403f]">
                                <span className="font-extrabold text-gray-650">Lister (Owner):</span>
                                <span className="font-bold text-[#b52330] bg-[#ffdad8]/30 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                                  👤 {p.ownerName || 'Tambu Lister'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-gray-650">Subscription Status:</span>
                                {p.ownerIsSubscribed ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    🛡️ Subscribed (Ends:{' '}
                                    {p.ownerSubscriptionExpiresAt 
                                      ? new Date(p.ownerSubscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                      : 'Infinite'}
                                    )
                                  </span>
                                ) : p.ownerTrialEndsAt ? (
                                  (() => {
                                    const trialExpiry = new Date(p.ownerTrialEndsAt);
                                    const trialTimeLeft = trialExpiry.getTime() - Date.now();
                                    const daysRem = Math.ceil(trialTimeLeft / (1000 * 60 * 60 * 24));
                                    return daysRem > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[#ff9800] font-extrabold bg-[#fff4e5] px-1.5 py-0.5 rounded border border-[#ffb74d]/30">
                                        ⏳ Free Trial ({daysRem} days left)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[#b52330] font-extrabold bg-[#ffdad8] px-1.5 py-0.5 rounded border border-[#b52330]/20 animate-pulse">
                                        ⚠️ Trial Expired
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[#b52330] font-extrabold bg-[#ffdad8] px-1.5 py-0.5 rounded border border-[#b52330]/20">
                                    ⚠️ Unsubscribed (No trial data)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions buttons */}
                      <div className="flex gap-2 w-full sm:w-auto justify-end items-center">
                        {isAdmin && (
                          <div className="flex gap-1.5 items-center">
                            <button
                              onClick={() => onTogglePropertySpotlight(p.id, p.propertyOfTheWeek === true)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                p.propertyOfTheWeek === true 
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Flag as Property of the Week"
                            >
                              <span>🏆</span>
                              <span>{p.propertyOfTheWeek === true ? 'Spotlight (Active)' : 'Make Spotlight'}</span>
                            </button>
                            <button
                              onClick={() => onTogglePropertyVerified(p.id, p.verified === true)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                p.verified === true 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-150' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Toggle Verified status"
                            >
                              <span className="text-emerald-600 font-extrabold font-sans">✓</span>
                              <span>{p.verified === true ? 'Verified' : 'Verify'}</span>
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => onTogglePropertyAvailability(p.id, p.available !== false)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                            p.available !== false 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-150 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-150 hover:bg-amber-100'
                          }`}
                          title="Toggle availability state"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.available !== false ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {p.available !== false ? 'Set Occupied' : 'Set Available'}
                        </button>
                        <button
                          onClick={() => onSelectProperty(p)}
                          className="p-2 sm:p-2.5 text-[#5a403f] bg-[#f0eded] hover:bg-[#eae8e7] rounded-lg transition-transform active:scale-95"
                          title="View Details"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onDeleteProperty(p.id);
                            onShowToast('Listing successfully deleted from database', 'success');
                          }}
                          className="p-2 sm:p-2.5 text-[#b52330] bg-[#ffdad8] hover:bg-[#ffcdcb] rounded-lg transition-transform active:scale-95"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RENTER PAYMENTS TRACKING LOGS - CRUTIONAL REQUIREMENT: "where renters can choose to pay through the app" */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1b1c1c]">
                  {isAdmin ? '🛡️ Renters Global Payments Overseer' : 'Rent Payments Received'}
                </h2>
                <p className="text-xs text-[#5a403f]">
                  {isAdmin 
                    ? 'Track and monitor active rents paid on the platform' 
                    : 'Records of renters who paid their reservation/rent through the app'
                  }
                </p>
              </div>
              
              {/* Table search controls */}
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paySearchQuery}
                    onChange={(e) => setPaySearchQuery(e.target.value)}
                    placeholder="Search query..."
                    className="pl-8 pr-3 py-1.5 w-44 rounded-xl border border-gray-200 text-xs text-[#1c1b1b] focus:outline-none focus:border-[#b52330] bg-white font-medium"
                  />
                </div>
                <select
                  value={payStatusFilter}
                  onChange={(e) => setPayStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-gray-200 text-xs py-1.5 px-2 bg-white text-[#1c1b1b] font-medium focus:outline-none focus:border-[#b52330]"
                >
                  <option value="ALL">Status: All</option>
                  <option value="SUCCESSFUL">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#e4e2e2] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#f0eded] text-[#5a403f] uppercase font-bold text-[10px] tracking-wider border-b border-[#e4e2e2]">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Property</th>
                      <th className="p-4">Renter / Tenant</th>
                      <th className="p-4">Amount Paid</th>
                      <th className="p-4">Transaction Date</th>
                      <th className="p-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e2e2] text-[#1b1c1c] font-medium">
                    {filteredRentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-gray-500 font-medium">
                          No rent payment transactions logged{paySearchQuery ? ' matching your search' : ' yet'}.
                        </td>
                      </tr>
                    ) : (
                      filteredRentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#fbf9f8]/60 transition-colors">
                          <td className="p-4 font-mono text-[11px] text-gray-600">
                            {p.reference}
                            <span className={`block mt-1 w-max px-1.5 py-0.5 rounded text-[8px] font-black leading-none ${
                              p.status === 'SUCCESSFUL' 
                                ? 'bg-[#78fac4] text-[#002115]' 
                                : 'bg-[#ffdad8] text-[#b52330]'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-bold block text-xs truncate max-w-[130px]">{p.propertyName}</span>
                            <span className="text-[10px] text-gray-400 block truncate max-w-[130px]">{p.propertyLocation}</span>
                          </td>
                          <td className="p-4 text-xs">
                            <span className="font-semibold block text-[#1b1c1c]">{p.renterName}</span>
                            <span className="text-[10px] text-gray-500 font-mono block">{p.renterEmail}</span>
                            {p.renterPhone && (
                              <span className="text-[10px] text-[#b52330] font-mono font-bold block mt-0.5">{p.renterPhone}</span>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-[#b52330] text-xs">
                            ZMW {p.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-gray-500 text-[11px]">
                            {p.date}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDownloadRentReceipt(p.reference)}
                              className="p-1.5 bg-[#f0eded] text-[#5a403f] hover:bg-[#eae8e7] rounded-lg inline-flex items-center transition-transform active:scale-90 shadow-sm"
                              title="Download Receipt Statement"
                            >
                              <Download className="w-3.5 h-3.5 text-[#b52330]" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>



          {/* SUPER ADMIN SUPPORT FEEDBACK MESSAGES LOG */}
          {isAdmin && (
            <section className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1b1c1c] flex items-center gap-2">
                    <span>📩</span> Contact Us Inquiries & Feedbacks
                  </h2>
                  <p className="text-xs text-[#5a403f]">
                    Read and track service emails, customer inquiries, and critical user feedback.
                  </p>
                </div>
                <div className="bg-[#b52330] text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-sm">
                  {supportMessages.length} Messages
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportMessages.length === 0 ? (
                  <div className="md:col-span-2 bg-white text-center py-10 rounded-2xl border border-[#e4e2e2] text-xs text-[#5a403f]">
                    No contact inquiries submitted by users yet.
                  </div>
                ) : (
                  supportMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white rounded-2xl border border-[#e4e2e2] p-5 shadow-sm space-y-3 relative hover:border-[#b52330] transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-[#b52330] bg-[#ffdad8] py-0.5 px-2 rounded-full">
                            {msg.subject}
                          </span>
                          <h4 className="font-bold text-sm text-[#1b1c1c] pt-1">{msg.name}</h4>
                          <a
                            href={`mailto:${msg.email}`}
                            className="text-xs text-[#b52330] hover:underline block font-semibold transition-all"
                          >
                            📧 {msg.email}
                          </a>
                        </div>
                        <span className="text-[9px] text-[#5a403f]/60 font-mono">
                          {msg.createdAt}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-[#5a403f] leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </div>

                      <div className="flex justify-end pt-1">
                        <a
                          href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                          className="font-bold text-xs text-white bg-[#b52330] hover:bg-[#9a1c26] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          Reply Email →
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

        </div>
      ) : (
        /* RENDER SEEKER DASHBOARD PANEL */
        <div className="space-y-10">
          
          {/* Seeker Bento Grid items */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Saved shortcut list */}
            <div className="md:col-span-12 bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-[#1b1c1c]">Favorites</h3>
                <span className="text-xs text-[#5a403f] font-semibold">{savedProperties.length} items</span>
              </div>

              {savedProperties.length === 0 ? (
                <div className="text-center py-8 text-[#5a403f] text-xs">
                  You haven't added any listings to your favorites yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {savedProperties.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProperty(p)}
                      className="flex gap-3 p-3 border border-[#e4e2e2] rounded-xl hover:border-[#b52330] transition-colors cursor-pointer bg-[#fbf9f8]"
                    >
                      <img
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        src={p.image}
                        className="w-12 h-12 rounded-lg object-cover bg-[#eae8e7]"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-[#1b1c1c] truncate">{p.name}</h4>
                        <span className="text-[10px] text-[#b52330] font-bold block mt-1">ZMW {p.price.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Recent activity feeds */}
            <div className="md:col-span-6 bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-4">
              <h3 className="font-bold text-base text-[#1b1c1c]">Activity Feeds</h3>
              
              <div className="space-y-4">
                {activities.map((a) => (
                  <div 
                    key={a.id} 
                    onClick={() => onNavigate('chat')}
                    className="flex gap-3.5 items-start p-2.5 -mx-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none"
                    title="Open Chat Session"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#ffdad8] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-[#b52330]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1b1c1c] hover:text-[#b52330] transition-colors">{a.title}</h4>
                      <p className="text-xs text-[#5a403f] mt-0.5">{a.description}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent rent payments (Seeker rent history log) */}
            <div className="md:col-span-6 bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-4">
              <h3 className="font-bold text-base text-[#1b1c1c]">My Rent Payments</h3>
              
              <div className="space-y-3">
                {filteredRentPayments.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs font-medium">
                    You haven't made any property rent payments through the app yet.
                  </div>
                ) : (
                  filteredRentPayments.map((p) => (
                    <div 
                      key={p.id} 
                      className="flex items-center justify-between p-3 border border-[#e4e2e2] rounded-xl bg-[#fbf9f8] shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CreditCard className="w-4 h-4 text-[#b52330] shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#1b1c1c] block truncate max-w-[140px]">{p.propertyName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{p.reference}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-[#b52330] block">ZMW {p.amount.toLocaleString()}</span>
                        <span className="text-[9px] text-[#006c4c] font-black uppercase bg-green-50 px-1 py-0.5 rounded leading-none">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
