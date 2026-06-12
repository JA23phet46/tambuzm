import React, { useState, useEffect } from 'react';
import { Star, MapPin, Bed, Bath, Shield, Waves, Share2, Heart, Phone, MessageSquare, Compass, Send, Footprints, Check } from 'lucide-react';
import { Property } from '../types';

interface PropertyDetailsViewProps {
  property: Property;
  savedIds: string[];
  isLoggedIn: boolean;
  currentUserName?: string;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onNavigate: (page: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  isAdmin?: boolean;
  onTogglePropertyVerified?: (id: string, currentVerified: boolean) => void;
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  property,
  savedIds,
  isLoggedIn,
  currentUserName = '',
  onToggleSaved,
  onNavigate,
  onShowToast,
  isAdmin = false,
  onTogglePropertyVerified,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [reviews, setReviews] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`tambu_reviews_${property.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [reviewerName, setReviewerName] = useState(currentUserName || '');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [showAddReview, setShowAddReview] = useState(false);

  useEffect(() => {
    if (currentUserName) {
      setReviewerName(currentUserName);
    }
  }, [currentUserName]);

  const formatPrice = (val: any) => {
    if (val === undefined || val === null) return '0';
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString();
  };

  const getWhatsappNumber = (): string => {
    const num = property.ownerWhatsapp || property.ownerPhone || (
      property.ownerName === 'Mwamba Chileshe' ? '+260977629402' : 
      property.ownerName === 'Bwalya Tembo' ? '+260954739211' : 
      property.ownerName === 'Chanda Mukuka' ? '+260979928172' : 
      property.ownerName === 'Misozi Phiri' ? '+260971184910' : 
      '+260965839204'
    );
    return String(num);
  };

  const getWhatsappLink = () => {
    const rawNum = getWhatsappNumber();
    let cleanNum = String(rawNum).replace(/\D/g, '');
    if (cleanNum.startsWith('0') && cleanNum.length === 10) {
      cleanNum = '260' + cleanNum.substring(1);
    } else if (cleanNum.length === 9) {
      cleanNum = '260' + cleanNum;
    }
    const txt = `Hello! I am interested in your property "${property.name}" listed on Tambu.`;
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(txt)}`;
  };

  // Pool of extra sliding images matching real listing content
  const extraImages = (property.photos && property.photos.length > 0)
    ? property.photos
    : [
        property.image,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC0SmoCTgalnRyilaX9XoduzdigMUAcQD6k3jel-uPNOoKi8Wy8Z4ayCperT02cJFgO4lTlqJL21UlCTSwolx3co1ZFK0hKi_U7N4UjRrSW_qzE6NGh8-NID-v-JwREgZusKmP9grvtaHHHHL1MfIelWWcJk0mmt0v8MHwRw_agN3laT_r3vMLyjshgMZOCGsH6mNu6vm8mfKtpfw1ACSOAltT4xmT_Jp1Dcpjeg2Tul1hCGgcAehwCuekExp0dPV_Q48dnV1uJPUc',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC5QU4Npu-ImrtBwszAV4o2RXfuPwxmRT87C7Vc5ufeG5wxAEoA2U9qiNUymjXd-eZW4hOtUdf7-F4hVnt01d8cl7UAkK9rSlkbYRKx0hmF61oYkMywNkmtB8mpnnZVxnG7KHZU04Sj7pxpmoqSv1dH3QV4GQgO5r4kc35Cabmreat2SvxQcQKF6JZCMEXJJslsxyZE8_pwxDbuS1nkwDOwd0tnZdNNemx1DjVPDlyeDvKa69EYxugBV6IIJlNPkqEst1z46GfK17w'
      ];

  const handleNextPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % extraImages.length);
  };

  const handleShare = () => {
    const origin = window.location.origin + window.location.pathname;
    const shareUrl = `${origin}?propertyId=${property.id}`;
    
    const copyFallback = (text: string) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          onShowToast('Direct listing link copied fallback!', 'success');
        } else {
          onShowToast(`Link: ${text}`, 'success');
        }
      } catch (err) {
        onShowToast(`Copied listing link!`, 'success');
      }
      document.body.removeChild(textArea);
    };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            onShowToast('Direct listing link copied to clipboard!', 'success');
          })
          .catch((err) => {
            console.warn('Navigator clipboard failed, using fallback:', err);
            copyFallback(shareUrl);
          });
      } else {
        copyFallback(shareUrl);
      }
    } catch (e) {
      copyFallback(shareUrl);
    }
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      onShowToast('Please type your comment.', 'error');
      return;
    }
    
    const finalName = reviewerName.trim() || 'Anonymous Guest';
    const nameParts = finalName.split(/\s+/).filter(Boolean);
    let initials = 'AG';
    if (nameParts.length > 0) {
      initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }

    const newRev = {
      id: 'rev_' + Date.now(),
      initials,
      name: finalName,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      rating: newRating,
      comment: newComment.trim()
    };
    
    setReviews((prev) => {
      const updated = [newRev, ...prev];
      try {
        localStorage.setItem(`tambu_reviews_${property.id}`, JSON.stringify(updated));
      } catch (err) {
        console.warn("Saving review to localStorage failed", err);
      }
      return updated;
    });
    
    setNewComment('');
    setShowAddReview(false);
    onShowToast('Review successfully submitted!', 'success');
  };

  return (
    <div className="animate-fade-in space-y-8 pb-32">
      {/* Desktop/Tablet Breadcrumb info overlay header */}
      <div className="hidden sm:flex justify-between items-center bg-white p-4 rounded-xl border border-[#e4e2e2] shadow-sm">
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#5a403f]">
          <span>Zambia</span> / <span>Lusaka</span> / <span className="font-bold text-[#b52330]">{property.name}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5a403f] bg-[#f0eded] hover:bg-[#eae8e7] rounded-lg transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-[#b52330]" /> Share
          </button>
          <button 
            onClick={(e) => {
              onToggleSaved(property.id, e);
              onShowToast(savedIds.includes(property.id) ? 'Removed from saved list' : 'Saved to favorites!', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#b52330] hover:bg-[#9a1c26] rounded-lg transition-all active:scale-95 shadow-sm"
          >
            <Heart className={`w-3.5 h-3.5 fill-current ${savedIds.includes(property.id) ? 'text-white' : 'text-white/50'}`} /> 
            {savedIds.includes(property.id) ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Hero Image Slider / Carousel */}
      <section className="relative w-full aspect-[16/10] sm:aspect-[4/3] md:aspect-[21/9] overflow-hidden rounded-2xl border border-[#e4e2e2] bg-[#f0eded] shadow-sm">
        <div className="w-full h-full relative cursor-pointer" onClick={handleNextPhoto}>
          <img
            alt={property.name}
            className="w-full h-full object-cover transition-opacity duration-300"
            referrerPolicy="no-referrer"
            src={extraImages[activePhotoIdx]}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
        </div>

        {/* Carousel Image Index Indicator */}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-bold font-mono">
          {activePhotoIdx + 1} / {extraImages.length}
        </div>

        {/* Floating Verified Badge */}
        {property.verified ? (
          <div 
            onClick={isAdmin ? (e) => {
              e.stopPropagation();
              onTogglePropertyVerified?.(property.id, true);
              onShowToast('Property verification removed successfully.', 'success');
            } : undefined}
            className={`absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md flex items-center gap-1 border border-emerald-150/50 z-10 ${isAdmin ? 'cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 transition-all active:scale-95' : ''}`}
            title={isAdmin ? 'Click to Remove Verification' : 'Verified Property'}
          >
            <Check className="w-4 h-4 text-emerald-600 stroke-[3.5px]" /> Verified Property
          </div>
        ) : (
          isAdmin && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onTogglePropertyVerified?.(property.id, false);
                onShowToast('Property verified successfully.', 'success');
              }}
              className="absolute top-4 left-4 bg-slate-100/90 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 border border-slate-200 cursor-pointer transition-all active:scale-95 z-10"
              title="Click to Verify Property"
            >
              <Check className="w-4 h-4 stroke-[2px]" /> Non-Verified
            </div>
          )
        )}

        {/* Floating Favorite Button on details picture */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSaved(property.id, e);
            onShowToast(savedIds.includes(property.id) ? 'Removed from saved list' : 'Saved to favorites!', 'success');
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center text-[#b52330] shadow-md active:scale-95 transition-transform z-10 border border-slate-100"
          title="Save to Favorites"
        >
          <Heart className={`w-4 h-4 ${savedIds.includes(property.id) ? 'fill-current' : ''}`} />
        </button>
      </section>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header Specs section */}
          <header className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1b1c1c]">
                  {property.name}
                </h1>
                <div className="flex items-center gap-1.5 text-sm text-[#5a403f] mt-1.5">
                  <MapPin className="w-4 h-4 text-[#b52330] shrink-0" />
                  <span>{property.location}</span>
                </div>
                {property.distance && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#b52330] bg-[#ffdad8]/30 border border-[#e2bebc]/40 rounded-lg px-2.5 py-1 w-fit mt-2">
                    <Footprints className="w-4 h-4 shrink-0 text-[#b52330]" />
                    <span>{property.distance}</span>
                  </div>
                )}
              </div>

              {/* Star Rating Badge */}
              <div className="flex items-center gap-1 bg-[#ffdad8] text-[#b52330] px-3 py-1.5 rounded-xl font-bold text-sm shrink-0 border border-[#e2bebc]">
                <Star className="w-4 h-4 fill-current" />
                <span>{property.rating || 4.8}</span>
              </div>
            </div>

            {/* Price block */}
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-[#b52330]">
                ZMW {formatPrice(property.price)}
              </span>
              <span className="text-base text-[#5a403f] font-normal">
                {property.price && Number(property.price) > 100000 ? '/total' : '/month'}
              </span>
            </div>
          </header>

          {/* Key Amenities */}
          <section className="space-y-4 pt-4 border-t border-[#e4e2e2]">
            <h2 className="text-lg font-bold text-[#1b1c1c]">Key Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-[#f0eded] rounded-xl border border-[#e4e2e2]/30 shadow-none">
                <Bed className="text-[#b52330] w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#1b1c1c]">{property.beds} Bedrooms</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#f0eded] rounded-xl border border-[#e4e2e2]/30 shadow-none">
                <Bath className="text-[#b52330] w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#1b1c1c]">{property.baths} Bathrooms</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#f0eded] rounded-xl border border-[#e4e2e2]/30 shadow-none">
                <Waves className="text-[#b52330] w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#1b1c1c]">Pool Access</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#f0eded] rounded-xl border border-[#e4e2e2]/30 shadow-none">
                <Shield className="text-[#b52330] w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#1b1c1c]">24/7 Security</span>
              </div>
            </div>
          </section>

          {/* Detailed Description */}
          <section className="space-y-3 pt-4 border-t border-[#e4e2e2]">
            <h2 className="text-lg font-bold text-[#1b1c1c]">Description</h2>
            <p className="text-sm sm:text-base text-[#5a403f] leading-relaxed whitespace-pre-line">
              {property.description || `Experience the absolute pinnacle of luxury and convenience. Nestled in a key secure location with continuous electricity backups and state-of-the-art infrastructure assets. Fully modern spaces featuring expansive ventilation windows, built-in wardrobes, a fully equipped built-in gas stove, premium marble counters, and fully dedicated property management teams on call.

Perfectly situated to guarantee brief commuting walks to top universities, foreign diplomatic missions, high-end shopping nodes, corporate headquarters, and high-trust medical centers. Residents enjoy access to premium private balconies, manicured gardens, community leisure spots, and deep peace of mind.`}
            </p>
          </section>

          {/* Interactive Reviews Section */}
          <section className="space-y-6 pt-4 border-t border-[#e4e2e2]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1b1c1c]">
                Reviews ({reviews.length})
              </h2>
              <button
                onClick={() => setShowAddReview(!showAddReview)}
                className="text-xs text-[#b52330] font-bold hover:underline"
              >
                {showAddReview ? 'Cancel' : 'Write Review'}
              </button>
            </div>

            {/* Write Review Form */}
            {showAddReview && (
              <form onSubmit={handlePostReview} className="p-4 bg-[#f0eded] rounded-xl border border-[#e4e2e2] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#5a403f] uppercase tracking-wider">Your Name</label>
                    <input
                      type="text"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-[#e4e2e2] rounded-xl focus:border-[#b52330] focus:ring-0 outline-none bg-white placeholder-[#5a403f]/40 font-semibold"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <span className="block text-[10px] font-bold text-[#5a403f] uppercase tracking-wider mb-2">Select Stars</span>
                    <div className="flex gap-1.5 text-[#b52330] py-1">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setNewRating(stars)}
                          className="hover:scale-110 active:scale-95 transition-transform"
                        >
                          <Star className={`w-5 h-5 ${newRating >= stars ? 'fill-[#b52330] text-[#b52330]' : 'text-[#5a403f]/30'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5a403f] uppercase tracking-wider">Your Review</label>
                  <textarea
                    rows={3}
                    value={newComment}
                    required
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tell us what you liked about this place..."
                    className="w-full text-xs sm:text-sm p-3 border border-[#e4e2e2] rounded-xl focus:border-[#b52330] focus:ring-0 outline-none bg-white placeholder-[#5a403f]/40 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ml-auto transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Review
                </button>
              </form>
            )}

            {/* List of reviews */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="py-10 px-4 bg-[#f0eded]/30 rounded-2xl border-2 border-dashed border-[#e4e2e2] text-center space-y-2">
                  <p className="text-xs sm:text-sm text-[#5a403f] font-bold">No reviews yet</p>
                  <p className="text-[11px] text-[#5a403f]/70">Be the first to share your experience with this property!</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-5 bg-white rounded-2xl border border-[#e4e2e2] space-y-3 shadow-none">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8eeff4] text-[#006e72] font-bold flex items-center justify-center text-xs shadow-inner">
                          {rev.initials}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-[#1b1c1c]">{rev.name}</div>
                          <div className="text-[10px] text-[#5a403f]">{rev.date}</div>
                        </div>
                      </div>

                      <div className="flex gap-0.5 text-[#b52330]">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`w-3 h-3 ${idx < rev.rating ? 'fill-current' : ''}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5a403f] leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Interaction Sidebar Widget (Desktop only) */}
        <aside className="lg:col-span-4 space-y-6 hidden lg:block sticky top-24">
          <div className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-md space-y-6">
            
            {/* Map Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1b1c1c] uppercase tracking-wider">Location</h3>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[#e4e2e2] bg-[#f0eded]">
                <img 
                  alt="Location Map Mockup" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqjgJhBFpIaiiuwtt8iloI5sqPwQr7kPgvvSgKid6OY92sYuedM4djvnMgGDhU7KNrV6gCOjdmoe1ali13DzWuXvdr6MRH7G2ktoOZgEzfkaa_-aTZgQ7vQlc8zUYe6jTIMCuNArq_Us_TW2O1JQAiDiljc6SXBnAzLBLrIkUqtvUGbMFJYX4NNINqVYS0QQiqUl9smSS_uRicoyCZKorLkQhlFZFkPFMHB8mtTp2MPLewPKpaDt3ndnd-N8r3go3Uw90jrxPx3k0"
                />
                <div className="absolute inset-0 bg-black/10 hover:bg-black/25 flex items-center justify-center transition-colors pointer-events-none">
                  <div className="bg-white/95 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1b1c1c] flex items-center gap-1.5 shadow-md">
                    <Compass className="w-3.5 h-3.5 text-[#b52330]" /> Interactive Map
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Contact details info */}
            <div className="space-y-4 pt-2 border-t border-[#e4e2e2]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[#e4e2e2] bg-[#f0eded]">
                  <img 
                    alt="Owner avatar portrait" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    src={property.ownerImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0"}
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1b1c1c]">{property.ownerName || 'Lombe Kapambwe'}</div>
                  <div className="text-xs text-[#5a403f]">Verified Account Owner</div>
                </div>
              </div>

              {/* Secure Checkout / Book Appointment CTA button */}
              <div className="pt-2 space-y-3">
                {property.available === false && (
                  <div className="bg-amber-50 border border-amber-250 text-amber-900 p-3 rounded-xl text-xs space-y-1">
                    <p className="font-extrabold flex items-center gap-1 text-[#b52330]">
                      ⚠️ Rent Pending / Occupied
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      This unit is currently reserved or occupied. You can call or chat with the verified account owner below to inquire about future placement release cycles.
                    </p>
                  </div>
                )}

                <button
                  disabled={property.available === false}
                  onClick={() => onNavigate('checkout')}
                  className={`w-full py-3.5 rounded-xl text-sm font-extrabold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
                    property.available !== false
                      ? 'bg-[#b52330] hover:bg-[#9a1c26] text-white active:scale-[0.98]'
                      : 'bg-gray-150 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {property.available !== false ? (isLoggedIn ? `Rent Now (ZMW ${formatPrice(property.price)})` : "Sign In to Rent Now") : 'Occupied / Rent Pending'}
                </button>

                <a
                  href={`tel:${property.ownerPhone || (property.ownerName === 'Mwamba Chileshe' ? '+260977629402' : property.ownerName === 'Bwalya Tembo' ? '+260954739211' : property.ownerName === 'Chanda Mukuka' ? '+260979928172' : property.ownerName === 'Misozi Phiri' ? '+260971184910' : '+260965839204')}`}
                  onClick={() => {
                    const phoneNum = property.ownerPhone || (property.ownerName === 'Mwamba Chileshe' ? '+260977629402' : property.ownerName === 'Bwalya Tembo' ? '+260954739211' : property.ownerName === 'Chanda Mukuka' ? '+260979928172' : property.ownerName === 'Misozi Phiri' ? '+260971184910' : '+260965839204');
                    onShowToast(`Dialing: ${phoneNum}`, 'success');
                  }}
                  className="w-full py-3.5 bg-white border-2 border-[#b52330] text-[#b52330] hover:bg-[#ffdad8]/30 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-center cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-[#b52330]" /> Call Owner: {property.ownerPhone || (property.ownerName === 'Mwamba Chileshe' ? '0977629402' : property.ownerName === 'Bwalya Tembo' ? '0954739211' : property.ownerName === 'Chanda Mukuka' ? '0979928172' : property.ownerName === 'Misozi Phiri' ? '0971184910' : '0965839204')}
                </a>

                <a
                  href={getWhatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-250 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer text-center"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> Chat on WhatsApp
                </a>
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* Sticky Fast-Action Bar (Mobile Only) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-[#fbf9f8] border-t border-[#e4e2e2] px-4 py-3 flex items-center justify-between gap-3 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.1)] pb-safe">
        <div className="flex flex-col pl-1">
          <span className="text-[9px] text-[#5a403f] font-bold uppercase tracking-wider leading-none">Monthly Rent</span>
          <span className="text-sm font-black text-[#b52330] whitespace-nowrap mt-1 leading-none">
            ZMW {formatPrice(property.price)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <a 
            href={`tel:${property.ownerPhone || (property.ownerName === 'Mwamba Chileshe' ? '+260977629402' : property.ownerName === 'Bwalya Tembo' ? '+260954739211' : property.ownerName === 'Chanda Mukuka' ? '+260979928172' : property.ownerName === 'Misozi Phiri' ? '+260971184910' : '+260965839204')}`}
            onClick={() => {
              const phoneNum = property.ownerPhone || (property.ownerName === 'Mwamba Chileshe' ? '+260977629402' : property.ownerName === 'Bwalya Tembo' ? '+260954739211' : property.ownerName === 'Chanda Mukuka' ? '+260979928172' : property.ownerName === 'Misozi Phiri' ? '+260971184910' : '+260965839204');
              onShowToast(`Dialing: ${phoneNum}`, 'success');
            }}
            className="w-10 h-10 bg-white border border-[#e4e2e2] rounded-xl flex items-center justify-center text-[#5a403f] hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            title="Call Owner"
          >
            <Phone className="w-4 h-4 text-[#b52330]" />
          </a>
          
          <a
            href={getWhatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-white border border-[#e4e2e2] rounded-xl flex items-center justify-center text-[#5a403f] hover:bg-[#faf9f9] hover:border-emerald-300 active:scale-95 transition-all shadow-sm"
            title="Chat on WhatsApp"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
          </a>

          <button 
            disabled={property.available === false}
            onClick={() => onNavigate('checkout')}
            className={`flex-1 max-w-[150px] h-10 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1 transition-all ${
              property.available !== false
                ? 'bg-[#b52330] hover:bg-[#9a1c26] text-white active:scale-95 shadow-md'
                : 'bg-gray-150 text-gray-400 cursor-not-allowed'
            }`}
          >
            {property.available !== false ? (isLoggedIn ? 'Rent Now' : 'Sign In to Rent') : 'Occupied'}
          </button>
        </div>
      </div>
    </div>
  );
};
