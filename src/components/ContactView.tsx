import React, { useState } from 'react';
import { Mail, Send, User, ChevronRight, CheckCircle, Info } from 'lucide-react';
import { SupportMessage } from '../types';

interface ContactViewProps {
  onSendContact: (msg: Omit<SupportMessage, 'id' | 'createdAt'>) => Promise<boolean>;
  onCancel: () => void;
  userEmail?: string;
  userName?: string;
}

export const ContactView: React.FC<ContactViewProps> = ({
  onSendContact,
  onCancel,
  userEmail = '',
  userName = '',
}) => {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorWord, setErrorWord] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorWord('Please fill in all the required form fields.');
      return;
    }

    setSubmitting(true);
    setErrorWord('');

    try {
      const isSent = await onSendContact({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (isSent) {
        setSuccess(true);
        setSubject('');
        setMessage('');
      } else {
        setErrorWord('Unable to send message. Please try again.');
      }
    } catch (err: any) {
      setErrorWord('System error sending message. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[580px] mx-auto space-y-8 animate-fade-in pt-4 pb-20 px-4 sm:px-0">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ffdad8] text-[#b52330] mb-2">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Contact support & system team</h1>
        <p className="text-xs text-[#5a403f] max-w-sm mx-auto">
          Need help registering a placement list, requesting a refund, or resolving general issues? Contact us anytime.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e4e2e2] shadow-sm">
        {success ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#1b1c1c]">Message Sent!</h2>
              <p className="text-xs text-[#5a403f] max-w-xs mx-auto">
                Thank you for reaching out to us. Your query was logged successfully and has been routed to our Super Admin team dashboard.
              </p>
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={() => setSuccess(false)}
                className="text-xs font-bold text-[#b52330] bg-[#ffdad8]/40 hover:bg-[#ffdad8]/80 py-2.5 px-5 rounded-xl transition-all"
              >
                Send Another
              </button>
              <button
                onClick={onCancel}
                className="text-xs font-bold text-[#5a403f] hover:bg-slate-50 py-2.5 px-5 rounded-xl border border-[#e4e2e2] transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorWord && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex gap-2 items-start">
                <Info className="w-4 h-4 shrink-0 text-[#b52330] mt-0.5" />
                <span>{errorWord}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5a403f] uppercase block">Your Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#9c8483]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Banda"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#fbf9f8] border border-[#e4e2e2] rounded-xl text-xs text-[#1b1c1c] placeholder:text-[#9c8483] focus:outline-none focus:border-[#b52330] transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5a403f] uppercase block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#9c8483]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@banda.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#fbf9f8] border border-[#e4e2e2] rounded-xl text-xs text-[#1b1c1c] placeholder:text-[#9c8483] focus:outline-none focus:border-[#b52330] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5a403f] uppercase block">Subject / Topic</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Question about billing structures"
                className="w-full px-3 py-2.5 bg-[#fbf9f8] border border-[#e4e2e2] rounded-xl text-xs text-[#1b1c1c] placeholder:text-[#9c8483] focus:outline-none focus:border-[#b52330] transition-colors"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5a403f] uppercase block">Your Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your details, account inquiries, or suggestions here..."
                className="w-full px-3 py-2.5 bg-[#fbf9f8] border border-[#e4e2e2] rounded-xl text-xs text-[#1b1c1c] placeholder:text-[#9c8483] focus:outline-none focus:border-[#b52330] transition-colors resize-none"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-between items-center text-[11px] text-[#5a403f]">
              <span className="flex items-center gap-1">
                <span>🛡️</span>
                <span>Replies are sent directly to your email</span>
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto text-xs font-bold text-[#5a403f] border border-[#e4e2e2] hover:bg-slate-50 py-2.5 px-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#b52330] hover:bg-[#9a1c26] disabled:bg-neutral-300 text-white text-xs font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Support FAQ hints */}
      <h3 className="text-xs font-bold text-[#1b1c1c] uppercase tracking-wider text-center pt-2">Zambian support offices</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <h4 className="font-bold text-xs text-[#1b1c1c]">Lusaka East HQ</h4>
          <p className="text-[11px] text-[#5a403f]">Great East Road Campus Plaza, Unit 4</p>
          <p className="text-[10px] text-[#b52330] font-bold">Office: +260 97 7223344</p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <h4 className="font-bold text-xs text-[#1b1c1c]">Copperbelt Branch</h4>
          <p className="text-[11px] text-[#5a403f]">Jambo Drive, Riverside, Kitwe</p>
          <p className="text-[10px] text-[#b52330] font-bold">Hours: Mon-Fri, 08:00 - 17:00</p>
        </div>
      </div>
    </div>
  );
};
