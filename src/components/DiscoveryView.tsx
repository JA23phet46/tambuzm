import React from 'react';
import { Search, Sliders, ChevronRight, Star, Heart, Bed, Bath, Sparkles, Building2, GraduationCap, Home, Eye, MapPin, Footprints, Check, Trash2 } from 'lucide-react';
import { Property, Province, PropertyType, UserRole, isPropertyActive } from '../types';

interface DiscoveryViewProps {
  properties: Property[];
  savedIds: string[];
  searchQuery: string;
  isLoggedIn: boolean;
  userRole: UserRole;
  selectedProvince: Province | '';
  selectedPropertyTypes: PropertyType[];
  onSelectProperty: (property: Property) => void;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onNavigate: (page: string) => void;
  onUpdateFilters: (query: string, province: Province | '', types: PropertyType[]) => void;
  currentUserId?: string | null;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  subscriptionExpiry?: string;
  isAdmin?: boolean;
  onTogglePropertyVerified?: (id: string, currentVerified: boolean) => void;
  onDeleteProperty?: (id: string) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  properties,
  savedIds,
  searchQuery,
  isLoggedIn,
  userRole,
  selectedProvince,
  selectedPropertyTypes,
  onSelectProperty,
  onToggleSaved,
  onNavigate,
  onUpdateFilters,
  currentUserId,
  trialEndsAt,
  isSubscribed,
  subscriptionExpiry,
  isAdmin = false,
  onTogglePropertyVerified,
  onDeleteProperty,
}) => {
  const formatPrice = (val: any) => {
    if (val === undefined || val === null) return '0';
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString();
  };

  // Filter the list based on query, province, and types
  const filteredProperties = properties.filter((p) => {
    const isActive = isPropertyActive(
      p,
      currentUserId,
      trialEndsAt,
      isSubscribed,
      subscriptionExpiry
    );

    if (!isActive) {
      return false; // Skip expired/inactive listing
    }

    const matchesSearch = searchQuery 
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesProvince = selectedProvince ? p.province === selectedProvince : true;
    const matchesType = selectedPropertyTypes.length > 0 ? selectedPropertyTypes.includes(p.type) : true;
    return matchesSearch && matchesProvince && matchesType;
  });

  // Segregate by sections for visual rhythm
  const boardingHouses = filteredProperties.filter((p) => p.type === PropertyType.BOARDING_HOUSE);
  const premiumApartments = filteredProperties.filter((p) => p.price >= 10000 && p.type === PropertyType.APARTMENT);
  const otherListings = filteredProperties.filter(
    (p) => p.type !== PropertyType.BOARDING_HOUSE && !(p.price >= 10000 && p.type === PropertyType.APARTMENT)
  );

  const propertyOfTheWeekItem = filteredProperties.find((p) => p.propertyOfTheWeek === true);

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Hero Welcome banner */}
      <section className="text-center pt-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1b1c1c] leading-tight">
          Find your next home in <span className="text-[#b52330]">Zambia</span>
        </h1>
        <p className="text-sm sm:text-base text-[#5a403f] max-w-md mx-auto">
          The most trusted, verified real estate platform connecting students, executives, and owners seamlessly.
        </p>
      </section>

      {/* Interactive Search Widget */}
      <section className="max-w-4xl mx-auto px-1">
        <div className="bg-white rounded-full p-2.5 flex items-center gap-2 border border-[#e4e2e2] shadow-md relative">
          <div className="flex-1 flex items-center px-4">
            <Search className="text-[#b52330] w-5 h-5 mr-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onUpdateFilters(e.target.value, selectedProvince, selectedPropertyTypes)}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-[#1b1c1c] text-sm sm:text-base placeholder-[#5a403f]/50"
              placeholder="Search properties, neighborhoods, or universities..."
            />
          </div>

          <div className="hidden md:flex items-center border-l border-[#e4e2e2] h-10 px-6 gap-6">
            <div className="flex flex-col items-start select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5a403f]">Province</span>
              <select
                value={selectedProvince}
                onChange={(e) => onUpdateFilters(searchQuery, e.target.value as Province | '', selectedPropertyTypes)}
                className="bg-transparent border-none text-[#1b1c1c] font-bold text-xs p-0 focus:ring-0 active:bg-transparent"
              >
                <option value="">All Provinces</option>
                {Object.values(Province).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col items-start select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5a403f]">Category</span>
              <span className="text-xs text-[#1b1c1c] font-bold">
                {selectedPropertyTypes.length === 1 ? selectedPropertyTypes[0] : 'Any Type'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('filters')}
            className="bg-[#b52330] hover:bg-[#9a1c26] text-white p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-md"
            title="Advanced Filters"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filter Pill Chips */}
        <div className="flex gap-2.5 mt-5 overflow-x-auto no-scrollbar pb-1 justify-start sm:justify-center">
          {[
            { label: 'Boarding House', icon: GraduationCap, value: [PropertyType.BOARDING_HOUSE] },
          ].map((chip, idx) => {
            const isActive = chip.value.length === 0 
              ? selectedPropertyTypes.length === 0 
              : selectedPropertyTypes.includes(chip.value[0]);
            
            return (
              <button
                key={idx}
                onClick={() => onUpdateFilters(searchQuery, selectedProvince, chip.value)}
                className={`py-2 px-4 rounded-full border text-xs font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-95 ${
                  isActive 
                    ? 'border-[#b52330] bg-[#ffdad8] text-[#b52330]' 
                    : 'border-[#e4e2e2] bg-white text-[#1b1c1c] hover:bg-[#f5f3f3]'
                }`}
              >
                <chip.icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Property of the Week Spotlight Banner */}
      {propertyOfTheWeekItem && (
        <section className="max-w-4xl mx-auto bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-3 sm:p-5 md:p-8 shadow-sm flex flex-row md:flex-row gap-4 md:gap-6 relative overflow-hidden">
          {/* Decorative shine background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="w-24 h-24 xs:w-28 xs:h-28 sm:w-40 sm:h-40 md:w-2/5 md:h-auto md:aspect-[4/3] rounded-xl overflow-hidden bg-[#eae8e7] relative shadow-sm shrink-0">
            <img
              alt={propertyOfTheWeekItem.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
              referrerPolicy="no-referrer"
              src={propertyOfTheWeekItem.image}
              onClick={() => onSelectProperty(propertyOfTheWeekItem)}
            />
            <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded shadow-sm flex items-center gap-0.5 uppercase tracking-wider">
              <span>🏆 Spotlight</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between min-w-0 space-y-1 md:space-y-4">
            <div className="space-y-1">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold text-amber-700 tracking-widest block font-mono">Property of the Week</span>
              <h2 
                onClick={() => onSelectProperty(propertyOfTheWeekItem)}
                className="text-xs xs:text-sm sm:text-lg md:text-2xl font-black text-[#1b1c1c] hover:text-[#b52330] cursor-pointer transition-colors leading-tight truncate md:whitespace-normal"
              >
                {propertyOfTheWeekItem.name}
              </h2>
              <p className="text-[9px] sm:text-xs text-[#5a403f] inline-flex items-center gap-0.5 sm:gap-1 truncate max-w-full">
                <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{propertyOfTheWeekItem.location}, {propertyOfTheWeekItem.province}</span>
              </p>
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 pt-0.5">
                <div className="flex items-center gap-0.5 text-[8px] sm:text-xs text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current text-amber-500" />
                  <span>{propertyOfTheWeekItem.rating && propertyOfTheWeekItem.rating > 0 ? propertyOfTheWeekItem.rating : 'New'}</span>
                </div>
                <span className="text-[8px] sm:text-xs text-[#5a403f] font-medium">• {propertyOfTheWeekItem.beds} Bed • {propertyOfTheWeekItem.baths} Bath</span>
                {propertyOfTheWeekItem.distance ? (
                  <div className="flex items-center gap-1 text-[8px] sm:text-xs text-[#b52330] font-bold bg-[#ffdad8]/80 px-2 py-0.5 rounded-full border border-[#e2bebc]/40">
                    <Footprints className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>{propertyOfTheWeekItem.distance}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[8px] sm:text-xs text-[#b52330] font-bold bg-[#ffdad8]/80 px-2 py-0.5 rounded-full border border-[#e2bebc]/40">
                    <Footprints className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>5 min walk to nearest landmark</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 sm:pt-4 border-t border-amber-200">
              <span className="text-[#b52330] font-black text-xs sm:text-lg md:text-2xl">
                ZMW {formatPrice(propertyOfTheWeekItem.price)} <span className="text-[9px] sm:text-xs text-[#5a403f] font-normal">/mo</span>
              </span>
              <button
                onClick={() => onSelectProperty(propertyOfTheWeekItem)}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[8px] sm:text-xs font-bold py-1.5 px-3 sm:py-2.5 sm:px-5 rounded-full shadow-sm transition-all flex items-center gap-1"
              >
                View
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Horizontal Scroll section - Boarding Houses */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1c1c]">Boarding Houses for Students</h2>
            <p className="text-xs sm:text-sm text-[#5a403f]">Affordable rooms near major Zambian universities</p>
          </div>
          <button 
            onClick={() => onUpdateFilters(searchQuery, selectedProvince, [PropertyType.BOARDING_HOUSE])}
            className="text-xs sm:text-sm text-[#b52330] font-bold flex items-center gap-1 hover:underline select-none"
          >
            View all ({boardingHouses.length}) <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {boardingHouses.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-[#e4e2e2] text-[#5a403f]">
            No student boarding houses match your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:no-scrollbar pb-2 pt-1 px-1 sm:px-4 md:mx-0 md:px-0">
            {boardingHouses.map((item) => (
              <div
                key={item.id}
                className="w-full sm:min-w-[250px] sm:max-w-[280px] sm:flex-shrink-0 bg-white rounded-xl border border-[#eae8e7] overflow-hidden group shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all"
              >
                <div className="relative h-20 xs:h-24 sm:h-32 overflow-hidden bg-[#eae8e7]">
                  <img
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    referrerPolicy="no-referrer"
                    src={item.image}
                    onClick={() => onSelectProperty(item)}
                  />
                  {item.verified ? (
                    <div 
                      onClick={isAdmin ? (e) => {
                        e.stopPropagation();
                        onTogglePropertyVerified?.(item.id, true);
                      } : undefined}
                      className={`absolute top-2 left-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-100/50 ${isAdmin ? 'cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all' : ''}`}
                      title={isAdmin ? 'Click to Remove Verification' : 'Verified Property'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[4px] text-emerald-650" />
                    </div>
                  ) : (
                    isAdmin && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePropertyVerified?.(item.id, false);
                        }}
                        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-100/90 hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-650 shadow-sm z-10 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                        title="Click to Verify Property"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2px]" />
                      </div>
                    )
                  )}
                  {item.propertyOfTheWeek && (
                    <div className="absolute top-2 left-10 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm z-10">
                      Spotlight
                    </div>
                  )}
                  <div className={`absolute bottom-2 left-2 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10 ${
                    item.available !== false 
                      ? 'bg-[#006c4c]/90 text-white' 
                      : 'bg-[#d97706]/90 text-white'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${item.available !== false ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {item.available !== false ? 'Available' : 'Pending'}
                  </div>
                  {isAdmin && onDeleteProperty && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProperty(item.id);
                      }}
                      className="absolute top-2 right-9 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 shadow-sm z-10 active:scale-95 transition-all"
                      title="Super Admin: Delete Listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onToggleSaved(item.id, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[#b52330] shadow-sm active:scale-95 transition-transform z-10"
                  >
                    <Heart className={`w-3.5 h-3.5 ${savedIds.includes(item.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <h3 
                      onClick={() => onSelectProperty(item)}
                      className="font-semibold text-xs sm:text-sm text-[#1b1c1c] hover:text-[#b52330] transition-colors cursor-pointer line-clamp-1 flex-1"
                    >
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#b52330] shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{item.rating && item.rating > 0 ? item.rating : 'New'}</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] sm:text-xs text-[#5a403f]/80 line-clamp-1">{item.location}</p>
                  
                  {item.distance && (
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#b52330] font-semibold bg-[#ffdad8]/40 px-2 py-0.5 rounded-md border border-[#e2bebc]/40 w-fit">
                      <Footprints className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.distance}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-1.5 border-t border-[#f5f3f3]">
                    <span className="text-[#b52330] font-bold text-xs sm:text-sm">
                      ZMW {formatPrice(item.price)}<span className="text-[9px] text-[#5a403f] font-normal">/mo</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Horizontal Scroll section - Premium Apartments */}
      <section className="space-y-4 font-sans">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1c1c]">Premium Apartments</h2>
            <p className="text-xs sm:text-sm text-[#5a403f]">Urban luxury in Lusaka & the Copperbelt</p>
          </div>
          <button 
            onClick={() => onUpdateFilters(searchQuery, selectedProvince, [PropertyType.APARTMENT])}
            className="text-xs sm:text-sm text-[#b52330] font-bold flex items-center gap-1 hover:underline select-none"
          >
            View all ({premiumApartments.length}) <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {premiumApartments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-[#e4e2e2] text-[#5a403f]">
            No premium apartments currently match your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:no-scrollbar pb-2 pt-1 px-1 sm:px-4 md:mx-0 md:px-0">
            {premiumApartments.map((p) => (
              <div
                key={p.id}
                className="w-full sm:min-w-[250px] sm:max-w-[280px] sm:flex-shrink-0 bg-white rounded-xl border border-[#eae8e7] overflow-hidden group shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all"
              >
                <div className="relative h-20 xs:h-24 sm:h-32 overflow-hidden bg-[#eae8e7]">
                  <img
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    referrerPolicy="no-referrer"
                    src={p.image}
                    onClick={() => onSelectProperty(p)}
                  />
                  {p.verified ? (
                    <div 
                      onClick={isAdmin ? (e) => {
                        e.stopPropagation();
                        onTogglePropertyVerified?.(p.id, true);
                      } : undefined}
                      className={`absolute top-2 left-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-100/50 ${isAdmin ? 'cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all' : ''}`}
                      title={isAdmin ? 'Click to Remove Verification' : 'Verified Property'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[4px] text-emerald-650" />
                    </div>
                  ) : (
                    isAdmin && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePropertyVerified?.(p.id, false);
                        }}
                        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-100/90 hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-650 shadow-sm z-10 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                        title="Click to Verify Property"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2px]" />
                      </div>
                    )
                  )}
                  {p.propertyOfTheWeek && (
                    <div className="absolute top-2 left-10 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm z-10">
                      Spotlight
                    </div>
                  )}
                  <div className={`absolute bottom-2 left-2 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10 ${
                    p.available !== false 
                      ? 'bg-[#006c4c]/90 text-white' 
                      : 'bg-[#d97706]/90 text-white'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${p.available !== false ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {p.available !== false ? 'Available' : 'Pending'}
                  </div>
                  {isAdmin && onDeleteProperty && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProperty(p.id);
                      }}
                      className="absolute top-2 right-9 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 shadow-sm z-10 active:scale-95 transition-all"
                      title="Super Admin: Delete Listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onToggleSaved(p.id, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[#b52330] shadow-sm active:scale-90 transition-transform z-10"
                  >
                    <Heart className={`w-3.5 h-3.5 ${savedIds.includes(p.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <h3 
                      onClick={() => onSelectProperty(p)}
                      className="font-semibold text-xs sm:text-sm text-[#1b1c1c] hover:text-[#b52330] transition-colors cursor-pointer line-clamp-1 flex-1"
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#b52330] shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{p.rating && p.rating > 0 ? p.rating : 'New'}</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] sm:text-xs text-[#5a403f]/80 line-clamp-1">{p.location}</p>
                  
                  {p.distance && (
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#b52330] font-semibold bg-[#ffdad8]/40 px-2 py-0.5 rounded-md border border-[#e2bebc]/40 w-fit">
                      <Footprints className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.distance || '5 min walk to nearest landmark'}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-1.5 border-t border-[#f5f3f3]">
                    <span className="text-[#b52330] font-bold text-xs sm:text-sm">
                      ZMW {formatPrice(p.price)}<span className="text-[9px] text-[#5a403f] font-normal">/mo</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-[#5a403f] font-medium shrink-0">
                      <Bed className="w-2.5 h-2.5 text-[#b52330]/80" /> {p.beds}
                      <span className="text-[#e4e2e2] font-normal">|</span>
                      <Bath className="w-2.5 h-2.5 text-[#b52330]/80" /> {p.baths}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Horizontal Scroll section - Recent Listings */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1c1c]">Recent Listings</h2>
            <p className="text-xs sm:text-sm text-[#5a403f]">Newly added homes for you on the market</p>
          </div>
        </div>

        {otherListings.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-[#e4e2e2] text-[#5a403f]">
            No other recent listings found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:no-scrollbar pb-2 pt-1 px-1 sm:px-4 md:mx-0 md:px-0">
            {otherListings.map((item) => (
              <div
                key={item.id}
                className="w-full sm:min-w-[250px] sm:max-w-[280px] sm:flex-shrink-0 bg-white rounded-xl border border-[#eae8e7] overflow-hidden group shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all"
              >
                <div className="relative h-20 xs:h-24 sm:h-32 overflow-hidden bg-[#eae8e7]">
                  <img
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    referrerPolicy="no-referrer"
                    src={item.image}
                    onClick={() => onSelectProperty(item)}
                  />
                  {item.verified ? (
                    <div 
                      onClick={isAdmin ? (e) => {
                        e.stopPropagation();
                        onTogglePropertyVerified?.(item.id, true);
                      } : undefined}
                      className={`absolute top-2 left-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-100/50 ${isAdmin ? 'cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all' : ''}`}
                      title={isAdmin ? 'Click to Remove Verification' : 'Verified Property'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[4px] text-emerald-650" />
                    </div>
                  ) : (
                    isAdmin && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePropertyVerified?.(item.id, false);
                        }}
                        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-100/90 hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-650 shadow-sm z-10 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                        title="Click to Verify Property"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2px]" />
                      </div>
                    )
                  )}
                  {item.propertyOfTheWeek && (
                    <div className="absolute top-2 left-10 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm z-10 font-sans">
                      Spotlight
                    </div>
                  )}
                  <div className={`absolute bottom-2 left-2 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10 ${
                    item.available !== false 
                      ? 'bg-[#006c4c]/90 text-white' 
                      : 'bg-[#d97706]/90 text-white'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${item.available !== false ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {item.available !== false ? 'Available' : 'Pending'}
                  </div>
                  {isAdmin && onDeleteProperty && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProperty(item.id);
                      }}
                      className="absolute top-2 right-9 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 shadow-sm z-10 active:scale-95 transition-all"
                      title="Super Admin: Delete Listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onToggleSaved(item.id, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[#b52330] shadow-sm hover:scale-105 active:scale-95 transition-transform z-10"
                  >
                    <Heart className={`w-3.5 h-3.5 ${savedIds.includes(item.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <h3 
                      onClick={() => onSelectProperty(item)}
                      className="font-semibold text-xs sm:text-sm text-[#1b1c1c] hover:text-[#b52330] transition-colors cursor-pointer line-clamp-1 flex-1"
                    >
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#b52330] shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{item.rating && item.rating > 0 ? item.rating : 'New'}</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] sm:text-xs text-[#5a403f]/80 line-clamp-1">{item.location}</p>
                  
                  {item.distance && (
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#b52330] font-semibold bg-[#ffdad8]/40 px-2 py-0.5 rounded-md border border-[#e2bebc]/40 w-fit">
                      <Footprints className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.distance}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-1.5 border-t border-[#f5f3f3]">
                    <span className="text-[#b52330] font-bold text-xs sm:text-sm">
                      ZMW {formatPrice(item.price)}<span className="text-[9px] text-[#5a403f] font-normal">/mo</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-[#5a403f] font-medium shrink-0">
                      <Bed className="w-2.5 h-2.5 text-[#b52330]/80" /> {item.beds}
                      <span className="text-[#e4e2e2] font-normal">|</span>
                      <Bath className="w-2.5 h-2.5 text-[#b52330]/80" /> {item.baths}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Complete Market Listings Grid */}
      <section className="space-y-4 pt-4 border-t border-[#e4e2e2]">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1c1c]">All Market Listings ({filteredProperties.length})</h2>
            <p className="text-xs sm:text-sm text-[#5a403f]">Browse every active property listed across Zambia</p>
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-[#e4e2e2] text-sm text-[#5a403f]">
            No properties found matching your current filter. Try adjusting your search query or province.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#eae8e7] overflow-hidden group shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 sm:h-52 overflow-hidden bg-[#eae8e7]">
                    <img
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      referrerPolicy="no-referrer"
                      src={item.image}
                      onClick={() => onSelectProperty(item)}
                    />
                    {item.verified ? (
                      <div 
                        onClick={isAdmin ? (e) => {
                          e.stopPropagation();
                          onTogglePropertyVerified?.(item.id, true);
                        } : undefined}
                        className={`absolute top-3 left-3 w-7 h-7 rounded-full bg-white/95 flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-100 ${isAdmin ? 'cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all' : ''}`}
                        title={isAdmin ? 'Click to Remove Verification' : 'Verified Property'}
                      >
                        <Check className="w-4 h-4 stroke-[4px] text-emerald-650" />
                      </div>
                    ) : (
                      isAdmin && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePropertyVerified?.(item.id, false);
                          }}
                          className="absolute top-3 left-3 w-7 h-7 rounded-full bg-slate-100/90 hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-650 shadow-sm z-10 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                          title="Click to Verify Property"
                        >
                          <Check className="w-4 h-4 stroke-[2px]" />
                        </div>
                      )
                    )}
                    {item.propertyOfTheWeek && (
                      <div className="absolute top-3 left-12 bg-amber-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm z-10 font-sans">
                        Spotlight
                      </div>
                    )}
                    <div className={`absolute bottom-3 left-3 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10 ${
                      item.available !== false 
                        ? 'bg-[#006c4c]/90 text-white' 
                        : 'bg-[#d97706]/90 text-white'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.available !== false ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      {item.available !== false ? 'Available' : 'Pending'}
                    </div>
                    {isAdmin && onDeleteProperty && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProperty(item.id);
                        }}
                        className="absolute top-3 right-11 w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 shadow-sm z-10 active:scale-95 transition-all"
                        title="Super Admin: Delete Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => onToggleSaved(item.id, e)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-[#b52330] shadow-sm hover:scale-105 active:scale-95 transition-transform z-10"
                    >
                      <Heart className={`w-4 h-4 ${savedIds.includes(item.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 
                        onClick={() => onSelectProperty(item)}
                        className="font-bold text-sm sm:text-base text-[#1b1c1c] hover:text-[#b52330] transition-colors cursor-pointer line-clamp-1 flex-1"
                      >
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#b52330] shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{item.rating && item.rating > 0 ? item.rating : 'New'}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#5a403f]/80 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#b52330] shrink-0" />
                      <span className="line-clamp-1">{item.location}, {item.province}</span>
                    </p>
                    
                    {item.distance && (
                      <div className="flex items-center gap-1 text-[10px] text-[#b52330] font-semibold bg-[#ffdad8]/40 px-2.5 py-1 rounded-md border border-[#e2bebc]/40 w-fit">
                        <Footprints className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.distance}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex justify-between items-center border-t border-[#f5f3f3] mt-2">
                  <div>
                    <span className="text-[10px] text-[#5a403f] block uppercase tracking-wider font-mono">Rent / Month</span>
                    <span className="text-[#b52330] font-black text-sm sm:text-base">
                      ZMW {formatPrice(item.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#5a403f] font-medium shrink-0 bg-[#f0eded] px-3 py-1.5 rounded-xl">
                    <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5 text-[#b52330]" /> {item.beds}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-[#b52330]" /> {item.baths}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
