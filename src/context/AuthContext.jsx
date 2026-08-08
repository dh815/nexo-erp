import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Documento usuarios/{uid} guarda a qual empresa (tenant) o usuário pertence.
        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
        const uData = userDoc.exists() ? userDoc.data() : null;
        setEmpresaId(uData?.empresaId || null);
        if (uData?.empresaId) {
          const empresaDoc = await getDoc(doc(db, 'empresas', uData.empresaId));
          setEmpresa(empresaDoc.exists() ? { id: empresaDoc.id, ...empresaDoc.data() } : null);
        }
      } else {
        setEmpresaId(null);
        setEmpresa(null);
      }
      setLoading(false);
    });
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  async function updateEmpresa(changes) {
    if (!empresaId) return;
    await updateDoc(doc(db, 'empresas', empresaId), changes);
    setEmpresa((prev) => ({ ...prev, ...changes }));
  }

  // Recursos exclusivos por empresa (feature flags). Fica salvo em
  // empresas/{empresaId}.features = { chaveDoRecurso: true }. Ativar/desativar
  // é feito direto no Firestore (não tem tela pra isso — é controle do dono
  // do SaaS, não do cliente). Ver README para o passo a passo de como
  // adicionar um recurso novo.
  const features = empresa?.features || {};
  function hasFeature(key) {
    return !!features[key];
  }

  return (
    <AuthContext.Provider value={{ user, empresaId, empresa, loading, login, logout, updateEmpresa, features, hasFeature }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
