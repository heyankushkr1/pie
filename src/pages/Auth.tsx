import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'motion/react';
import { Video, AtSign, User } from 'lucide-react';

export default function Auth() {
  const { user, profile, loading, login, signUpSetup } = useAuth();
  const navigate = useNavigate();

  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle || !name) {
      setError("Please fill out all fields.");
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signUpSetup(handle.replace(/[^a-zA-Z0-9_]/g, ''), role, name);
    } catch (err: any) {
      setError(err.message || "Failed to reserve handle. Try another.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 pt-24 pb-12 relative">
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-md w-full p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 glass-pill flex items-center justify-center mb-4 ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Liquid Glass</h1>
          <p className="text-white/50 text-sm text-center mt-2">The premier marketplace for video editors and creators.</p>
        </div>

        {!user ? (
          <div className="flex flex-col space-y-4 text-center">
            <Button onClick={login} variant="primary" className="w-full py-3">
              Sign In with Google
            </Button>
            <p className="text-xs text-white/40">Use your Google account to log in or register.</p>
          </div>
        ) : (
          <form onSubmit={handleSetup} className="flex flex-col space-y-5">
            <h2 className="text-lg font-medium text-center">Complete your profile</h2>
            
            {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 ml-1 mb-1 block uppercase font-bold tracking-wider">Display Name</label>
                <Input 
                  required
                  placeholder="Your Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  icon={<User className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="text-xs text-white/50 ml-1 mb-1 block uppercase font-bold tracking-wider">Unique Handle</label>
                <Input 
                  required
                  placeholder="username" 
                  value={handle} 
                  onChange={(e) => setHandle(e.target.value)} 
                  icon={<AtSign className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="text-xs text-white/50 ml-1 mb-2 block uppercase font-bold tracking-wider">I am a</label>
                <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${role === 'client' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('editor')}
                    className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${role === 'editor' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                  >
                    Video Editor
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? "Creating Profile..." : "Complete Setup"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
