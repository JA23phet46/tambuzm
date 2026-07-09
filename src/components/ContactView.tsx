import React from 'react';
import { Mail, Phone, MessageCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { SupportMessage } from '../types';

interface ContactViewProps {
  onSendContact?: (msg: Omit<SupportMessage, 'id' | 'createdAt'>) => Promise<boolean>;
  onCancel: () => void;
  userEmail?: string;
  userName?: string;
}

export const ContactView: React.FC<ContactViewProps> = ({
  onCancel,
}) => {
  return (
    <div className="max-w-[580px] mx-auto space-y-8 animate-fade-in pt-4 pb-20 px-4 sm:px-0">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ffdad8] text-[#b52330] mb-2 shadow-sm">
          <Mail className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Contact Support & Team</h1>
        <p className="text-xs text-[#5a403f] max-w-sm mx-auto leading-relaxed">
          Need help registering a listing, requesting a refund, or resolving general issues? Reach out to us directly through any channel below.
        </p>
      </div>

      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Email Card */}
        <a
          href="mailto:japhetndafi23@gmail.com"
          className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 rounded-2xl border border-[#e4e2e2] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b52330] flex items-center justify-center border border-red-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#9c8483] uppercase tracking-wider">Email Address</p>
              <p className="text-sm font-black text-[#1b1c1c]">japhetndafi23@gmail.com</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a403f] group-hover:bg-[#b52330] group-hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </a>

        {/* WhatsApp Card */}
        <a
          href="https://wa.me/260974661185?text=Hello%20Tambu%20Support,%20I%20need%20assistance."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 rounded-2xl border border-[#e4e2e2] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#9c8483] uppercase tracking-wider">WhatsApp Support</p>
              <p className="text-sm font-black text-[#1b1c1c]">0974661185</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a403f] group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </a>

        {/* Phone Call Card */}
        <a
          href="tel:0974661185"
          className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 rounded-2xl border border-[#e4e2e2] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#9c8483] uppercase tracking-wider">Direct Phone Call</p>
              <p className="text-sm font-black text-[#1b1c1c]">0974661185</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a403f] group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </a>
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#5a403f] hover:text-[#b52330] py-2 px-4 rounded-xl border border-[#e4e2e2] bg-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery</span>
        </button>
      </div>
    </div>
  );
};
