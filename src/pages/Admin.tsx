import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth, UserProfile, Role, Badge } from '../context/AuthContext';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { Button } from '../components/ui/Button';

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isStaff = profile && ['admin', 'vice_admin', 'moderator'].includes(profile.role);
  const canModify = profile && ['admin', 'vice_admin'].includes(profile.role);

  useEffect(() => {
    async function loadUsers() {
      if (!isStaff) return;
      try {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as UserProfile);
        setUsers(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "users");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [isStaff]);

  const handleUpdateUser = async (uid: string, field: 'role' | 'badge' | 'verificationStatus', value: string) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        [field]: value
      });
      setUsers(users.map(u => u.uid === uid ? { ...u, [field]: value } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
  };

  const handleApproveVerification = async (uid: string, badgeTier: Badge) => {
    try {
      await updateDoc(doc(db, "users", uid), { 
        verificationStatus: 'approved',
        badge: badgeTier
      });
      setUsers(users.map(u => u.uid === uid ? { ...u, verificationStatus: 'approved', badge: badgeTier } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users");
    }
  };

  if (!isStaff) return <div className="min-h-screen pt-32 px-6 flex justify-center text-white/50">Access Denied. Command Center Restricted.</div>;

  const pendingRequests = users.filter(u => u.verificationStatus === 'pending');

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">Command Center</h1>
      
      {pendingRequests.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-emerald-400">Pending Verification Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map(u => (
              <div key={u.uid} className="glass-panel p-5 border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-900 to-gray-800 flex items-center justify-center font-bold">
                      {u.name.substring(0, 1)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold">{u.name}</div>
                    <div className="text-sm text-white/50">@{u.handle}</div>
                  </div>
                </div>
                {canModify && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Approve As:</div>
                    <div className="flex flex-wrap gap-2">
                      {(['green', 'blue', 'purple', 'silver', 'gold'] as Badge[]).map(tb => (
                        <button key={tb} onClick={() => handleApproveVerification(u.uid, tb)} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs uppercase transition-colors">
                          {tb}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handleUpdateUser(u.uid, 'verificationStatus', 'rejected')} className="mt-2 text-xs text-red-400 hover:text-red-300">
                      Reject Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">All Users Directory</h2>
      <div className="glass-panel overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/10">
          {loading ? (
             <div className="p-8 text-center text-white/40">Fetching records...</div>
          ) : (
            users.map(u => (
              <div key={u.uid} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1">
                    {u.name} <VerificationBadge type={u.badge} className="scale-75 origin-left" />
                  </div>
                  <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">@{u.handle}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] uppercase text-white/40">Role</span>
                     {canModify ? (
                        <select className="bg-black/50 border border-white/20 rounded p-1 text-xs text-white focus:outline-none w-full" value={u.role} onChange={(e) => handleUpdateUser(u.uid, 'role', e.target.value)}>
                          <option value="admin">Admin</option><option value="vice_admin">Vice Admin</option><option value="moderator">Moderator</option><option value="editor">Editor</option><option value="client">Client</option>
                        </select>
                      ) : (
                        <span className="text-xs uppercase">{u.role.replace('_', ' ')}</span>
                     )}
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] uppercase text-white/40">Badge</span>
                     {canModify ? (
                        <select className="bg-black/50 border border-white/20 rounded p-1 text-xs text-white focus:outline-none w-full" value={u.badge} onChange={(e) => handleUpdateUser(u.uid, 'badge', e.target.value)}>
                           <option value="gold">Gold</option><option value="silver">Silver</option><option value="purple">Purple</option><option value="blue">Blue</option><option value="green">Green</option><option value="none">None</option>
                        </select>
                      ) : (
                        <span className="text-xs uppercase">{u.badge}</span>
                     )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 uppercase text-xs tracking-widest text-white/40 bg-white/5">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Current Role</th>
                <th className="p-4 font-semibold">Badge Tier</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-white/40">Fetching records...</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="font-medium flex items-center gap-2">
                          {u.avatarUrl ? <img src={u.avatarUrl} className="w-8 h-8 rounded-lg object-cover" /> : null}
                          {u.name} <VerificationBadge type={u.badge} />
                        </div>
                        <span className="text-sm text-white/50">@{u.handle}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {canModify ? (
                        <select 
                          className="bg-black border border-white/20 rounded p-1 text-sm text-white focus:outline-none"
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.uid, 'role', e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="vice_admin">Vice Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="editor">Editor</option>
                          <option value="client">Client</option>
                        </select>
                      ) : (
                        <span className="text-sm text-white/70 uppercase tracking-wider">{u.role.replace('_', ' ')}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {canModify ? (
                        <select 
                          className="bg-black border border-white/20 rounded p-1 text-sm text-white focus:outline-none"
                          value={u.badge}
                          onChange={(e) => handleUpdateUser(u.uid, 'badge', e.target.value)}
                        >
                          <option value="gold">Gold (T1)</option>
                          <option value="silver">Silver (T2)</option>
                          <option value="purple">Purple (T3)</option>
                          <option value="blue">Blue (T4)</option>
                          <option value="green">Green (T5)</option>
                          <option value="none">None</option>
                        </select>
                      ) : (
                        <span className="text-sm text-white/70 uppercase tracking-wider">{u.badge}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-50 cursor-not-allowed">Suspend</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
