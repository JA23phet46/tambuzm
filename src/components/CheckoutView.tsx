import React, { useState } from 'react';
import { CreditCard, Smartphone, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface CheckoutViewProps {
  userPhone: string;
  onPayMTN: (phone: string) => void;
  onPayAirtel: (phone: string) => void;
  onPayCard: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  amount?: number;
  reference?: string;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  userPhone,
  onPayMTN,
  onPayAirtel,
  onPayCard,
  onCancel,
  title = 'Property Premium Placement Fee',
  description = 'Flutterwave Reference',
  amount = 100.00,
  reference = 'FLW-9284711',
}) => {
  const [method, setMethod] = useState<'momo' | 'card'>('momo');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [phone, setPhone] = useState(userPhone || '097');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const [cardError, setCardError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'momo') {
      if (!phone || phone.length < 9) {
        setCardError('Please enter a valid phone number');
        return;
      }
      if (provider === 'mtn') {
        onPayMTN(phone);
      } else {
        onPayAirtel(phone);
      }
    } else {
      if (!cardName || !cardNumber || !cardExpiry || !cardCVV) {
        setCardError('All card fields are required');
        return;
      }
      onPayCard();
    }
  };

  return (
    <div className="max-w-[540px] mx-auto space-y-8 animate-fade-in pt-4 pb-20">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-[#1b1c1c]">Flutterwave Secure Checkout</h1>
        <p className="text-xs text-[#5a403f] max-w-sm mx-auto">
          Complete your payment via Flutterwave - licensed with the Bank of Zambia.
        </p>
      </div>

      {/* Transaction Details Card */}
      <div className="bg-[#f0eded] rounded-2xl p-5 border border-[#e4e2e2] space-y-4">
        <div className="flex justify-between items-center text-xs text-[#5a403f] uppercase font-bold tracking-wider">
          <span>Billing Description</span>
          <span>Amount (ZMW)</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-[#1b1c1c]">{title}</div>
            <div className="text-[10px] text-[#5a403f]">Flutterwave Reference: {reference}</div>
          </div>
          <span className="text-lg font-black text-[#b52330]">K{amount.toFixed(2)}</span>
        </div>

        <div className="pt-3 border-t border-[#e4e2e2]/40 flex justify-between items-center text-xs font-semibold text-[#5a403f]">
          <span>Tax (VAT 16%)</span>
          <span>Included</span>
        </div>
      </div>

      {/* Method Select tab toggle view */}
      <div className="grid grid-cols-2 gap-3 bg-white border border-[#e4e2e2] rounded-xl p-1.5 select-none">
        <button
          type="button"
          onClick={() => { setMethod('momo'); setCardError(''); }}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all ${
            method === 'momo' 
              ? 'bg-[#b52330] text-white' 
              : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Mobile Money (Momo)
        </button>

        <button
          type="button"
          onClick={() => { setMethod('card'); setCardError(''); }}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all ${
            method === 'card' 
              ? 'bg-[#b52330] text-white' 
              : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Debit / Credit Card
        </button>
      </div>

      {/* Payment Forms */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#e4e2e2] shadow-sm space-y-6">
        
        {method === 'momo' ? (
          <div className="space-y-6">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#5a403f]">
              Choose Mobile Money Provider
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* MTN Choice */}
              <div
                onClick={() => setProvider('mtn')}
                className={`relative flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
                  provider === 'mtn' 
                    ? 'border-[#FFCC00] bg-[#FFCC00]/5' 
                    : 'border-[#e4e2e2] hover:border-[#8e706f]'
                }`}
              >
                <div className="w-12 h-12 bg-[#FFCC00] rounded-full flex items-center justify-center font-black text-black text-sm shadow-sm select-none">
                  MTN
                </div>
                <span className="text-xs font-extrabold text-[#1b1c1c] mt-3">MTN MoMo</span>
                {provider === 'mtn' && (
                  <CheckCircle2 className="w-4 h-4 text-[#FFCC00] absolute top-2 right-2 fill-current text-white border-none" />
                )}
              </div>

              {/* Airtel Choice */}
              <div
                onClick={() => setProvider('airtel')}
                className={`relative flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
                  provider === 'airtel' 
                    ? 'border-[#E41B17] bg-[#E41B17]/5' 
                    : 'border-[#e4e2e2] hover:border-[#8e706f]'
                }`}
              >
                <div className="w-12 h-12 bg-[#E41B17] rounded-full flex items-center justify-center font-black text-white text-[10px] uppercase shadow-sm select-none">
                  airtel
                </div>
                <span className="text-xs font-extrabold text-[#1b1c1c] mt-3">Airtel Money</span>
                {provider === 'airtel' && (
                  <CheckCircle2 className="w-4 h-4 text-[#E41B17] absolute top-2 right-2 fill-current text-white border-none" />
                )}
              </div>
            </div>

            {/* Mobile Number entry input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1b1c1c] block">Mobile Money Phone Number</label>
              <div className="relative flex items-center bg-[#f0eded] border border-[#e4e2e2] rounded-xl px-4 py-3.5 shadow-none focus-within:border-[#8e706f] transition-all">
                <span className="text-xs sm:text-sm font-bold text-[#5a403f] mr-2">+260</span>
                <input
                  type="text"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs sm:text-sm font-semibold outline-none placeholder-[#5a403f]/40"
                  placeholder="e.g. 0977112233"
                />
              </div>
              <p className="text-[10px] text-[#5a403f]">
                Ensure your wallet has sufficient balance. A premium PIN prompt will appear on your screen once you complete this process.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-[#5a403f] pb-2">
              Card Details
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1b1c1c] block">Cardholder Family Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
                placeholder="e.g. Mwamba Chitembo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1b1c1c] block">Card Number</label>
              <input
                type="text"
                maxLength={19}
                value={cardNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
                  setCardNumber(formatted);
                }}
                className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
                placeholder="4000 1234 5678 9010"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1b1c1c] block">Expiry Date</label>
                <input
                  type="text"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length >= 2) {
                      setCardExpiry(val.slice(0, 2) + '/' + val.slice(2, 4));
                    } else {
                      setCardExpiry(val);
                    }
                  }}
                  className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
                  placeholder="MM/YY"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1b1c1c] block">Security CVV Code</label>
                <input
                  type="password"
                  maxLength={3}
                  value={cardCVV}
                  onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-[#e4e2e2] rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-[#8e706f] focus:ring-0 outline-none"
                  placeholder="123"
                />
              </div>
            </div>
          </div>
        )}

        {cardError && (
          <div className="flex items-center gap-2 p-3.5 bg-[#ffdad8] text-[#b52330] rounded-xl text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{cardError}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 border border-[#e4e2e2] text-[#5a403f] rounded-xl text-xs font-bold hover:bg-[#f5f3f3] active:scale-95 transition-all text-center"
          >
            Cancel Order
          </button>
          
          <button
            type="submit"
            className="flex-1 py-3.5 bg-[#b52330] hover:bg-[#9a1c26] text-white rounded-xl text-xs font-extrabold tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1 shadow-md"
          >
            Authorize ZMW {amount.toFixed(2)} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* PCI DSS trust seal */}
      <div className="flex items-center justify-center gap-2.5 text-[#5a403f]">
        <ShieldCheck className="w-5 h-5 text-[#006c4c]" />
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
          Secured with robust PCI-DSS Tier 1 Level Standards
        </span>
      </div>
    </div>
  );
};
