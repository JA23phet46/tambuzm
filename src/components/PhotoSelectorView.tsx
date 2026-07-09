import React, { useState, useRef } from 'react';
import { 
  Check, 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Link as LinkIcon, 
  HelpCircle 
} from 'lucide-react';

interface PhotoSelectorViewProps {
  initialSelected: string[];
  onConfirmSelection: (selected: string[]) => void;
  onCancel: () => void;
}

type SelectorTab = 'upload' | 'link';

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

    setCustomPool((prev) => {
      const updated = [cleanUrl, ...prev];
      try {
        localStorage.setItem('tambu_custom_uploads', JSON.stringify(updated));
      } catch (err) {
        console.warn("Storage quota exceeded:", err);
      }
      return updated;
    });
    setSelected((prev) => [...prev, cleanUrl]);
    setPastedUrl('');
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

        const img = new Image();
        img.src = resultString;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 2560;

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
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.98);

            setCustomPool((prev) => {
              const updated = [compressedBase64, ...prev].slice(0, 20);
              try {
                localStorage.setItem('tambu_custom_uploads', JSON.stringify(updated));
              } catch (err) {
                console.warn("Storage quota exceeded:", err);
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
          setCustomPool((prev) => [resultString, ...prev].slice(0, 20));
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
      console.warn("Storage write failed:", err);
    }
    setSelected(selected.filter((item) => item !== url));
  };

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
            <p className="text-xs text-[#64748b]">Upload your own property photos or add image web links</p>
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
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'upload' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Files from Device</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'link' 
              ? 'bg-white text-[#db2777] shadow-sm' 
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Paste Image URL Link</span>
        </button>
      </div>

      {/* --- TAB: UPLOAD LOCAL FILE --- */}
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

          {/* Render uploaded list */}
          {customPool.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-[#0f172a] text-xs">Your Uploaded Photos ({customPool.length})</h4>
                <p className="text-[10px] text-[#64748b]">Click photos to select or deselect for your listing</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
                        alt={`uploaded capture ${idx}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        src={url}
                      />
                      <div className={`absolute inset-0 bg-black/10 ${isSelected ? 'bg-black/30' : ''}`} />
                      
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

      {/* --- TAB: PASTE WEB IMAGE LINK --- */}
      {activeTab === 'link' && (
        <div className="space-y-5 bg-[#fdf2f8]/40 p-5 rounded-2xl border border-[#fbcfe8] animate-fade-in text-[#0f172a]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#db2777]">
              <LinkIcon className="w-4 h-4" />
              <h3 className="font-extrabold text-sm">Paste Custom Picture Link</h3>
            </div>
            <p className="text-xs text-[#64748b]">
              Have a picture of your property hosted elsewhere? Paste the direct image URL address here.
            </p>
          </div>

          <form onSubmit={handlePasteUrlSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0f172a] block">Direct Image Link Address (URL)</label>
              <input
                type="text"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                placeholder="e.g. https://mydomain/flat.jpeg"
                className="w-full bg-white border border-[#f1f5f9] rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:border-[#db2777] focus:ring-0 outline-none font-semibold text-[#0f172a]"
              />
              {pastingError && <p className="text-xs text-red-500 font-semibold">{pastingError}</p>}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <span className="text-[10px] sm:text-xs text-[#64748b] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Supports png, jpeg, webp files
              </span>
              <button
                type="submit"
                className="bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95"
              >
                Add Link
              </button>
            </div>
          </form>

          {customPool.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h4 className="font-extrabold text-xs text-[#0f172a]">Added Web Photos ({customPool.length})</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {customPool.map((url, idx) => {
                  const isSelected = selected.includes(url);
                  return (
                    <div
                      key={`link-custom-${idx}`}
                      onClick={() => handleToggle(url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all select-none ${
                        isSelected ? 'border-[#db2777] scale-95 shadow-md' : 'border-[#e2e8f0]'
                      }`}
                    >
                      <img src={url} alt={`link ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#db2777] text-white rounded-full flex items-center justify-center shadow-md">
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
          <span>You currently have {selected.length} picture(s) selected for this property</span>
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
          <span>⚠️ No photos selected yet. Please upload or add at least 1 photo.</span>
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
