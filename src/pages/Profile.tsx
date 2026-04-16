import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth, UserProfile } from '../context/AuthContext';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'motion/react';
import { MessageSquare, Settings } from 'lucide-react';

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [bio, setBio] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    
    async function loadProfile() {
      if (!handle) return;
      setLoading(true);
      try {
        const handleRef = doc(db, 'handles', handle.toLowerCase());
        const handleSnap = await getDoc(handleRef);
        
        if (!handleSnap.exists()) {
          setProfile(null);
          return;
        }

        const targetUid = handleSnap.data().uid;
        const userRef = doc(db, 'users', targetUid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          setProfile(data);
          setBio(data.bio || '');
          setSkillsStr(data.skills?.join(', ') || '');
          setWebsite(data.website || '');
          setAvatarUrl(data.avatarUrl || '');

          // Check if current user is following
          if (user && data.uid !== user.uid) {
            const { getDoc, doc } = await import("firebase/firestore");
            const followDoc = await getDoc(doc(db, "follows", `${user.uid}_${data.uid}`));
            setIsFollowing(followDoc.exists());
          }

          // Count followers and following
          const { getCountFromServer, query, collection, where } = await import("firebase/firestore");
          const followersQ = query(collection(db, "follows"), where("followingId", "==", data.uid));
          const followingQ = query(collection(db, "follows"), where("followerId", "==", data.uid));
          const [fCountSnap, followingCountSnap] = await Promise.all([
            getCountFromServer(followersQ),
            getCountFromServer(followingQ)
          ]);
          setFollowersCount(fCountSnap.data().count);
          setFollowingCount(followingCountSnap.data().count);

        } else {
          setProfile(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `handles/${handle}`);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [handle, user, authLoading]);

  const isOwner = user && profile && user.uid === profile.uid;

  const handleToggleFollow = async () => {
    if (!profile || !user || isOwner) return;
    const docId = `${user.uid}_${profile.uid}`;
    try {
      const { setDoc, deleteDoc, doc } = await import('firebase/firestore');
      const followRef = doc(db, "follows", docId);
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        setFollowersCount(Math.max(0, followersCount - 1));
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: profile.uid,
          createdAt: new Date().toISOString()
        });
        setIsFollowing(true);
        setFollowersCount(followersCount + 1);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `follows/${docId}`);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      const skillsArray = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      await updateDoc(doc(db, 'users', profile.uid), {
        bio,
        skills: skillsArray,
        website: website.trim(),
        avatarUrl: avatarUrl.trim()
      });
      setProfile({ ...profile, bio, skills: skillsArray, website: website.trim(), avatarUrl: avatarUrl.trim() });
      setEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users");
    }
  };

  const handleRequestVerification = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { verificationStatus: 'pending' });
      setProfile({ ...profile, verificationStatus: 'pending' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
        else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startChat = async () => {
    if (!myProfile || !profile) return;
    if (myProfile.uid === profile.uid) return;
    // We should create a chat or navigate to existing chat
    navigate('/chat?with=' + profile.uid);
  };

  const renderBioWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <>
        {parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return <a key={i} href={part.startsWith('http') ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{part}</a>;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  if (authLoading || (loading && user)) return <div className="min-h-screen py-32 px-6 flex justify-center text-white/50">Retrieving profile...</div>;
  if (!user) return <div className="min-h-screen py-32 px-6 flex justify-center text-white/50">Please sign in to view profiles and chat with creators.</div>;
  if (!profile) return <div className="min-h-screen py-32 px-6 flex justify-center text-white/50">Profile not found.</div>;

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-white/10 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 mb-12 border-b border-white/10 pb-8 text-center md:text-left">
          <div className="relative">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover ring-2 ring-white/20 shadow-2xl" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-tr from-gray-800 to-gray-600 ring-2 ring-white/20 shadow-2xl flex items-center justify-center text-4xl font-bold">
                {profile.name.substring(0, 1).toUpperCase()}
              </div>
            )}
            
            {editing && (
              <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <label className="cursor-pointer text-xs font-semibold text-white px-2 py-1 bg-white/20 rounded-md hover:bg-white/30 backdrop-blur-md">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>
          <div className="flex-1 w-full flex flex-col items-center md:items-start">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center md:justify-start gap-3 w-full">
              <span className="truncate">{profile.name}</span>
              <VerificationBadge type={profile.badge} className="scale-125 origin-left shrink-0" />
            </h1>
            <p className="text-white/60 text-lg mt-1">@{profile.handle}</p>
            
            <div className="flex gap-4 mt-2 text-sm text-white/50">
              <div><span className="text-white font-bold">{followersCount}</span> Followers</div>
              <div><span className="text-white font-bold">{followingCount}</span> Following</div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <span className="text-[11px] uppercase tracking-widest text-white/40 font-bold bg-white/5 px-3 py-1 rounded-full">{profile.role.replace('_', ' ')}</span>
              {profile.website && !editing && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-widest text-blue-300 hover:text-blue-200 font-bold bg-blue-500/10 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                  Portfolio Link
                </a>
              )}
              {isOwner && profile.badge === 'none' && (!profile.verificationStatus || profile.verificationStatus === 'none') && !editing && (
                <button onClick={handleRequestVerification} className="text-[11px] uppercase tracking-widest text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-full transition-colors cursor-pointer border-none outline-none">
                  Request Verification 🌟
                </button>
              )}
              {isOwner && profile.verificationStatus === 'pending' && (
                <span className="text-[11px] uppercase tracking-widest text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full">
                  Verification Pending
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto mt-6 md:mt-0">
            {!isOwner ? (
                <>
                  <Button 
                    onClick={handleToggleFollow} 
                    variant={isFollowing ? "ghost" : "primary"} 
                    className={`py-3 md:py-2 ${isFollowing ? 'border border-white/20' : ''}`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                  <Button onClick={startChat} variant="primary" className="py-3 md:py-2">
                    <MessageSquare className="w-4 h-4 mr-2" /> Message
                  </Button>
                </>
            ) : (
               <Button onClick={() => setEditing(!editing)} variant="ghost" className="flex-1 md:flex-none border border-white/10 md:border-transparent py-3 md:py-2">
                 <Settings className="w-4 h-4 mr-2" /> {editing ? 'Cancel' : 'Edit Profile'}
               </Button>
            )}
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          {editing && (
             <section className="bg-white/5 p-4 rounded-2xl border border-white/10">
               <h2 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-3">Website / Portfolio Link</h2>
               <Input 
                 value={website}
                 onChange={e => setWebsite(e.target.value)}
                 placeholder="e.g. https://myportfolio.com"
               />
             </section>
          )}

          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-4">Biography</h2>
            {editing ? (
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 h-32"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell clients about yourself and include any links you want..."
              />
            ) : (
              <p className="text-white/80 leading-relaxed text-lg break-words">
                {profile.bio ? renderBioWithLinks(profile.bio) : "No biography provided."}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-4">Core Skills</h2>
            {editing ? (
              <Input 
                value={skillsStr}
                onChange={e => setSkillsStr(e.target.value)}
                placeholder="e.g. Premiere Pro, After Effects, Color Grading (comma separated)"
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                {profile.skills && profile.skills.length > 0 ? profile.skills.map(skill => (
                  <span key={skill} className="px-4 py-2 rounded-full glass-pill text-sm font-medium">
                    {skill}
                  </span>
                )) : <span className="text-white/40">No skills listed.</span>}
              </div>
            )}
          </section>

          {editing && (
            <div className="flex justify-end pt-6 border-t border-white/10">
              <Button onClick={handleSave} variant="primary">Save Changes</Button>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
