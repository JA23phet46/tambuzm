import React, { useState, useEffect } from 'react';
import { 
  Home, Search, Heart, User, LogIn, LogOut, Plus, 
  MapPin, Bed, Bath, Phone, MessageSquare, Check, X, Shield, 
  ArrowLeft, Trash2, Edit3, Image as ImageIcon, Upload, 
  LayoutDashboard, Mail, PhoneCall, Building
} from 'lucide-react';
import { Property, Province, PropertyType } from './types';
import { INITIAL_PROPERTIES } from './data';
import { getPropertiesFromSupabase, savePropertyToSupabase, updatePropertyInSupabase, deletePropertyFromSupabase, isSupabaseConfigured, saveCustomSupabaseConfig, clearCustomSupabaseConfig, getCustomSupabaseConfig } from './supabase';

export default function App() {
  // --- Persistent State ---
  const [properties, setProperties] = useState<Property[]>(() => {
    const cached = localStorage.getItem('tambu_properties');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_PROPERTIES;
  });

  // Fetch and poll properties from Supabase so listings sync across all devices for anyone visiting tambuzm.com
  useEffect(() => {
    async function loadProperties() {
      const fetched = await getPropertiesFromSupabase();
      if (fetched && fetched.length > 0) {
        setProperties(prev => {
          const map = new Map();
          fetched.forEach(p => map.set(p.id, p));
          INITIAL_PROPERTIES.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      }
    }

    loadProperties();
    const interval = setInterval(loadProperties, 5000);
    return () => clearInterval(interval);
  }, []);

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const cached = localStorage.getItem('tambu_saved');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tambu_logged_in') === 'true';
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('tambu_user_email') || '';
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('tambu_user_name') || 'Guest User';
  });

  const [currentPage, setCurrentPage] = useState<'discovery' | 'details' | 'saved' | 'admin-dashboard' | 'contact' | 'auth'>('discovery');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(() => {
    const cached = localStorage.getItem('tambu_selected_property');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'All'>('All');
  const [selectedType, setSelectedType] = useState<PropertyType | 'All'>('All');

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  // Add/Edit Property form state (Admin only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newProvince, setNewProvince] = useState<Province>(Province.LUSAKA);
  const [newPrice, setNewPrice] = useState('');
  const [newType, setNewType] = useState<PropertyType>(PropertyType.APARTMENT);
  const [newBeds, setNewBeds] = useState('2');
  const [newBaths, setNewBaths] = useState('2');
  const [newDescription, setNewDescription] = useState('');
  const [newAmenities, setNewAmenities] = useState<string[]>([
    'Continuous Electricity Backup',
    'Borehole Water',
    'Secured Perimeter Wall',
    'Air Conditioning',
    'Modern Kitchen'
  ]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  
  // Multiple photos state
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [newMainImageIndex, setNewMainImageIndex] = useState(0);

  const [newPhone, setNewPhone] = useState('+260977123456');
  const [newWhatsapp, setNewWhatsapp] = useState('+260977123456');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Supabase connection modal state
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tambu_properties', JSON.stringify(properties));
    } catch (e) {
      console.warn('Storage quota exceeded');
    }
  }, [properties]);

  useEffect(() => {
    try {
      localStorage.setItem('tambu_saved', JSON.stringify(savedIds));
    } catch (e) {}
  }, [savedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('tambu_logged_in', String(isLoggedIn));
      localStorage.setItem('tambu_user_email', userEmail);
      localStorage.setItem('tambu_user_name', userName);
    } catch (e) {}
  }, [isLoggedIn, userEmail, userName]);

  useEffect(() => {
    try {
      if (selectedProperty) {
        localStorage.setItem('tambu_selected_property', JSON.stringify(selectedProperty));
      } else {
        localStorage.removeItem('tambu_selected_property');
      }
    } catch (e) {}
  }, [selectedProperty]);

  // Cross-tab storage sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tambu_properties') {
        const cached = localStorage.getItem('tambu_properties');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProperties(parsed);
            }
          } catch (err) {}
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isAdmin = userEmail.toLowerCase() === 'admin@tambu.com';

  // Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    if (authEmail.toLowerCase() === 'admin@tambu.com' && authPassword !== 'Admin2026') {
      showToast('Incorrect master admin password. Use Admin2026', 'error');
      return;
    }

    setIsLoggedIn(true);
    setUserEmail(authEmail);
    setUserName(authEmail.toLowerCase() === 'admin@tambu.com' ? 'System Master Admin' : (authName || authEmail.split('@')[0]));
    showToast('Successfully logged in!');
    setCurrentPage(authEmail.toLowerCase() === 'admin@tambu.com' ? 'admin-dashboard' : 'discovery');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authName) {
      showToast('Please fill in all registration fields', 'error');
      return;
    }
    setIsLoggedIn(true);
    setUserEmail(authEmail);
    setUserName(authName);
    showToast('Account created successfully!');
    setCurrentPage('discovery');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setUserName('Guest User');
    showToast('Logged out successfully');
    setCurrentPage('discovery');
  };

  const toggleSave = (propertyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (savedIds.includes(propertyId)) {
      setSavedIds(savedIds.filter(id => id !== propertyId));
      showToast('Removed from saved properties');
    } else {
      setSavedIds([...savedIds, propertyId]);
      showToast('Saved to your favorites!');
    }
  };

  // Multiple Image Upload handler
  const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newUrls: string[] = [];
      let processed = 0;
      
      Array.from(files as unknown as File[]).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                newUrls.push(dataUrl);
              } catch (err) {
                if (event.target?.result) newUrls.push(event.target.result as string);
              }
            } else {
              if (event.target?.result) newUrls.push(event.target.result as string);
            }
            processed++;
            if (processed === files.length) {
              setNewPhotos(prev => [...prev, ...newUrls]);
              showToast(`Successfully added ${newUrls.length} picture(s)!`);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    if (newPhotos.length <= 1) {
      showToast('A property must have at least one photo', 'error');
      return;
    }
    const updated = newPhotos.filter((_, idx) => idx !== index);
    setNewPhotos(updated);
    if (newMainImageIndex >= updated.length) {
      setNewMainImageIndex(0);
    }
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only the master administrator can list properties.', 'error');
      return;
    }
    if (!newTitle || !newLocation || !newPrice || !newDescription) {
      showToast('Please fill in all required property details.', 'error');
      return;
    }

    const mainImg = newPhotos[newMainImageIndex] || newPhotos[0];

    if (editingId) {
      const updatedFields = {
        name: newTitle,
        location: newLocation,
        province: newProvince,
        price: Number(newPrice),
        type: newType,
        beds: Number(newBeds),
        baths: Number(newBaths),
        image: mainImg,
        photos: newPhotos,
        phone: newPhone,
        whatsapp: newWhatsapp,
        description: newDescription,
        amenities: newAmenities
      };
      updatePropertyInSupabase(editingId, updatedFields);
      const updated = properties.map(p => {
        if (p.id === editingId) {
          return { ...p, ...updatedFields };
        }
        return p;
      });
      setProperties(updated);
      showToast('Property updated successfully!');
      setEditingId(null);
    } else {
      const created: Property = {
        id: 'prop_' + Date.now(),
        name: newTitle,
        location: newLocation,
        province: newProvince,
        price: Number(newPrice),
        type: newType,
        beds: Number(newBeds),
        baths: Number(newBaths),
        image: mainImg,
        photos: newPhotos,
        verified: true,
        featured: true,
        rating: 5.0,
        reviewsCount: 1,
        ownerName: 'Tambu Master Admin',
        ownerPhone: newPhone || '+260977123456',
        ownerWhatsapp: newWhatsapp || '+260977123456',
        description: newDescription,
        distance: 'Prime secure location in ' + newLocation,
        amenities: newAmenities
      };

      savePropertyToSupabase(created);
      const updatedList = [created, ...properties];
      setProperties(updatedList);
      showToast('Property listed successfully with multiple photos!');
    }

    // Reset form
    setNewTitle('');
    setNewLocation('');
    setNewPrice('');
    setNewDescription('');
    setNewAmenities([
      'Continuous Electricity Backup',
      'Borehole Water',
      'Secured Perimeter Wall',
      'Air Conditioning',
      'Modern Kitchen'
    ]);
    setNewPhotos([]);
    setNewMainImageIndex(0);
    setCurrentPage('admin-dashboard');
  };

  const handleStartEdit = (p: Property) => {
    setEditingId(p.id);
    setNewTitle(p.name);
    setNewLocation(p.location);
    setNewProvince(p.province);
    setNewPrice(String(p.price));
    setNewType(p.type);
    setNewBeds(String(p.beds || 2));
    setNewBaths(String(p.baths || 2));
    setNewDescription(p.description || '');
    setNewAmenities(p.amenities || ['Continuous Electricity Backup', 'Borehole Water', 'Secured Perimeter Wall', 'Air Conditioning', 'Modern Kitchen']);
    const pPhotos = p.photos && p.photos.length > 0 ? p.photos : [p.image];
    setNewPhotos(pPhotos);
    setNewMainImageIndex(0);
    setNewPhone(p.ownerPhone || '+260977123456');
    setNewWhatsapp(p.ownerWhatsapp || '+260977123456');
    setCurrentPage('admin-dashboard');
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      deletePropertyFromSupabase(id);
      const filtered = properties.filter(p => p.id !== id);
      setProperties(filtered);
      showToast('Property deleted successfully');
    }
  };

  // Filtered properties for discovery
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.province.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvince = selectedProvince === 'All' || p.province === selectedProvince;
    const matchesType = selectedType === 'All' || p.type === selectedType;
    if (currentPage === 'saved') {
      return savedIds.includes(p.id) && matchesSearch && matchesProvince && matchesType;
    }
    return matchesSearch && matchesProvince && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1b1c1c] font-sans flex flex-col selection:bg-[#b52330] selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#1b1c1c] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 animate-fade-in">
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Professional Header */}
      <header className="bg-white border-b border-[#e4e2e2] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            onClick={() => { setCurrentPage('discovery'); setSelectedProperty(null); setMobileMenuOpen(false); }}
            className="cursor-pointer"
          >
            <span className="text-2xl font-extrabold tracking-tight text-[#1b1c1c] lowercase">tambu</span>
            <span className="block text-[9px] font-semibold text-gray-400 tracking-widest uppercase">Zambia Real Estate</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => { setCurrentPage('discovery'); setSelectedProperty(null); }}
              className={`text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all ${currentPage === 'discovery' ? 'bg-[#1b1c1c] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Listings
            </button>

            <button
              onClick={() => { setCurrentPage('saved'); setSelectedProperty(null); }}
              className={`text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${currentPage === 'saved' ? 'bg-[#1b1c1c] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className={`w-4 h-4 ${savedIds.length > 0 ? 'text-rose-500 fill-current' : ''}`} />
              <span>Saved ({savedIds.length})</span>
            </button>

            <button
              onClick={() => { setCurrentPage('contact'); setSelectedProperty(null); }}
              className={`text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all ${currentPage === 'contact' ? 'bg-[#1b1c1c] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Contact Us
            </button>

            {isAdmin && (
              <button
                onClick={() => { setEditingId(null); setCurrentPage('admin-dashboard'); }}
                className={`text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${currentPage === 'admin-dashboard' ? 'bg-[#b52330] text-white' : 'bg-rose-50 text-[#b52330] hover:bg-rose-100'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#1b1c1c]">{userName}</div>
                  <div className="text-[10px] font-medium text-gray-500">{isAdmin ? 'Master Admin' : userEmail}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentPage('auth')}
                className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login / Sign Up</span>
              </button>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => { setCurrentPage('saved'); setSelectedProperty(null); }}
              className="p-2.5 bg-gray-100 rounded-xl text-gray-700 relative"
            >
              <Heart className={`w-4 h-4 ${savedIds.length > 0 ? 'text-rose-500 fill-current' : ''}`} />
              {savedIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#b52330] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {savedIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-800 transition-all"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <div className="space-y-1 w-5"><div className="w-full h-0.5 bg-gray-800"></div><div className="w-full h-0.5 bg-gray-800"></div><div className="w-full h-0.5 bg-gray-800"></div></div>}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#e4e2e2] px-4 py-4 space-y-3 animate-fade-in shadow-xl">
            <button
              onClick={() => { setCurrentPage('discovery'); setSelectedProperty(null); setMobileMenuOpen(false); }}
              className={`w-full text-left text-xs font-bold px-4 py-3 rounded-xl transition-all ${currentPage === 'discovery' ? 'bg-[#1b1c1c] text-white' : 'bg-gray-50 text-gray-700'}`}
            >
              Listings
            </button>
            <button
              onClick={() => { setCurrentPage('saved'); setSelectedProperty(null); setMobileMenuOpen(false); }}
              className={`w-full text-left text-xs font-bold px-4 py-3 rounded-xl transition-all flex items-center justify-between ${currentPage === 'saved' ? 'bg-[#1b1c1c] text-white' : 'bg-gray-50 text-gray-700'}`}
            >
              <span>Saved Properties</span>
              <span className="bg-rose-500 text-white px-2 py-0.5 rounded-md text-[10px]">{savedIds.length}</span>
            </button>
            <button
              onClick={() => { setCurrentPage('contact'); setSelectedProperty(null); setMobileMenuOpen(false); }}
              className={`w-full text-left text-xs font-bold px-4 py-3 rounded-xl transition-all ${currentPage === 'contact' ? 'bg-[#1b1c1c] text-white' : 'bg-gray-50 text-gray-700'}`}
            >
              Contact Us
            </button>
            {isAdmin && (
              <button
                onClick={() => { setEditingId(null); setCurrentPage('admin-dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left text-xs font-bold px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${currentPage === 'admin-dashboard' ? 'bg-[#b52330] text-white' : 'bg-rose-50 text-[#b52330]'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}
            {isLoggedIn ? (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1b1c1c]">{userName}</div>
                  <div className="text-[10px] text-gray-500">{isAdmin ? 'Master Admin' : userEmail}</div>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setCurrentPage('auth'); setMobileMenuOpen(false); }}
                className="w-full bg-[#b52330] text-white text-xs font-bold py-3 rounded-xl shadow-md text-center"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW: AUTHENTICATION */}
        {currentPage === 'auth' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-[#e4e2e2] shadow-xl my-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#b52330]/10 text-[#b52330] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1b1c1c]">
                {authMode === 'login' ? 'Welcome Back to tambu' : 'Create Account'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {authMode === 'login' ? 'Sign in to access your saved properties & contact owners' : 'Register to connect with home owners instantly'}
              </p>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'login' ? 'bg-white text-[#1b1c1c] shadow-xs' : 'text-gray-500'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'register' ? 'bg-white text-[#1b1c1c] shadow-xs' : 'text-gray-500'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Mwansa Chanda"
                    className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com (admin@tambu.com for admin)"
                  className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                />
                {authMode === 'login' && (
                  <p className="text-[11px] text-gray-400 mt-1">Master Admin demo: admin@tambu.com / Admin2026</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-3.5 rounded-xl shadow-md transition-all mt-4"
              >
                {authMode === 'login' ? 'Login to tambu' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentPage('discovery')}
                className="text-xs font-semibold text-gray-500 hover:text-[#1b1c1c]"
              >
                ← Back to Browse Listings
              </button>
            </div>
          </div>
        )}

        {/* VIEW: CONTACT US */}
        {currentPage === 'contact' && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in pb-16">
            <div className="bg-[#1b1c1c] text-white p-8 sm:p-12 rounded-3xl shadow-xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">Contact Us</h2>
              <p className="text-xs sm:text-sm text-gray-300 mt-2">
                Get in touch with us directly via phone call or WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <a
                href="tel:+260974661185"
                className="bg-white p-8 rounded-3xl border border-[#e4e2e2] shadow-sm hover:border-[#b52330] hover:shadow-md transition-all text-center space-y-4 group block"
              >
                <div className="w-14 h-14 bg-rose-50 text-[#b52330] rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Phone className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1b1c1c]">Call Us</h3>
                  <p className="text-sm font-semibold text-gray-600 mt-1">+260 974 661 185</p>
                </div>
                <span className="inline-block text-xs font-bold text-[#b52330]">Tap to call &rarr;</span>
              </a>

              <a
                href="https://wa.me/260974661185"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-8 rounded-3xl border border-[#e4e2e2] shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center space-y-4 group block"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1b1c1c]">WhatsApp</h3>
                  <p className="text-sm font-semibold text-gray-600 mt-1">+260 974 661 185</p>
                </div>
                <span className="inline-block text-xs font-bold text-emerald-600">Tap to chat &rarr;</span>
              </a>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {currentPage === 'admin-dashboard' && isAdmin && (
          <div className="space-y-8 animate-fade-in pb-16">
            <div className="bg-[#1b1c1c] text-white p-8 sm:p-10 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold bg-[#b52330] text-white px-3 py-1 rounded-xl uppercase tracking-wider">
                  Master Admin Portal
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Property Management & Image Upload</h2>
                <p className="text-xs text-gray-300 mt-1">Upload multiple photos at once, set cover images, edit details, or remove active listings instantly.</p>
              </div>
              <button
                onClick={() => {
                  setEditingId(null);
                  setNewTitle('');
                  setNewLocation('');
                  setNewPrice('');
                  setNewDescription('');
                  setNewPhotos([]);
                  setNewMainImageIndex(0);
                }}
                className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Listing Form</span>
              </button>
            </div>

            {/* Supabase Status Banner */}
            <div className={`p-5 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${isSupabaseConfigured() ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <span className="font-bold">{isSupabaseConfigured() ? 'Supabase Cloud Database Connected: ' : 'Local Cache Mode (Supabase Not Connected): '}</span>
                  <span>{isSupabaseConfigured() ? 'Listings are syncing across all devices in real-time.' : 'Listings are currently saving to local browser storage only. Click "Connect Supabase" to link your database keys instantly.'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const current = getCustomSupabaseConfig();
                  if (current) {
                    setCustomSupabaseUrl(current.url);
                    setCustomSupabaseKey(current.key);
                  }
                  setShowSupabaseModal(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${isSupabaseConfigured() ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'}`}
              >
                {isSupabaseConfigured() ? 'Manage Supabase Keys' : 'Connect Supabase Now'}
              </button>
            </div>

            {/* Supabase Connection Modal */}
            {showSupabaseModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Configure Supabase Database</h3>
                    <button
                      onClick={() => setShowSupabaseModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                    Enter your Supabase Project URL and Anon (Public) Key below. Once connected, all property listings and database updates will sync directly to your Supabase cloud database instead of local storage.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Supabase URL</label>
                      <input
                        type="text"
                        placeholder="https://your-project-id.supabase.co"
                        value={customSupabaseUrl}
                        onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                        className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b52330]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Supabase Anon Key</label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={customSupabaseKey}
                        onChange={(e) => setCustomSupabaseKey(e.target.value)}
                        className="w-full text-xs px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b52330]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        clearCustomSupabaseConfig();
                        setCustomSupabaseUrl('');
                        setCustomSupabaseKey('');
                        setShowSupabaseModal(false);
                        window.location.reload();
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                    >
                      Disconnect / Clear
                    </button>
                    <button
                      onClick={() => {
                        if (customSupabaseUrl && customSupabaseKey) {
                          saveCustomSupabaseConfig(customSupabaseUrl, customSupabaseKey);
                          setShowSupabaseModal(false);
                          window.location.reload();
                        } else {
                          alert('Please enter both Supabase URL and Anon Key.');
                        }
                      }}
                      className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add / Edit Property Form with Multiple Image Upload */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#e4e2e2] shadow-xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-[#1b1c1c]">
                  {editingId ? 'Edit Property Listing' : 'List New Property (Multiple Photos Supported)'}
                </h3>
                {editingId && (
                  <button
                    onClick={() => { setEditingId(null); setNewTitle(''); }}
                    className="text-xs font-bold text-gray-500 hover:text-[#b52330]"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProperty} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Property Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Olympic Luxury Villa"
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Location / Neighborhood</label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Rhodes Park, Lusaka"
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Province</label>
                    <select
                      value={newProvince}
                      onChange={(e) => setNewProvince(e.target.value as Province)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                    >
                      {Object.values(Province).map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Property Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as PropertyType)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                    >
                      {Object.values(PropertyType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Price (ZMW / Month)</label>
                    <input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="e.g. 8500"
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Bedrooms</label>
                    <input
                      type="number"
                      value={newBeds}
                      onChange={(e) => setNewBeds(e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Bathrooms</label>
                    <input
                      type="number"
                      value={newBaths}
                      onChange={(e) => setNewBaths(e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c]"
                    />
                  </div>
                </div>

                {/* Amenities Manager */}
                <div className="space-y-3 bg-[#f8f9fa] p-6 rounded-3xl border border-[#e4e2e2]">
                  <label className="block text-xs font-bold text-[#1b1c1c] uppercase tracking-wider">Property Amenities & Features</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customAmenityInput}
                      onChange={(e) => setCustomAmenityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customAmenityInput.trim() && !newAmenities.includes(customAmenityInput.trim())) {
                            setNewAmenities([...newAmenities, customAmenityInput.trim()]);
                            setCustomAmenityInput('');
                          }
                        }
                      }}
                      placeholder="e.g. Swimming Pool, Solar Power, Fiber WiFi..."
                      className="flex-1 bg-white border border-[#e4e2e2] rounded-xl px-4 py-2.5 text-xs font-medium text-[#1b1c1c]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customAmenityInput.trim() && !newAmenities.includes(customAmenityInput.trim())) {
                          setNewAmenities([...newAmenities, customAmenityInput.trim()]);
                          setCustomAmenityInput('');
                        }
                      }}
                      className="bg-[#1b1c1c] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newAmenities.map((amenity, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-white border border-[#e4e2e2] px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 shadow-xs">
                        <span>{amenity}</span>
                        <button
                          type="button"
                          onClick={() => setNewAmenities(newAmenities.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-rose-600 font-bold ml-1 text-sm leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Multiple Images Upload & Gallery */}
                <div className="space-y-4 bg-[#f8f9fa] p-6 rounded-3xl border border-[#e4e2e2]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1b1c1c] uppercase tracking-wider">Property Photo Gallery ({newPhotos.length} uploaded)</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Select multiple pictures at once. Click any picture to set as main cover photo.</p>
                    </div>
                    <label className="bg-[#1b1c1c] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload Multiple Pictures</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {newPhotos.map((photoUrl, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setNewMainImageIndex(idx)}
                        className={`relative h-28 rounded-2xl overflow-hidden border-2 cursor-pointer group transition-all ${newMainImageIndex === idx ? 'border-[#b52330] shadow-md ring-2 ring-[#b52330]/20' : 'border-gray-200'}`}
                      >
                        <img src={photoUrl} alt={`Upload ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {newMainImageIndex === idx && (
                          <div className="absolute top-2 left-2 bg-[#b52330] text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                            Cover Photo
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Contact Phone</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
                    <input
                      type="text"
                      value={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-medium text-[#1b1c1c]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the property features, security, power backup..."
                    className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl p-4 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingId ? 'Save Changes' : 'Publish Listing to tambu'}</span>
                </button>
              </form>
            </div>

            {/* Existing Properties Grid */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#e4e2e2] shadow-xl space-y-6">
              <h3 className="text-lg font-bold text-[#1b1c1c]">Manage All Listings ({properties.length})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(p => (
                  <div key={p.id} className="bg-[#f8f9fa] rounded-2xl overflow-hidden border border-[#e4e2e2] flex flex-col justify-between">
                    <div>
                      <div className="relative h-44 w-full">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          {p.type}
                        </div>
                        {p.photos && p.photos.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                            📷 {p.photos.length} photos
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="text-xs font-bold text-gray-500">{p.location}, {p.province}</div>
                        <h4 className="text-sm font-bold text-[#1b1c1c] line-clamp-1">{p.name}</h4>
                        <div className="text-sm font-extrabold text-[#b52330]">ZMW {p.price.toLocaleString()} /mo</div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="flex-1 bg-white hover:bg-gray-100 text-[#1b1c1c] text-xs font-bold py-2.5 rounded-xl border border-[#e4e2e2] shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(p.id)}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2.5 rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PROPERTY DETAILS */}
        {currentPage === 'details' && selectedProperty && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
            <button
              onClick={() => { setCurrentPage('discovery'); setSelectedProperty(null); }}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#1b1c1c] bg-white border border-[#e4e2e2] px-4 py-2.5 rounded-xl shadow-xs transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Listings</span>
            </button>

            {/* Image gallery with multiple photo thumbnails */}
            <div className="bg-white rounded-3xl overflow-hidden border border-[#e4e2e2] shadow-xl">
              <div className="relative h-[380px] sm:h-[480px] w-full bg-gray-900">
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={(e) => toggleSave(selectedProperty.id, e)}
                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:bg-white transition-all text-[#b52330]"
                  >
                    <Heart className={`w-5 h-5 ${savedIds.includes(selectedProperty.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
                {selectedProperty.verified && (
                  <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>tambu Verified</span>
                  </div>
                )}
              </div>

              {/* Thumbnail strip if multiple photos exist */}
              {selectedProperty.photos && selectedProperty.photos.length > 1 && (
                <div className="flex gap-2 p-4 bg-gray-100 overflow-x-auto border-b border-[#e4e2e2]">
                  {selectedProperty.photos.map((photoUrl, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedProperty({ ...selectedProperty, image: photoUrl });
                      }}
                      className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${selectedProperty.image === photoUrl ? 'border-[#b52330] scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={photoUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e2e2] pb-6">
                  <div>
                    <span className="text-xs font-bold px-3 py-1 bg-[#b52330]/10 text-[#b52330] rounded-lg">
                      {selectedProperty.type}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1b1c1c] mt-2">{selectedProperty.name}</h2>
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#b52330]" />
                      <span>{selectedProperty.location}, {selectedProperty.province} Province</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#b52330]">
                      ZMW {selectedProperty.price.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-gray-500">per month / inclusive</div>
                  </div>
                </div>

                {/* Key features grid */}
                <div className="grid grid-cols-3 gap-4 bg-[#f8f9fa] p-4 rounded-2xl border border-[#e4e2e2]/60 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Bedrooms</div>
                    <div className="text-sm font-bold text-[#1b1c1c] mt-0.5">{selectedProperty.beds} Beds</div>
                  </div>
                  <div className="border-x border-[#e4e2e2]">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Bathrooms</div>
                    <div className="text-sm font-bold text-[#1b1c1c] mt-0.5">{selectedProperty.baths} Baths</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Area</div>
                    <div className="text-sm font-bold text-[#1b1c1c] mt-0.5">{selectedProperty.sqm || 75} sqm</div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-bold text-[#1b1c1c] uppercase tracking-wider mb-2">About Property</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {selectedProperty.description || 'Experience ultimate comfort and convenience in this secure, fully verified Zambian property. Features uninterrupted power backup solutions, high-speed borehole water access, spacious modern rooms, and dedicated professional management.'}
                  </p>
                </div>

                {/* Amenities */}
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-[#1b1c1c] uppercase tracking-wider mb-3">Amenities & Infrastructure</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e4e2e2] px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Owner Action Box */}
                <div className="bg-[#1b1c1c] text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                  <div>
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Property Owner / Manager</div>
                    <div className="text-lg font-bold text-white mt-0.5">{selectedProperty.ownerName || 'tambu Verified Owner'}</div>
                    <p className="text-xs text-gray-400 mt-1">Contact directly via WhatsApp or Phone to schedule a viewing or secure lease.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <a
                      href={`https://wa.me/${(selectedProperty.ownerWhatsapp || selectedProperty.ownerPhone || '+260977123456').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I am interested in your property "${selectedProperty.name}" listed on tambu.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Owner</span>
                    </a>
                    <a
                      href={`tel:${selectedProperty.ownerPhone || '+260977123456'}`}
                      className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-[#1b1c1c] text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-[#b52330]" />
                      <span>Call Now</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW: DISCOVERY & SAVED LISTINGS */}
        {(currentPage === 'discovery' || currentPage === 'saved') && (
          <div className="space-y-6 sm:space-y-8">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-[#1b1c1c] via-[#2c2d2e] to-[#1b1c1c] text-white p-6 sm:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden border border-white/10">
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#b52330]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-3 max-w-xl text-center md:text-left relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Zambia's #1 Real Estate Portal
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  {currentPage === 'saved' ? 'Your Saved Favorites' : 'Find Your Perfect Home in Zambia'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {currentPage === 'saved' 
                    ? 'Review and manage your shortlisted properties across Lusaka, Copperbelt, and Livingstone.'
                    : 'Verified apartments, houses, and student housing with reliable electricity and water backups.'}
                </p>
              </div>

              {!isLoggedIn && currentPage === 'discovery' && (
                <div className="bg-white/15 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-white/20 text-center max-w-sm w-full relative z-10 shadow-lg">
                  <h3 className="text-xs sm:text-sm font-bold text-white mb-1">Create an Account</h3>
                  <p className="text-[11px] text-gray-300 mb-3.5">Save favorites and connect instantly with home owners.</p>
                  <button
                    onClick={() => setCurrentPage('auth')}
                    className="w-full bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all"
                  >
                    Login / Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e4e2e2] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by location, neighborhood, title..."
                  className="w-full bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl pl-11 pr-4 py-3 text-xs font-medium text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value as any)}
                  className="bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                >
                  <option value="All">All Provinces</option>
                  {Object.values(Province).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="bg-[#f8f9fa] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:border-[#b52330]"
                >
                  <option value="All">All Property Types</option>
                  {Object.values(PropertyType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Properties Grid */}
            {filteredProperties.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-[#e4e2e2] space-y-4 shadow-sm my-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <Home className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#1b1c1c]">No properties found</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {currentPage === 'saved' ? 'You have not saved any properties to your favorites yet.' : 'Try adjusting your search criteria or province filters.'}
                </p>
                {currentPage === 'saved' && (
                  <button
                    onClick={() => setCurrentPage('discovery')}
                    className="bg-[#b52330] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md"
                  >
                    Browse Listings
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    onClick={() => { setSelectedProperty(property); setCurrentPage('details'); }}
                    className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#e4e2e2] shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-36 sm:h-60 w-full overflow-hidden bg-gray-100">
                        <img
                          src={property.image}
                          alt={property.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#1b1c1c]/80 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl">
                          {property.type}
                        </div>
                        <button
                          onClick={(e) => toggleSave(property.id, e)}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 sm:p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-md text-[#b52330] hover:scale-110 transition-all"
                        >
                          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${savedIds.includes(property.id) ? 'fill-current' : ''}`} />
                        </button>
                        {property.verified && (
                          <div className="hidden sm:flex absolute bottom-3 left-3 bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span>Verified</span>
                          </div>
                        )}
                        {property.photos && property.photos.length > 1 && (
                          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/70 backdrop-blur-md text-white text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-md">
                            📷 {property.photos.length}
                          </div>
                        )}
                      </div>

                      <div className="p-3 sm:p-6 space-y-2 sm:space-y-4">
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#b52330] shrink-0" />
                            <span className="truncate">{property.location}, {property.province}</span>
                          </div>
                          <h3 className="text-xs sm:text-base font-bold text-[#1b1c1c] mt-0.5 sm:mt-1 group-hover:text-[#b52330] transition-colors line-clamp-1">
                            {property.name}
                          </h3>
                        </div>

                        <div className="hidden sm:flex items-center gap-4 pt-3 border-t border-gray-100 text-xs font-semibold text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Bed className="w-4 h-4 text-gray-400" />
                            <span>{property.beds} Beds</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Bath className="w-4 h-4 text-gray-400" />
                            <span>{property.baths} Baths</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Home className="w-4 h-4 text-gray-400" />
                            <span>{property.sqm || 75} sqm</span>
                          </div>
                        </div>

                        {/* Mobile summary badge */}
                        <div className="flex sm:hidden items-center gap-2 text-[10px] font-bold text-gray-500 pt-1">
                          <span>{property.beds} beds</span>
                          <span>•</span>
                          <span>{property.baths} baths</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 sm:p-6 pt-0 flex items-center justify-between border-t border-gray-100 mt-2 sm:mt-0">
                      <div>
                        <div className="text-[9px] sm:text-xs text-gray-400 font-medium">Rent Price</div>
                        <div className="text-xs sm:text-lg font-extrabold text-[#1b1c1c]">
                          ZMW {property.price.toLocaleString()} <span className="hidden sm:inline text-xs font-normal text-gray-500">/mo</span>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block text-xs font-bold text-[#b52330] bg-[#b52330]/10 px-3 py-2 rounded-xl group-hover:bg-[#b52330] group-hover:text-white transition-all">
                        View Details →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e4e2e2] mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#1b1c1c] lowercase text-sm">tambu</span>
            <span>Real Estate Portal © 2026 Zambia. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Tambu Trust & Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
