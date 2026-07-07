import React, { useState } from 'react';
import { Smartphone, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Phone, User, Wallet } from 'lucide-react';

interface CheckoutViewProps {
  userPhone: string;
  onConfirmManualPayment: (reference: string, phone: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  amount?: number;
  reference?: string;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  userPhone,
  onConfirmManualPayment,
  onCancel,
  title = 'Property Monthly Subscription Plan',
  description = 'Manual Mobile Money Payment',
  amount = 100.00,
  reference = 'SUB-' + Math.floor(1000000 + Math.random() * 9000000),
}) => {
  const [phone, setPhone] = useState(userPhone || '097');
  const [txRef, setTxRef] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setError('Please enter your mobile money sender phone number');
      return;
    }
    onConfirmManualPayment(txRef || reference, phone);
  };

  return (
    <div className="max-w-[540px] mx-auto space-y-6 animate-fade-in pt-4 pb-20">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-[#1b1c1c]">Manual Mobile Money Payment</h1>
        <p className="text-xs text-[#5a403f] max-w-md mx-auto leading-relaxed">
          Properties enjoy a <span className="font-extrabold text-[#b52330]">7-day free trial</span>. To keep your listings active, pay your monthly subscription of <span className="font-extrabold">K100</span> manually using the details below.
        </p>
      </div>

      {/* Payment Instructions Card */}
      <div className="bg-[#fdf2f2] rounded-2xl p-6 border-2 border-[#b52330]/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#b52330]/20">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#b52330]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#b52330]">Official Payment Target</span>
          </div>
          <span className="text-base font-black text-[#b52330]">K{amount.toFixed(2)} / mo</span>
        </div>

        <div className="space-y-3 text-xs text-[#1b1c1c]">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-[#e4e2e2]">
            <span className="text-gray-500 font-semibold flex items-center gap-1.5"><Phone className="w-4 h-4 text-[#b52330]" /> Mobile Number:</span>
            <span className="font-mono font-extrabold text-sm sm:text-base text-[#b52330] select-all">0974661185</span>
          </div>

          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-[#e4e2e2]">
            <span className="text-gray-500 font-semibold flex items-center gap-1.5"><User className="w-4 h-4 text-[#b52330]" /> Account Name:</span>
            <span className="font-extrabold text-sm text-[#1b1c1c]">Japhet Ndafi</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
          <span className="font-bold">⚠️ Important Notice:</span> Failure to pay the K100 monthly subscription through <span className="font-mono font-bold">0974661185</span> (Japhet Ndafi) will result in your properties being deleted by the Super Admin during daily compliance checks.
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-5">
        <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#5a403f]">
          Confirm Payment Submission
        </h2>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Your Mobile Money Sender Phone Number</label>
          <div className="relative flex items-center bg-[#f0eded] border border-[#e4e2e2] rounded-xl px-4 py-3.5">
            <span className="text-xs sm:text-sm font-bold text-[#5a403f] mr-2">+260</span>
            <input
              type="text"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm font-semibold placeholder-[#5a403f]/40"
              placeholder="e.g. 0977112233"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1b1c1c] block">Mobile Money Transaction ID or Reference (Optional)</label>
          <input
            type="text"
            value={txRef}
            onChange={(e) => setTxRef(e.target.value)}
            className="w-full bg-[#f0eded] border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#b52330] outline-none font-mono"
            placeholder="e.g. MOMO-91823746"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-[#ffdad8] text-[#b52330] rounded-xl text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 border border-[#e4e2e2] text-[#5a403f] rounded-xl text-xs font-bold hover:bg-[#f5f3f3] active:scale-95 transition-all text-center cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="flex-1 py-3.5 bg-[#b52330] hover:bg-[#9a1c26] text-white rounded-xl text-xs font-extrabold tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            Confirm Manual Payment <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Trust Seal */}
      <div className="flex items-center justify-center gap-2.5 text-[#5a403f]">
        <ShieldCheck className="w-5 h-5 text-[#006c4c]" />
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
          Verified Tambu Manual Mobile Money Escrow Hub
        </span>
      </div>
    </div>
  );
};
