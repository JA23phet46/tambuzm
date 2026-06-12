import React, { useState } from 'react';
import { Search, Home, Building2, GraduationCap, Check, X } from 'lucide-react';
import { Province, PropertyType } from '../types';

interface FiltersViewProps {
  initialProvince: Province | '';
  initialMinPrice: number;
  initialMaxPrice: number;
  initialPropertyTypes: PropertyType[];
  initialSearchQuery: string;
  onApplyFilters: (query: string, province: Province | '', min: number, max: number, types: PropertyType[]) => void;
  onClearFilters: () => void;
}

export const FiltersView: React.FC<FiltersViewProps> = ({
  initialProvince,
  initialMinPrice,
  initialMaxPrice,
  initialPropertyTypes,
  initialSearchQuery,
  onApplyFilters,
  onClearFilters,
}) => {
  const [province, setProvince] = useState<Province | ''>(initialProvince);
  const [minPrice, setMinPrice] = useState<number>(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState<number>(initialMaxPrice);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(initialPropertyTypes);
  const [searchWord, setSearchWord] = useState<string>(initialSearchQuery);
  const [town, setTown] = useState('Lusaka City');
  const [residentialArea, setResidentialArea] = useState('');
  
  // Custom Must Haves toggles local state
  const [walledFence, setWalledFence] = useState(false);
  const [borehole, setBorehole] = useState(false);
  const [pavedYard, setPavedYard] = useState(false);

  const handleToggleType = (type: PropertyType) => {
    if (propertyTypes.includes(type)) {
      setPropertyTypes(propertyTypes.filter((t) => t !== type));
    } else {
      setPropertyTypes([...propertyTypes, type]);
    }
  };

  const handleApply = () => {
    onApplyFilters(searchWord, province, minPrice, maxPrice, propertyTypes);
  };

  const handleClear = () => {
    setProvince('');
    setMinPrice(2500);
    setMaxPrice(15000);
    setPropertyTypes([]);
    setSearchWord('');
    setTown('Lusaka City');
    setResidentialArea('');
    setWalledFence(false);
    setBorehole(false);
    setPavedYard(false);
    onClearFilters();
  };

  // Mock property coordinates relative to range height
  const priceDensities = [12, 18, 32, 54, 76, 85, 62, 41, 23, 10];

  return (
    <div className="max-w-[720px] mx-auto space-y-10 animate-fade-in pb-32 pt-4">
      {/* Header bar */}
      <div className="flex justify-between items-center pb-4 border-b border-[#e4e2e2]">
        <h1 className="text-xl sm:text-2xl font-black text-[#1b1c1c]">Filters</h1>
        <button 
          onClick={handleClear}
          className="text-xs sm:text-sm font-semibold text-[#b52330] hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Where are you looking */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#1b1c1c]">Where are you looking?</h2>
        <div className="relative flex items-center bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 shadow-sm focus-within:border-[#8e706f] transition-all">
          <Search className="text-[#8e706f] w-5 h-5 mr-3 shrink-0" />
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm sm:text-base placeholder-[#5a403f]/50"
            placeholder="Search province, town, university or area..."
          />
        </div>
      </section>

      {/* Select Province */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#1b1c1c]">Select Province</h2>
        <div className="flex flex-wrap gap-2.5">
          {Object.values(Province).map((item) => {
            const isActive = province === item;
            return (
              <button
                key={item}
                onClick={() => setProvince(isActive ? '' : item)}
                className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  isActive 
                    ? 'bg-[#ffdad8] border-[#b52330] text-[#b52330]'
                    : 'bg-white border-[#e4e2e2] text-[#5a403f] hover:border-[#8e706f]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      {/* Town & Neighborhood selects */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-xs sm:text-sm font-bold text-[#1b1c1c] block">Town</label>
          <select
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
          >
            <option value="Lusaka City">Lusaka City</option>
            <option value="Chongwe">Chongwe</option>
            <option value="Kitwe">Kitwe</option>
            <option value="Ndola">Ndola</option>
            <option value="Livingstone">Livingstone</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-xs sm:text-sm font-bold text-[#1b1c1c] block">Residential Area</label>
          <input
            type="text"
            value={residentialArea}
            onChange={(e) => setResidentialArea(e.target.value)}
            placeholder="e.g. Woodlands, Avondale"
            className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none placeholder-[#5a403f]/50"
          />
        </div>
      </section>

      {/* Price Range Slider graph */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-base sm:text-lg font-bold text-[#1b1c1c]">Price range</h2>
          <span className="text-xs text-[#5a403f]">Monthly rent in ZMW</span>
        </div>

        <div className="space-y-6 pt-2">
          {/* Visual Price Density bar chart */}
          <div className="flex items-end justify-between gap-1 h-12 px-2 select-none">
            {priceDensities.map((height, idx) => {
              // Highlight middle bars to match mockup
              const isHighlighted = idx >= 3 && idx <= 7;
              return (
                <div
                  key={idx}
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-t-[2px] transition-all duration-300 ${
                    isHighlighted ? 'bg-[#b52330]' : 'bg-[#e4e2e2]'
                  }`}
                ></div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#e4e2e2] rounded-xl p-3 bg-white focus-within:border-[#8e706f] transition-all">
              <label className="block text-[10px] font-bold text-[#5a403f] uppercase tracking-wider mb-1">Minimum</label>
              <div className="flex items-center">
                <span className="mr-1 text-xs font-bold text-[#1b1c1c]">ZMW</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full border-none p-0 focus:ring-0 text-xs sm:text-sm font-semibold outline-none"
                />
              </div>
            </div>

            <div className="border border-[#e4e2e2] rounded-xl p-3 bg-white focus-within:border-[#8e706f] transition-all">
              <label className="block text-[10px] font-bold text-[#5a403f] uppercase tracking-wider mb-1">Maximum</label>
              <div className="flex items-center">
                <span className="mr-1 text-xs font-bold text-[#1b1c1c]">ZMW</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full border-none p-0 focus:ring-0 text-xs sm:text-sm font-semibold outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Type Choice */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#1b1c1c]">Property type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { type: PropertyType.HOUSE, label: 'House', icon: Home },
            { type: PropertyType.APARTMENT, label: 'Apartment', icon: Building2 },
            { type: PropertyType.BOARDING_HOUSE, label: 'Boarding House', icon: GraduationCap }
          ].map((item) => {
            const isSelected = propertyTypes.includes(item.type);
            return (
              <div
                key={item.type}
                onClick={() => handleToggleType(item.type)}
                className={`flex flex-col items-start p-6 rounded-2xl border cursor-pointer select-none transition-all active:scale-[0.98] ${
                  isSelected 
                    ? 'border-[#b52330] bg-[#ffdad8]' 
                    : 'border-[#e4e2e2] bg-white hover:border-[#8e706f]'
                }`}
              >
                <item.icon className={`w-8 h-8 mb-4 ${isSelected ? 'text-[#b52330]' : 'text-[#5a403f]'}`} />
                <span className="text-xs sm:text-sm font-bold text-[#1b1c1c]">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Must Haves Custom Extra choices */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#1b1c1c]">Must haves</h2>
        <div className="flex flex-wrap gap-2.5 select-none">
          <button
            onClick={() => setWalledFence(!walledFence)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              walledFence 
                ? 'bg-[#ffdad8] border-[#b52330] text-[#b52330]' 
                : 'bg-white border-[#e4e2e2] text-[#1b1c1c] hover:border-[#8e706f]'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${walledFence ? 'bg-[#b52330] border-[#b52330]' : 'border-[#e4e2e2]'}`}>
              {walledFence && <Check className="w-3 h-3 text-white" />}
            </div>
            Walled Fence
          </button>

          <button
            onClick={() => setBorehole(!borehole)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              borehole 
                ? 'bg-[#ffdad8] border-[#b52330] text-[#b52330]' 
                : 'bg-white border-[#e4e2e2] text-[#1b1c1c] hover:border-[#8e706f]'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${borehole ? 'bg-[#b52330] border-[#b52330]' : 'border-[#e4e2e2]'}`}>
              {borehole && <Check className="w-3 h-3 text-white" />}
            </div>
            Borehole
          </button>

          <button
            onClick={() => setPavedYard(!pavedYard)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              pavedYard 
                ? 'bg-[#ffdad8] border-[#b52330] text-[#b52330]' 
                : 'bg-white border-[#e4e2e2] text-[#1b1c1c] hover:border-[#8e706f]'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${pavedYard ? 'bg-[#b52330] border-[#b52330]' : 'border-[#e4e2e2]'}`}>
              {pavedYard && <Check className="w-3 h-3 text-white" />}
            </div>
            Paved Yard
          </button>
        </div>
      </section>

      {/* Apply CTA Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-[#e4e2e2] px-6 py-4 flex items-center justify-between z-50">
        <button 
          onClick={handleClear}
          className="text-xs sm:text-sm text-[#5a403f] font-bold hover:underline"
        >
          Clear all
        </button>
        
        <button
          onClick={handleApply}
          className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs sm:text-sm font-extrabold px-8 py-3 rounded-xl shadow-md transition-all active:scale-95"
        >
          Show matching properties
        </button>
      </footer>
    </div>
  );
};
