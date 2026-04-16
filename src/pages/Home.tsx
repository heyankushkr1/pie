import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, useAuth } from '../context/AuthContext';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Link } from 'react-router-dom';

const BADGE_RANK = {
  gold: 5,
  silver: 4,
  purple: 3,
  blue: 2,
  green: 1,
  none: 0,
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [editors, setEditors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadEditors() {
      setLoading(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "editor"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as UserProfile);
        
        // Sort by badge tier
        data.sort((a, b) => {
          const rankA = BADGE_RANK[a.badge] || 0;
          const rankB = BADGE_RANK[b.badge] || 0;
          return rankB - rankA;
        });

        setEditors(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "users");
      } finally {
        setLoading(false);
      }
    }
    loadEditors();
  }, [user, authLoading]);

  const filteredEditors = editors.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.skills && e.skills.join(' ').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col items-center mb-16 text-center space-y-4">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold tracking-tighter"
        >
          Liquid Glass <span className="text-white/50">Creators</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-lg text-white/50 max-w-xl"
        >
          Discover premium video editors for your next project. Filtered by tier, proven by portfolio.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="w-full max-w-lg mt-8"
        >
          <Input 
            placeholder="Search editors, tags, or handles..." 
            icon={<Search className="w-5 h-5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full bg-white/5 border-white/20 px-6 py-4 text-lg"
          />
        </motion.div>
      </div>

      {authLoading || (loading && user) ? (
        <div className="flex justify-center text-white/40">Loading talent...</div>
      ) : !user ? (
        <div className="py-20 text-center glass-panel w-full max-w-2xl mx-auto border-white/10">
          <h2 className="text-2xl font-bold mb-4">Join the Network</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">Sign in or create an account to browse and connect with top-tier video editors on the marketplace.</p>
          <Link to="/auth" className="inline-block bg-white text-black font-medium rounded-[14px] px-8 py-3.5 hover:bg-gray-200 transition-colors">
            Get Started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEditors.map((editor, i) => (
            <motion.div 
              key={editor.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/profile/${editor.handle}`} className="block glass-panel p-6 group h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {editor.avatarUrl ? (
                      <img src={editor.avatarUrl} alt={editor.name} className="w-14 h-14 rounded-2xl border border-white/20 object-cover shadow-inner" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-600 flex items-center justify-center text-xl font-bold border border-white/20 shadow-inner">
                        {editor.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[16px] text-white group-hover:text-white/90 transition-colors flex items-center gap-1.5">
                        <span>{editor.name}</span>
                        <VerificationBadge type={editor.badge} />
                      </h3>
                      <p className="text-[13px] text-white/60">@{editor.handle}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[13px] leading-[1.4] text-white/60 line-clamp-3 mb-4 flex-grow">
                  {editor.bio || "No bio accessible. This creator prefers their edits to speak for themselves."}
                </p>

                {editor.skills && editor.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {editor.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/60 border border-white/10">
                        {skill}
                      </span>
                    ))}
                    {editor.skills.length > 3 && (
                      <span className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/60 border border-white/10">
                        +{editor.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
          {filteredEditors.length === 0 && (
            <div className="col-span-full py-12 text-center text-white/40 glass-panel border-dashed">
              No editors found. Enhance your search parameters.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
