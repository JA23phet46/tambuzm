import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Building2, User, CheckCheck, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { Property, UserRole } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'seeker' | 'owner';
  senderName: string;
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string;
  seekerId: string;
  seekerName: string;
  ownerId: string;
  ownerName: string;
  lastMessage: string;
  messages: ChatMessage[];
  createdAt?: string;
}

interface ChatViewProps {
  activeProperty: Property | null;
  currentUserRole: UserRole;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserId: string;
  onBack: () => void;
  isAdmin?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeProperty,
  currentUserRole,
  currentUserName,
  currentUserEmail = '',
  currentUserId,
  onBack,
  isAdmin = false,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state refs to prevent real-time listeners from referencing stale closures
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const activeSessionIdRef = useRef<string>('');
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Initialize and synchronise state reactively using real-time Firestore listeners
  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith('demo_')) {
      // Static Offline / Local Fallback for Demo accounts
      const loadLocalSessions = () => {
        const cached = localStorage.getItem('tambu_chat_sessions');
        let sessionList: ChatSession[] = [];
        if (cached) {
          try {
            sessionList = JSON.parse(cached);
            if (!Array.isArray(sessionList)) {
              sessionList = [];
            }
          } catch (_) {
            sessionList = [];
          }
        }
        return sessionList;
      };

      let sessionList = loadLocalSessions();

      if (activeProperty) {
        const chatId = `chat_${activeProperty.id}_${currentUserId.replace(/[^a-zA-Z0-9_\-]/g, '')}`;
        const existingIdx = sessionList.findIndex((s) => s.id === chatId || s.propertyId === activeProperty.id);
        
        if (existingIdx === -1) {
          const newSession: ChatSession = {
            id: chatId,
            propertyId: activeProperty.id,
            propertyName: activeProperty.name,
            propertyImage: activeProperty.image,
            seekerId: currentUserId || 'demo_seeker',
            seekerName: currentUserName,
            ownerId: activeProperty.ownerId || 'demo_owner123',
            ownerName: activeProperty.ownerName || 'Mwamba Chileshe',
            lastMessage: 'Let’s talk about the property specs!',
            messages: [
              {
                id: 'msg_welcome_' + Date.now(),
                senderId: activeProperty.ownerId || 'demo_owner123',
                senderRole: 'owner',
                senderName: activeProperty.ownerName || 'Mwamba Chileshe',
                text: `Hello! Thanks for your interest in "${activeProperty.name}". How can I help you today? Ask me about the rent, security deposit, or water and power backup!`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            ],
            createdAt: new Date().toISOString()
          };
          sessionList = [newSession, ...sessionList];
          localStorage.setItem('tambu_chat_sessions', JSON.stringify(sessionList));
          setActiveSessionId(newSession.id);
        } else {
          setActiveSessionId(sessionList[existingIdx].id);
        }
      } else if (sessionList.length > 0 && !activeSessionIdRef.current) {
        setActiveSessionId(sessionList[0].id);
      }

      setSessions(sessionList);

      // Listen for window storage updates (triggers on other open tabs on same browser/origin)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'tambu_chat_sessions') {
          const updated = loadLocalSessions();
          setSessions(updated);
        }
      };

      // Periodic check handler (triggers on same tab role transitions & instant cross-UI updates safely)
      const pollInterval = setInterval(() => {
        const updated = loadLocalSessions();
        const curSessions = sessionsRef.current;
        let changed = false;

        if (updated.length !== curSessions.length) {
          changed = true;
        } else {
          for (let i = 0; i < updated.length; i++) {
            const u = updated[i];
            const matching = curSessions.find((s) => s.id === u.id);
            if (!matching) {
              changed = true;
              break;
            }
            if (u.messages.length !== matching.messages.length) {
              changed = true;
              break;
            }
            if (u.lastMessage !== matching.lastMessage) {
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          setSessions(updated);
          const curActiveId = activeSessionIdRef.current;
          if (updated.length > 0 && !curActiveId) {
            setActiveSessionId(updated[0].id);
          }
        }
      }, 1000);

      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(pollInterval);
      };
    }

    // REAL FIREBASE PIPELINE
    // 1. If activeProperty details trigger is loaded, provision core chat session document
    if (activeProperty) {
      const chatId = `chat_${activeProperty.id}_${currentUserId.replace(/[^a-zA-Z0-9_\-]/g, '')}`;
      const firstSession: ChatSession = {
        id: chatId,
        propertyId: activeProperty.id,
        propertyName: activeProperty.name,
        propertyImage: activeProperty.image,
        seekerId: currentUserId,
        seekerName: currentUserName,
        ownerId: activeProperty.ownerId || 'demo_owner123',
        ownerName: activeProperty.ownerName || 'Mwamba Chileshe',
        lastMessage: 'Let’s talk about the property specs!',
        messages: [
          {
            id: 'msg_welcome_' + Date.now(),
            senderId: activeProperty.ownerId || 'demo_owner123',
            senderRole: 'owner',
            senderName: activeProperty.ownerName || 'Mwamba Chileshe',
            text: `Hello! Thanks for your interest in "${activeProperty.name}". How can I help you today? Ask me about the rent, security deposit, or water and power backup!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      setActiveSessionId(chatId);
      setSessions([firstSession]);

      import('../firebase').then(({ createOrGetChat }) => {
        createOrGetChat(activeProperty, currentUserId, currentUserName).then((resId) => {
          setActiveSessionId(resId);
        });
      });
    }

    // 2. Query all chats wherein either current user is seeker or current user is owner
    const q = query(
      collection(db, 'chats'),
      or(
        where('seekerId', '==', currentUserId),
        where('ownerId', '==', currentUserId)
      )
    );

    let chatList: ChatSession[] = [];

    const handleUpdate = () => {
      const mergedMap = new Map<string, ChatSession>();
      chatList.forEach((chat) => {
        mergedMap.set(chat.id, chat);
      });

      // If activeProperty details is active but not yet synchronized/deployed to Firestore, preserve the optimistic session
      if (activeProperty) {
        const chatId = `chat_${activeProperty.id}_${currentUserId.replace(/[^a-zA-Z0-9_\-]/g, '')}`;
        if (!mergedMap.has(chatId) && activeSessionIdRef.current === chatId) {
          mergedMap.set(chatId, {
            id: chatId,
            propertyId: activeProperty.id,
            propertyName: activeProperty.name,
            propertyImage: activeProperty.image,
            seekerId: currentUserId,
            seekerName: currentUserName,
            ownerId: activeProperty.ownerId || 'demo_owner123',
            ownerName: activeProperty.ownerName || 'Mwamba Chileshe',
            lastMessage: 'Let’s talk about the property specs!',
            messages: [
              {
                id: 'msg_welcome_' + Date.now(),
                senderId: activeProperty.ownerId || 'demo_owner123',
                senderRole: 'owner',
                senderName: activeProperty.ownerName || 'Mwamba Chileshe',
                text: `Hello! Thanks for your interest in "${activeProperty.name}". How can I help you today? Ask me about the rent, security deposit, or water and power backup!`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            ],
            createdAt: new Date().toISOString()
          });
        }
      }

      // Safeguard client-sent optimistic messages to prevent them vanishing when Firestore streams real-time updates
      sessionsRef.current.forEach((oldSession) => {
        const incoming = mergedMap.get(oldSession.id);
        if (incoming) {
          const localOnlyMsg = oldSession.messages.filter(m => 
            m.id.startsWith('msg_send_') && 
            !incoming.messages.some(im => im.text === m.text && im.senderId === m.senderId)
          );
          if (localOnlyMsg.length > 0) {
            incoming.messages = [...incoming.messages, ...localOnlyMsg];
          }
        }
      });

      const mergedList = Array.from(mergedMap.values());

      // Sort chats chronologically from most recent update downwards
      mergedList.sort((a, b) => {
        const t1 = a.messages && a.messages.length > 0 
          ? a.messages[a.messages.length - 1].id.split('_')[1] || '0'
          : '0';
        const t2 = b.messages && b.messages.length > 0 
          ? b.messages[b.messages.length - 1].id.split('_')[1] || '0'
          : '0';
        return Number(t2) - Number(t1);
      });

      setSessions(mergedList);

      // Select active session if not already designated
      const currentActiveId = activeSessionIdRef.current;
      if (mergedList.length > 0 && !currentActiveId) {
        if (activeProperty) {
          const targetId = `chat_${activeProperty.id}_${currentUserId.replace(/[^a-zA-Z0-9_\-]/g, '')}`;
          if (mergedList.some(m => m.id === targetId)) {
            setActiveSessionId(targetId);
          } else {
            setActiveSessionId(mergedList[0].id);
          }
        } else {
          setActiveSessionId(mergedList[0].id);
        }
      }
    };

    const unsub = onSnapshot(q, (snap) => {
      chatList = [];
      snap.forEach((docSnap) => {
        chatList.push(docSnap.data() as ChatSession);
      });
      handleUpdate();
    }, (err) => {
      console.warn("Retrying/error on Seeker/Owner snapshot sync:", err);
    });

    return () => {
      unsub();
    };
  }, [activeProperty?.id, currentUserId, currentUserName, isAdmin]);

  // Scroll viewport down upon receipt of any new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !activeSession) return;

    const userMessageText = inputVal.trim();
    setInputVal('');

    const newMsg: ChatMessage = {
      id: 'msg_send_' + Date.now(),
      senderId: currentUserId || 'demo_seeker',
      senderRole: currentUserRole === UserRole.SEEKER ? 'seeker' : 'owner',
      senderName: currentUserName,
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Optimistic/Local State Update immediately so the user sees the message sent instantly!
    const updatedMessages = [...(activeSession.messages || []), newMsg];
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          lastMessage: userMessageText,
          messages: updatedMessages
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    
    // Always store in localStorage fallback too to prevent offline data loss
    const cached = localStorage.getItem('tambu_chat_sessions');
    let cacheList = [];
    if (cached) {
      try {
        cacheList = JSON.parse(cached);
        if (!Array.isArray(cacheList)) {
          cacheList = [];
        }
      } catch (_) {
        cacheList = [];
      }
    }

    const existIdx = cacheList.findIndex((s: any) => s.id === activeSession.id);
    if (existIdx > -1) {
      cacheList[existIdx].messages = updatedMessages;
      cacheList[existIdx].lastMessage = userMessageText;
    } else {
      cacheList = [
        {
          ...activeSession,
          messages: updatedMessages,
          lastMessage: userMessageText,
        },
        ...cacheList,
      ];
    }
    localStorage.setItem('tambu_chat_sessions', JSON.stringify(cacheList));

    // 2. Real Firestore update if in online pipeline
    if (currentUserId && !currentUserId.startsWith('demo_')) {
      try {
        const { sendChatMessage } = await import('../firebase');
        await sendChatMessage(
          activeSession.id,
          currentUserId,
          currentUserRole === UserRole.SEEKER ? 'seeker' : 'owner',
          currentUserName,
          userMessageText
        );
      } catch (err) {
        console.warn("Firestore message dispatch failed, already wrote to offline fallback:", err);
      }
    }
  };

  if (isAdmin) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-[#e4e2e2] shadow-md my-12 text-center space-y-4">
        <div className="w-16 h-16 bg-[#ffdad8] text-[#b52330] rounded-2xl flex items-center justify-center text-3xl mx-auto pb-0.5 select-none animate-pulse">
          💬
        </div>
        <h2 className="text-xl font-bold text-[#1b1c1c]">Chats Restricted</h2>
        <p className="text-xs sm:text-sm text-[#5a403f] leading-relaxed">
          As an Administrator, chat options are disabled.
          Chat communication is kept private and secure, exclusively between <strong>Property Seekers</strong> and verified <strong>Property Owners</strong>.
        </p>
        <button
          onClick={onBack}
          className="bg-[#b52330] hover:bg-[#9a1c26] text-white text-xs font-bold py-2.5 px-6 rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md flex h-[calc(100vh-10rem)] md:h-[620px] min-h-[480px] animate-fade-in my-2">
      
      {/* 1. Left Sidebar: Active Conversations Feed */}
      <aside className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-slate-50/50 ${activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        <header className="p-4 border-b border-gray-150 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 px-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-600 rounded-lg transition-all flex items-center md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm text-[#1b1c1c] uppercase tracking-wider">Conversations</h3>
          </div>
          <span className="bg-[#ffdad8] text-[#b52330] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
            {sessions.length} chats
          </span>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 font-medium">
              No conversations yet. Inquire about properties to start chatting!
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`p-4 cursor-pointer select-none transition-colors flex gap-3 ${
                    isActive ? 'bg-white border-l-4 border-l-[#b52330]' : 'hover:bg-gray-100/50 bg-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-200 shrink-0 border border-gray-200 shadow-inner">
                    <img alt={s.propertyName} referrerPolicy="no-referrer" src={s.propertyImage} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-[#1b1c1c] truncate">
                        {s.seekerId === currentUserId ? s.ownerName : s.seekerName}
                      </h4>
                    </div>
                    <p className="text-[10px] font-bold text-[#b52330] truncate">{s.propertyName}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{s.lastMessage}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Right Panel: Active Messaging Viewport */}
      <section className={`flex-1 flex flex-col bg-white ${activeSessionId ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Chat window Header */}
        <header className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSessionId('')}
              className="p-1 px-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-600 rounded-lg mr-1 transition-all flex items-center md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onBack}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-[#5a403f] border border-gray-150 rounded-xl mr-1 transition-all md:flex hidden items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            
            {activeSession && (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner border border-gray-150 shrink-0">
                  <img alt="Thumbnail" referrerPolicy="no-referrer" src={activeSession.propertyImage} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#1b1c1c] flex items-center gap-1 leading-tight">
                    {activeSession.seekerId === currentUserId ? activeSession.ownerName : activeSession.seekerName}
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006c4c]" />
                  </h4>
                  <p className="text-[10.5px] font-semibold text-[#b52330] tracking-tight truncate max-w-xs">{activeSession.propertyName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-[#fff0f0] text-[#b52330] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border border-[#ffd2d2]">
            <Clock className="w-3 h-3" /> Real-time active chat
          </div>
        </header>

        {/* Message Feeds Viewport */}
        {activeSession ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#fbf9f8]/40">
            {activeSession.messages.map((m) => {
              const isMine = m.senderId === currentUserId || 
                             (activeSession.seekerId === currentUserId && m.senderRole === 'seeker') ||
                             (activeSession.ownerId === currentUserId && m.senderRole === 'owner');
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2 animate-fade-in`}
                >
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-[#ffdad8] flex items-center justify-center text-[#b52330] border border-[#f5c9c9] text-xs font-bold leading-none capitalize shrink-0">
                      {m.senderName ? m.senderName.charAt(0) : 'U'}
                    </div>
                  )}

                  <div className="space-y-0.5 max-w-[70%]">
                    <span className={`text-[9.5px] font-semibold text-gray-400 block ${isMine ? 'text-right' : 'text-left'} px-1`}>
                      {m.senderName || (m.senderRole === 'seeker' ? 'Seeker' : 'Owner')} {isMine ? '(You)' : ''}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl text-[12px] sm:text-xs leading-relaxed shadow-sm ${
                        isMine
                          ? 'bg-[#b52330] text-white rounded-br-none'
                          : 'bg-white border border-gray-205 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                    <div className={`text-[9px] text-gray-400 font-medium flex items-center gap-1 px-1 justify-end`}>
                      <span>{m.timestamp}</span>
                      {isMine && <CheckCheck className="w-3 h-3 text-[#b52330]" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-[#fbf9f8]/40">
            <HelpCircle className="w-12 h-12 text-gray-300 stroke-[1.5px]" />
            <p className="text-sm font-bold text-gray-500">No conversation selected</p>
            <p className="text-xs text-gray-400">Please choose a conversation on the sidebar slot to open the feed.</p>
          </div>
        )}

        {/* Messaging Text Form typing node */}
        {activeSession && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-150 bg-white flex gap-2.5 shrink-0">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type your message about properties specs, booking, or rent..."
              className="flex-1 bg-gray-50 hover:bg-gray-100/50 border border-gray-205 rounded-xl px-4 py-3 text-xs sm:text-sm focus:bg-white focus:border-[#b52330] focus:ring-0 outline-none transition-all placeholder-gray-400 font-medium"
            />
            <button
              type="submit"
              className="bg-[#b52330] hover:bg-[#9a1c26] text-white p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-md shadow-[#b52330]/10"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        )}

      </section>
    </div>
  );
};
