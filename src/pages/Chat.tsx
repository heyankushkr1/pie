import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuth, UserProfile } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';

interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  isBlocked: boolean;
  createdAt: any;
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get('with');
  const { user, profile } = useAuth();
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Initialize or find a chat session if "with" is in query
  useEffect(() => {
    async function initChat() {
      if (!user || !withUserId || user.uid === withUserId) return;
      
      // Load other profile
      try {
        const pSnap = await getDocs(query(collection(db, "users"), where("uid", "==", withUserId)));
        if (!pSnap.empty) {
          setOtherProfile(pSnap.docs[0].data() as UserProfile);
        }

        // Find existing chat
        const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
        const chatsSnap = await getDocs(q);
        
        let foundId = null;
        for (const chatDoc of chatsSnap.docs) {
          const chatData = chatDoc.data() as ChatSession;
          if (chatData.participants.includes(withUserId)) {
            foundId = chatDoc.id;
            break;
          }
        }

        if (foundId) {
          setActiveChatId(foundId);
        } else {
          // Create new chat
          const newChatRef = doc(collection(db, "chats"));
          await setDoc(newChatRef, {
            participants: [user.uid, withUserId],
            updatedAt: serverTimestamp()
          });
          setActiveChatId(newChatRef.id);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "chats or users");
      }
    }
    initChat();
  }, [user, withUserId]);

  // Listen to messages
  useEffect(() => {
    if (!activeChatId) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => handleFirestoreError(err, OperationType.GET, `chats/${activeChatId}/messages`));

    return () => unsubscribe();
  }, [activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChatId || !user) return;
    
    const textToSend = inputMsg;
    setInputMsg('');

    // Moderate text (check for 10 digits or email)
    const phoneRegex = /\b\d{10}\b/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    const isBlocked = phoneRegex.test(textToSend) || emailRegex.test(textToSend);
    const sanitizedText = isBlocked 
      ? textToSend.replace(phoneRegex, "[BLOCKED INFO]").replace(emailRegex, "[BLOCKED INFO]")
      : textToSend;

    try {
      const messagesRef = collection(db, "chats", activeChatId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: sanitizedText,
        isBlocked,
        createdAt: serverTimestamp()
      });
      
      // Update chat last updated
      await setDoc(doc(db, "chats", activeChatId), {
        updatedAt: serverTimestamp(),
        lastMessage: sanitizedText.substring(0, 50)
      }, { merge: true });
      
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  if (!withUserId) {
    return <div className="min-h-screen pt-32 px-6 flex justify-center text-white/50">Select a user to chat with from their profile.</div>;
  }

  return (
    <div className="min-h-screen pt-24 px-6 md:px-12 max-w-4xl mx-auto flex flex-col h-screen">
      <div className="glass-panel flex-1 flex flex-col overflow-hidden mb-6 relative">
        {/* Chat Header */}
        <div className="border-b border-white/10 p-4 bg-white/5 flex items-center gap-4 z-10 backdrop-blur-md">
           {otherProfile?.avatarUrl ? (
             <img src={otherProfile.avatarUrl} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20" alt="Avatar" />
           ) : (
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center text-lg font-bold ring-1 ring-white/20">
               {otherProfile?.name.substring(0, 1).toUpperCase() || "?"}
             </div>
           )}
           <div>
             <h3 className="font-medium flex items-center gap-2">
               {otherProfile?.name || "Loading..."}
               {otherProfile?.badge && <VerificationBadge type={otherProfile.badge} />}
             </h3>
             <p className="text-xs text-white/50">@{otherProfile?.handle}</p>
           </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-0">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id || i}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`px-5 py-3 rounded-2xl max-w-[80%] ${
                  isMe 
                    ? 'bg-white text-black rounded-tr-sm' 
                    : 'bg-white/10 border border-white/10 rounded-tl-sm'
                }`}>
                  <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.isBlocked && isMe && (
                  <span className="text-[10px] text-red-400 mt-1 uppercase tracking-wider font-bold opacity-80">Message filtered for safety rules</span>
                )}
              </motion.div>
            )
          })}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md relative z-10">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type a message..."
              className="bg-black/50 border-white/10 rounded-full"
            />
            <Button type="submit" variant="primary" className="rounded-full w-12 h-12 p-0 flex items-center justify-center">
              <Send className="w-5 h-5 ml-[-2px]" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
