import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";

export type Role = "admin" | "vice_admin" | "moderator" | "editor" | "client";
export type Badge = "gold" | "silver" | "purple" | "blue" | "green" | "none";

export interface UserProfile {
  uid: string;
  handle: string;
  name: string;
  role: Role;
  badge: Badge;
  bio?: string;
  skills?: string[];
  portfolio?: string[];
  pricing?: string[];
  availability?: "available" | "busy" | "offline";
  avatarUrl?: string;
  website?: string;
  verificationStatus?: "none" | "pending" | "rejected" | "approved";
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  signUpSetup: (handle: string, role: Role, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const provider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Listen to profile
        const profileRef = doc(db, "users", firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Auto-upgrade the designated admin if their role is incorrect
            if (data.role !== 'admin' && firebaseUser.email === 'nkshrajwar@gmail.com') {
              // Note: our firestore.rules already allow us to do this via token auth check
              const { updateDoc } = await import("firebase/firestore");
              await updateDoc(profileRef, { role: 'admin' });
              return; // wait for next snapshot
            }
            setProfile(data);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`));

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const signUpSetup = async (handle: string, role: Role, name: string) => {
    if (!user) return;
    try {
      // 1. Check if handle is taken (via Handles collection)
      const handleLower = handle.toLowerCase();
      const handleRef = doc(db, "handles", handleLower);
      const handleSnap = await getDoc(handleRef);
      if (handleSnap.exists()) {
        throw new Error("Handle already taken");
      }

      // 2. Reserve handle
      await setDoc(handleRef, { uid: user.uid });

      // 3. Create profile
      const newProfile: UserProfile = {
        uid: user.uid,
        handle: handleLower,
        name,
        role: user.email === 'nkshrajwar@gmail.com' ? 'admin' : role,
        badge: "none",
        avatarUrl: user.photoURL || undefined,
        verificationStatus: "none",
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", user.uid), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, signUpSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
