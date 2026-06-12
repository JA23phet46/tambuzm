import React, { useState } from 'react';
import { Building2, Home, GraduationCap, MapPin, Image as ImageIcon, Check, Calendar, Plus } from 'lucide-react';
import { PropertyType, NewListingInput, Province } from '../types';

interface ListingFormViewProps {
  selectedPhotos: string[];
  onOpenPhotoSelector: () => void;
  onPublishListing: (input: NewListingInput) => void;
  onCancel: () => void;
  initialPhone?: string;
  isAdmin?: boolean;
}

export const ListingFormView: React.FC<ListingFormViewProps> = ({
  selectedPhotos,
  onOpenPhotoSelector,
  onPublishListing,
  onCancel,
  initialPhone = '',
  isAdmin = false,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [whatsapp, setWhatsapp] = useState(initialPhone);
  const [location, setLocation] = useState('');
  const [type, setType] = useState<PropertyType>(PropertyType.BOARDING_HOUSE);
  const [province, setProvince] = useState<Province>(Province.LUSAKA);
  const [price, setPrice] = useState<number | ''>('');
  const [beds, setBeds] = useState<number | ''>('');
  const [baths, setBaths] = useState<number | ''>('');
  const [sqm, setSqm] = useState<number | ''>('');
  const [distance, setDistance] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [propertyOfTheWeek, setPropertyOfTheWeek] = useState<boolean>(false);
  const [errorVal, setErrorVal] = useState<string | null>(null);

  const amenitiesPool = [
    'Walled Fence', 'Borehole', 'Paved Yard', 'Continuous Power', 
    'Geyser Backup', 'Air Conditioning', 'WiFi Included', 'Parking Slot'
  ];

  const handleToggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((a) => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !description || !price || Number(price) <= 0 || !phone || !whatsapp || !distance) {
      setErrorVal('Please fill out all required fields with valid values, including distance landmark, contact phone, and WhatsApp numbers');
      return;
    }
    
    if (selectedPhotos.length === 0) {
      setErrorVal('Please select at least one photo for your property. Auto-suggested or placeholder photos are disabled.');
      return;
    }
    
    setErrorVal(null);

    onPublishListing({
      name,
      location,
      province,
      price: Number(price),
      type,
      beds: Number(beds) || 0,
      baths: Number(baths) || 0,
      sqm: Number(sqm) || 0,
      distance,
      description,
      amenities,
      photos: selectedPhotos,
      phone,
      whatsapp,
      propertyOfTheWeek,
    });
  };

  return (
    <div className="max-w-[640px] mx-auto space-y-8 animate-fade-in pt-4 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-[#1b1c1c]">List your Zambian property</h1>
        <p className="text-xs text-[#5a403f] max-w-sm mx-auto">
          Increase views, connect with university students or working executives, and coordinate securely.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-6">
        
        {errorVal && (
          <div className="p-4 rounded-xl bg-[#ffdad8] border border-[#b52330] text-[#b52330] text-xs font-bold leading-normal">
            {errorVal}
          </div>
        )}
        
        {/* Listing Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Property Title *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
            placeholder="e.g. Modern Double Room near CBU"
          />
        </div>

        {/* Owner's Phone Contact */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Contact Phone Number * (shown in property details for seekers to call)</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none font-semibold"
            placeholder="e.g. +260 97 1234567 or 0971234567"
          />
        </div>

        {/* Owner's WhatsApp Contact */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">WhatsApp Contact Number * (leads seekers directly to WhatsApp chat with you)</label>
          <input
            type="tel"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none font-semibold"
            placeholder="e.g. +260971234567"
          />
        </div>

        {/* Price & Province Selection fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Monthly Rent (ZMW) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5a403f]">ZMW</span>
              <input
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border border-[#e4e2e2] rounded-xl pl-14 pr-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none font-bold"
                placeholder="e.g. 1500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Zambian Province *</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value as Province)}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f]/80 focus:ring-0 outline-none text-[#1b1c1c] font-semibold"
            >
              <option value={Province.LUSAKA}>Lusaka</option>
              <option value={Province.COPPERBELT}>Copperbelt</option>
              <option value={Province.SOUTHERN}>Southern</option>
              <option value={Province.CENTRAL}>Central</option>
              <option value={Province.NORTH_WESTERN}>North-Western</option>
              <option value={Province.EASTERN}>Eastern</option>
            </select>
          </div>
        </div>

        {/* Property Type Grid Radio Selectors */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Category</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: PropertyType.BOARDING_HOUSE, label: 'Boarding House', icon: GraduationCap },
              { val: PropertyType.APARTMENT, label: 'Apartment', icon: Building2 },
              { val: PropertyType.HOUSE, label: 'House', icon: Home }
            ].map((item) => {
              const isActive = type === item.val;
              return (
                <div
                  key={item.val}
                  onClick={() => setType(item.val)}
                  className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer select-none transition-all ${
                    isActive ? 'border-[#b52330] bg-[#ffdad8]' : 'border-[#e4e2e2] bg-white hover:border-[#8e706f]'
                  }`}
                >
                  <item.icon className={`w-6 h-6 mb-2 ${isActive ? 'text-[#b52330]' : 'text-[#8e706f]'}`} />
                  <span className="text-[10px] font-bold text-center tracking-wide">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location & Landmark Landmark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Neighborhood / City Landmark *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
              placeholder="e.g. Jano, Kitwe Central"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Distance Landmark info *</label>
            <input
              type="text"
              required
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
              placeholder="e.g. 10 min walk to UNZA"
            />
          </div>
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Listing Description *</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none placeholder-[#5a403f]/50 leading-relaxed"
            placeholder="Introduce the house, specs, environment, and electricity backup status..."
          />
        </div>

        {/* Specifications row: Beds, Baths, Sqm */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Bedrooms</label>
            <input
              type="number"
              min="0"
              required
              value={beds}
              onChange={(e) => setBeds(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
              placeholder="e.g. 1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Bathrooms</label>
            <input
              type="number"
              min="0"
              required
              value={baths}
              onChange={(e) => setBaths(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
              placeholder="e.g. 1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1b1c1c] block">Size (SQM)</label>
            <input
              type="number"
              min="1"
              required
              value={sqm}
              onChange={(e) => setSqm(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
              className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
              placeholder="e.g. 30"
            />
          </div>
        </div>

        {/* Photos selection container */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Selected Photos</label>
          
          <div className="grid grid-cols-4 gap-3">
            {selectedPhotos.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#f0eded] border border-[#e4e2e2]">
                <img alt="Thumbnail" referrerPolicy="no-referrer" src={url} className="w-full h-full object-cover" />
              </div>
            ))}
            
            {/* "+" Selector Trigger block */}
            <div
              onClick={onOpenPhotoSelector}
              className="aspect-square rounded-xl border-2 border-dashed border-[#e4e2e2] hover:border-[#b52330] flex flex-col items-center justify-center cursor-pointer bg-[#fbf9f8] transition-all hover:bg-white"
            >
              <ImageIcon className="text-[#5a403f] w-5 h-5 mb-1.5" />
              <span className="text-[9px] font-extrabold text-[#5a403f] uppercase tracking-wider">Add pool</span>
            </div>
          </div>
        </div>

        {/* Amenities Selection Pills list */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-[#1b1c1c] block">Select Core Amenities</label>
          <div className="flex flex-wrap gap-2 select-none">
            {amenitiesPool.map((item) => {
              const isSelected = amenities.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleToggleAmenity(item)}
                  className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-transform active:scale-95 ${
                    isSelected 
                      ? 'bg-[#ffdad8] border-[#b52330] text-[#b52330]' 
                      : 'bg-white border-[#e4e2e2] text-[#1b1c1c] hover:border-[#8e706f]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#b52330] border-[#b52330]' : 'border-[#e4e2e2]'}`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-[#1b1c1c] uppercase tracking-wider flex items-center gap-1.5 text-amber-800">
              <span>🏆 App Owner Controls</span>
            </h4>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={propertyOfTheWeek}
                onChange={(e) => setPropertyOfTheWeek(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 bg-white"
              />
              <div className="text-xs">
                <p className="font-bold text-[#1b1c1c]">Set as Property of the Week</p>
                <p className="text-[#5a403f] font-medium leading-relaxed">This property will be pinned at the absolute top of the homepage in an elegant hero spotlight banner.</p>
              </div>
            </label>
          </div>
        )}

        {/* Form submittals buttons */}
        <div className="flex gap-4 pt-4 border-t border-[#e4e2e2]/40">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 border border-[#e4e2e2] text-[#5a403f] rounded-xl text-xs font-bold hover:bg-[#fbf9f8] active:scale-95 transition-all text-center"
          >
            Go Back
          </button>
          
          <button
            type="submit"
            className="flex-1 py-3.5 bg-[#b52330] hover:bg-[#9a1c26] text-white rounded-xl text-xs font-extrabold active:scale-95 transition-all shadow-md"
          >
            Publish Listing (K100 Placement)
          </button>
        </div>

      </form>
    </div>
  );
};
