import React, { useState, useRef } from 'react';
import { 
  Check, 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Search, 
  Link as LinkIcon, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { PHOTO_POOL } from '../data';

interface PhotoSelectorViewProps {
  initialSelected: string[];
  onConfirmSelection: (selected: string[]) => void;
  onCancel: () => void;
}

// Rich repository of high-res, reliable curated Unsplash property photos perfect for listings
const CURATED_REAL_ESTATE_PHOTOS = [
  // Boarding / Student Housing Rooms
  { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Student Study Desk & Bed' },
  { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Cozy Single Bed Workspace' },
  { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Softlit Student Hostel Bedsit' },
  { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Modern Minimalist Single Dorm' },
  { url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Desk & Shelves Room Layout' },
  { url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1000&auto=format&fit=crop&q=80', cat: 'boarding', label: 'Cozy Accent study apartment' },

  // Living Rooms
  { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&auto=format&fit=crop&q=80', cat: 'living', label: 'Aesthetic Light Living Room (Pink Accents)' },
  { url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000&auto=format&fit=crop&q=80', cat: 'living', label: 'Elegant Modern Living Parlor' },
  { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000&auto=format&fit=crop&q=80', cat: 'living', label: 'Warm Family Lounge Room' },
  { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1000&auto=format&fit=crop&q=80', cat: 'living', label: 'Bright Scandinavian Lounge' },
  { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80', cat: 'living', label: 'Luxury Penthouse Suite Parlor' },

  // Kitchens
  { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1000&auto=format&fit=crop&q=80', cat: 'kitchen', label: 'Polished Ceramic Kitchen Counter' },
  { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80', cat: 'kitchen', label: 'Sleek Modern Appliances Kitchen' },
  { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&auto=format&fit=crop&q=80', cat: 'kitchen', label: 'Classic Oak Shelving Kitchen' },
  { url: 'https://images.unsplash.com/photo-1599809275671-b59dd185297e?w=1000&auto=format&fit=crop&q=80', cat: 'kitchen', label: 'Chic Kitchen Island & Stools' },

  // Bathrooms
  { url: 'https://images.unsplash.com/photo-1620626011761-996317b6979a?w=1000&auto=format&fit=crop&q=80', cat: 'bathroom', label: 'Luxury Tiled Restroom' },
  { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1000&auto=format&fit=crop&q=80', cat: 'bathroom', label: 'Minimalist Classy Shower' },
  { url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1000&auto=format&fit=crop&q=80', cat: 'bathroom', label: 'Bright Restroom & Sink' },

  // Compound / Yards
  { url: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1000&auto=format&fit=crop&q=80', cat: 'exterior', label: 'Paved Driveway Yard with High Fence' },
  { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1000&auto=format&fit=crop&q=80', cat: 'exterior', label: 'Modern Estate Facade' },
  { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80', cat: 'exterior', label: 'Gated Villa Exterior Block' },
  { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1000&auto=format&fit=crop&q=80', cat: 'exterior', label: 'Lush Yard Grass Front Plot' }
];

const QUICK_TAGS = [
  'Single Room', 'Uni Hostel', 'Cozy Bedroom', 'Modern Parlor', 'Neat Kitchen', 'Paved Yard', 'Shower Room', 'Security Fence'
];

type SelectorTab = 'fetcher' | 'curated' | 'link' | 'upload';

export const PhotoSelectorView: React.FC<PhotoSelectorViewProps> = ({
  initialSelected,
  onConfirmSelection,
  onCancel,
}) => {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SelectorTab>('upload');
  
  // Custom uploaded/fetched Web links
  const [customPool, setCustomPool] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('tambu_custom_uploads');
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Storage reading failed for tambu_custom_uploads:", e);
      return [];
    }
  });

  // State for Stock Photo Keyword Fetching
  const [keyword, setKeyword] = useState('');
  const [fetchedStock, setFetchedStock] = useState<string[]>(() => [
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1620626011761-996317b6979a?w=1000&auto=format&fit=crop&q=80',
  ]);
  const [isFetching, setIsFetching] = useState(false);

  // Curated photo filters
  const [curatedCategory, setCuratedCategory] = useState<string>('all');

  // Input states
  const [pastedUrl, setPastedUrl] = useState('');
  const [pastingError, setPastingError] = useState('');

  const handleToggle = (url: string) => {
    if (selected.includes(url)) {
      setSelected(selected.filter((item) => item !== url));
    } else {
      setSelected([...selected, url]);
    }
  };

  // Triggers Unsplash stock photo generation
  const handleKeywordSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setIsFetching(true);
    
    // Simulate real web fetching from high quality Unsplash nodes using dynamic queries
    setTimeout(() => {
      const formatted = searchTerm.trim().toLowerCase().replace(/\s+/g, ',');
      const newPhotos = [
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=1-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=2-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=3-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=4-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=5-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
        `https://images.unsplash.com/featured/?realestate,interior,${formatted}&sig=6-${Math.floor(Math.random() * 9999)}&w=1000&q=80`,
      ];
      setFetchedStock(newPhotos);
      setIsFetching(false);
    }, 850);
  };

  // Upload/Fetch Paste validation
  const handlePasteUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPastingError('');
    const cleanUrl = pastedUrl.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:')) {
      setPastingError('Please enter a valid image web URL starting with HTTP/HTTPS');
      return;
    }

    // Append to custom pool & auto-select
    setCustomPool((prev) => {
      const updated = [cleanUrl, ...prev];
      try {
        localStorage.setItem('tambu_custom_uploads', JSON.stringify(updated));
      } catch (err) {
        console.warn("Storage quota exceeded or storage unavailable for custom pasting:", err);
      }
      return updated;
    });
    setSelected((prev) => [...prev, cleanUrl]);
    setPastedUrl('');
    // Switch tab back to curated or select view so they can see it
    setActiveTab('curated');
  };

  // File system upload with compression & resizing to prevent mobile white screen & quota errors
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        if (!resultString) return;

        // Compress image using canvas to prevent mobile memory & quota crashes
        const img = new Image();
        img.src = resultString;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 2560; // Upgraded for high-resolution HD/2K/4K photos

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.95);

            setCustomPool((prev) => {
              const updated = [compressedBase64, ...prev].slice(0, 15);
              try {
                localStorage.setItem('tambu_custom_uploads', JSON.stringify(updated));
              } catch (err) {
                console.warn("Storage quota exceeded or storage unavailable for custom uploads:", err);
              }
              return updated;
            });

            setSelected((prev) => {
              if (prev.includes(compressedBase64)) return prev;
              return [...prev, compressedBase64];
            });
          }
        };
        img.onerror = () => {
          setCustomPool((prev) => [resultString, ...prev].slice(0, 15));
          setSelected((prev) => [...prev, resultString]);
        };
      };
      reader.readAsDataURL(file as File);
    });
  };

  const handleDeleteUploaded = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPool = customPool.filter((item) => item !== url);
    setCustomPool(updatedPool);
    try {
      localStorage.setItem('tambu_custom_uploads', JSON.stringify(updatedPool));
    } catch (err) {
      console.warn("Storage write failed during deleting item:", err);
    }
    setSelected(selected.filter((item) => item !== url));
  };

  // Filters for Curated list
  const filteredCurated = curatedCategory === 'all' 
    ? CURATED_REAL_ESTATE_PHOTOS 
    : CURATED_REAL_ESTATE_PHOTOS.filter(p => p.cat === curatedCategory);

  return (
    <div className="max-w-[720px] mx-auto space-y-6 animate-fade-in pt-4 pb-32 px-1">
      
      {/* Header bar */}
      <div className="flex justify-between items-center pb-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="p-2 -ml-2 rounded-full hover:bg-[#fdf2f8] transition-colors text-[#db2777]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">Select Listing Photos</h1>
            <p className="text-xs text-[#64748b]">Select multiple pictures for your property listing draft</p>
          </div>
        </div>
        
        <button
          onClick={() => onConfirmSelection(selected)}
          className="bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Confirm ({selected.length})
        </button>
      </div>

      {/* Styled Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('fetcher')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
            activeTab === 'fetcher' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Fetch Stock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curated')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
            activeTab === 'curated' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Curated Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
            activeTab === 'link' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Web Link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
            activeTab === 'upload' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span>Upload File</span>
        </button>
      </div>

      {/* --- TAB 1: AI KEYWORD STOCK FETCHER --- */}
      {activeTab === 'fetcher' && (
        <div className="space-y-4 bg-[#fdf2f8]/50 p-4 sm:p-5 rounded-2xl border border-[#fbcfe8] animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#db2777]">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-extrabold text-sm">Aesthetic Keyword Stock Fetcher</h3>
            </div>
            <p className="text-xs text-[#64748b]">
              Type a theme keyword (such as "modern bedsit", "white kitchen", "tiled bath") and we will fetch highly relevant, premium property photography previews instantly for you.
            </p>
          </div>

          {/* Keyword Search Input Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. cozy university single room, luxury parlor, paved exterior..."
                onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch(keyword)}
                className="w-full bg-white border border-[#f1f5f9] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:border-[#db2777] focus:ring-1 focus:ring-[#db2777] outline-none font-semibold text-[#0f172a]"
              />
            </div>
            
            <button
              type="button"
              onClick={() => handleKeywordSearch(keyword)}
              disabled={isFetching || !keyword.trim()}
              className="bg-[#db2777] hover:bg-[#be185d] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold px-4 sm:px-6 rounded-xl shadow-sm transition-all flex items-center gap-1 shrink-0"
            >
              {isFetching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isFetching ? 'Fetching...' : 'Fetch Pictures'}</span>
            </button>
          </div>

          {/* Quick Tags Suggestions */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Quick Search Suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setKeyword(tag);
                    handleKeywordSearch(tag);
                  }}
                  className="bg-white hover:bg-[#fdf2f8] text-[#db2777] hover:text-[#be185d] border border-[#f1f5f9] text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#fbcfe8] pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-xs text-[#0f172a]">Fetched Pictures Results ({fetchedStock.length})</h4>
              <p className="text-[10px] text-[#64748b]">Click images to select/deselect them for your listing</p>
            </div>

            {isFetching ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[#fbcfe8] border-t-[#db2777] rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-[#64748b] animate-pulse">Contacting stock photo repository nodes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {fetchedStock.map((url, i) => {
                  const isSelected = selected.includes(url);
                  return (
                    <div
                      key={i}
                      onClick={() => handleToggle(url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected 
                          ? 'border-[#db2777] scale-95 shadow-md' 
                          : 'border-white hover:border-[#db2777] hover:scale-[1.02]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Fetched view ${i}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className={`absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors ${isSelected ? 'bg-black/30' : ''}`} />
                      
                      {isSelected ? (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#db2777] text-white rounded-full flex items-center justify-center shadow-md animate-scale-in border border-white">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        </div>
                      ) : (
                        <div className="absolute bottom-1 right-1 text-[8px] xs:text-[9px] bg-black/50 text-white font-bold px-1 py-0.5 rounded backdrop-blur-[2px]">
                          Stock Match
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CURATED ZAMBIA HOUSING COLLECTIONS --- */}
      {activeTab === 'curated' && (
        <div className="space-y-4 animate-fade-in text-[#0f172a]">
          {/* Sub Categories filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCuratedCategory('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'all' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              All Curated
            </button>
            <button
              onClick={() => setCuratedCategory('boarding')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'boarding' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              🏫 Uni Boarding Room
            </button>
            <button
              onClick={() => setCuratedCategory('living')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'living' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              🛋️ Living Room
            </button>
            <button
              onClick={() => setCuratedCategory('kitchen')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'kitchen' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              🍳 Kitchen
            </button>
            <button
              onClick={() => setCuratedCategory('bathroom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'bathroom' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              🚿 Bathroom
            </button>
            <button
              onClick={() => setCuratedCategory('exterior')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                curatedCategory === 'exterior' ? 'bg-[#db2777] text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#64748b]'
              }`}
            >
              🏡 Yard / Gates
            </button>
          </div>

          {/* Grid Layout of Curated Collection */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
            {/* Custom / Uploaded Pool gets prepended here in premium cards! */}
            {customPool.map((url, idx) => {
              const isSelected = selected.includes(url);
              return (
                <div
                  key={`custom-${idx}`}
                  onClick={() => handleToggle(url)}
                  className={`relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border-2 sm:border-3 group transition-all select-none ${
                    isSelected ? 'border-[#db2777] scale-95 shadow-md' : 'border-[#f1f5f9] hover:border-[#db2777]'
                  }`}
                >
                  <img
                    alt={`custom ${idx}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    referrerPolicy="no-referrer"
                    src={url}
                  />
                  <div className={`absolute inset-0 bg-black/10 ${isSelected ? 'bg-black/30' : ''}`} />
                  
                  <div className="absolute top-1 left-1 bg-[#db2777] text-white font-bold text-[7px] sm:text-[9px] px-1 sm:px-2 py-0.5 rounded shadow-sm border border-white/25">
                    ADDED
                  </div>

                  {/* Delete custom link/upload option */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteUploaded(url, e)}
                    className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-red-600 hover:text-white text-gray-200 rounded-lg transition-colors border border-white/10"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-[#db2777] text-white rounded-full flex items-center justify-center shadow-md border border-white">
                      <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Default pool and curated properties */}
            {filteredCurated.map((item, idx) => {
              const isSelected = selected.includes(item.url);
              return (
                <div
                  key={`curated-${idx}`}
                  onClick={() => handleToggle(item.url)}
                  className={`relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border-2 sm:border-3 group transition-all select-none ${
                    isSelected ? 'border-[#db2777] scale-95 shadow-md' : 'border-[#f1f5f9] hover:border-[#db2777]'
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute inset-0 bg-black/10 ${isSelected ? 'bg-black/30' : ''}`} />
                  
                  <div className="absolute bottom-1 left-1 text-[8px] sm:text-[10px] text-white bg-black/40 px-1.5 sm:px-2 py-0.5 rounded font-medium truncate max-w-[90%]">
                    {item.label}
                  </div>

                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-[#db2777] text-white rounded-full flex items-center justify-center shadow-md border border-white">
                      <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: PASTE WEB IMAGE LINK --- */}
      {activeTab === 'link' && (
        <div className="space-y-5 bg-[#fdf2f8]/40 p-5 rounded-2xl border border-[#fbcfe8] animate-fade-in text-[#0f172a]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#db2777]">
              <LinkIcon className="w-4 h-4" />
              <h3 className="font-extrabold text-sm">Paste Custom Picture Link</h3>
            </div>
            <p className="text-xs text-[#64748b]">
              Have a beautiful picture of your property hosted elsewhere? Paste the image URL address here to fetch and include it in your preview pool immediately.
            </p>
          </div>

          <form onSubmit={handlePasteUrlSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0f172a] block">Direct Image Link Address (URL)</label>
              <input
                type="text"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                placeholder="e.g. https://images.unsplash.com/... or https://mydomain/flat.jpeg"
                className="w-full bg-white border border-[#f1f5f9] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#db2777] focus:ring-0 outline-none font-semibold text-[#0f172a]"
              />
              {pastingError && <p className="text-xs text-red-500 font-semibold">{pastingError}</p>}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <span className="text-[10px] sm:text-xs text-[#64748b] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Fits png, jpeg, gif, webp web files
              </span>
              <button
                type="submit"
                className="bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95"
              >
                Fetch & Select Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- TAB 4: UPLOAD LOCAL FILE --- */}
      {activeTab === 'upload' && (
        <div className="space-y-4 animate-fade-in text-[#0f172a]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#fdf2f8]/40 p-5 rounded-2xl border border-[#fbcfe8]">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#db2777]">
                <Upload className="w-4 h-4" />
                <h3 className="font-extrabold text-sm">Upload Local Device Pictures</h3>
              </div>
              <p className="text-xs text-[#64748b]">
                Select native gallery captures directly from your phone storage or desktop.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-extrabold px-5 py-3 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer select-none shrink-0 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Select Files</span>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </button>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-[#db2777] hover:bg-pink-50/10 cursor-pointer rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3 transition-all select-none active:scale-[0.99]"
          >
            <ImageIcon className="w-8 h-8 text-pink-400/80" />
            <div className="text-xs">
              <p className="font-bold text-[#0f172a]">Tap / Click here to open your device picture gallery</p>
              <p className="text-[10px] text-[#64748b] mt-1">Select and upload your actual house or boarding room photos</p>
            </div>
          </div>

          {/* Render uploaded list immediately within this tab */}
          {customPool.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-[#0f172a] text-xs">Your Uploaded Photos ({customPool.length})</h4>
                <p className="text-[10px] text-[#64748b]">Select photos you want to use for the listing</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {customPool.map((url, idx) => {
                  const isSelected = selected.includes(url);
                  return (
                    <div
                      key={`upload-custom-${idx}`}
                      onClick={() => handleToggle(url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all select-none ${
                        isSelected ? 'border-[#db2777] scale-95 shadow-md' : 'border-[#e2e8f0] hover:border-[#db2777]'
                      }`}
                    >
                      <img
                        alt={`uploaded native capture ${idx}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        src={url}
                      />
                      <div className={`absolute inset-0 bg-black/10 ${isSelected ? 'bg-black/30' : ''}`} />
                      
                      {/* Delete option */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUploaded(url, e)}
                        className="absolute bottom-1.5 right-1.5 p-1 bg-black/75 hover:bg-red-600 hover:text-white text-gray-200 rounded-lg transition-colors border border-white/10 z-10"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#db2777] text-white rounded-full flex items-center justify-center shadow-md border border-white">
                          <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Preview Status Box */}
      {selected.length > 0 ? (
        <div className="p-4 bg-[#fdf2f8] rounded-xl border border-[#fbcfe8] flex items-center justify-between text-xs font-semibold text-[#db2777]">
          <span>You currently have {selected.length} picture(s) selected for this property layout</span>
          <button 
            type="button" 
            onClick={() => setSelected([])}
            className="text-red-500 hover:underline font-bold text-[11px]"
          >
            Clear Selection
          </button>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-between text-xs font-semibold text-yellow-800">
          <span>⚠️ No photos selected yet. Please select at least 1 photo to help searchers.</span>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-[#f1f5f9] px-6 py-4 flex items-center justify-between z-50 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]">
        <button 
          onClick={onCancel}
          className="text-xs sm:text-sm text-[#64748b] font-bold hover:underline"
        >
          Discard
        </button>
        
        <button
          onClick={() => onConfirmSelection(selected)}
          className="bg-[#db2777] hover:bg-[#be185d] text-white text-xs sm:text-sm font-extrabold px-8 py-3 rounded-xl shadow-md transition-all active:scale-95"
        >
          Use ({selected.length}) Selected Photos
        </button>
      </footer>

    </div>
  );
};
