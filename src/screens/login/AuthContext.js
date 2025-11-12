import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../../lib/firebaseApp";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "USUARIO", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile({ id: u.uid, ...snap.data() });
        } else {
          const base = {
            email: u.email,
            estado: "Activo",
            rol: "Tecnico",
            fechaRegistro: serverTimestamp(),
            modoOscuro: false,
            IDSucursal: null,
          };
          await setDoc(ref, base);
          setProfile({ id: u.uid, ...base });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);


  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const register = async (email, password, extra = {}) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "USUARIO", user.uid), {
      email,
      estado: "Activo",
      rol: extra.rol ?? "Tecnico",
      fechaRegistro: serverTimestamp(),
      modoOscuro: extra.modoOscuro ?? false,
      IDSucursal: extra.IDSucursal ?? null,
      ...extra,
    });
  };
  
  const updateProfile = async (newProfile) => {
    try {
      // Actualizar el estado local
      setProfile(newProfile);

      if (!auth.currentUser) return;

      // Actualizar en Firestore
      await setDoc(
        doc(db, "USUARIO", auth.currentUser.uid),
        { modoOscuro: newProfile.modoOscuro },
        { merge: true } // para no sobrescribir otros campos
      );
    } catch (error) {
      console.error("Error actualizando perfil:", error);
    }
  };
  const refreshProfile = async () => {
    try {
      if (!auth.currentUser) return;
      const ref = doc(db, "USUARIO", auth.currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile({ id: auth.currentUser.uid, ...snap.data() });
      }
    } catch (error) {
      console.error("Error actualizando datos del perfil:", error);
    }
  };
  const logout = () => signOut(auth);

  const value = useMemo(
    () => ({ user, profile, loading, login, register, logout, updateProfile, refreshProfile }),
    [user, profile, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
