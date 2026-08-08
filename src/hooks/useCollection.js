import { useEffect, useMemo, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

// Cada empresa (tenant) tem seus dados isolados em:
//   empresas/{empresaId}/{colecao}
// Isso já deixa o banco preparado para o modelo multi-empresa do SaaS.
function collectionPath(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

export function useCollection(name, { orderByField = 'criadoEm', direction = 'desc' } = {}) {
  const { empresaId } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    const q = query(collection(db, collectionPath(empresaId, name)), orderBy(orderByField, direction));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [empresaId, name, orderByField, direction]);

  const api = useMemo(() => ({
    async add(item) {
      return addDoc(collection(db, collectionPath(empresaId, name)), {
        ...item,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    },
    async update(id, changes) {
      return updateDoc(doc(db, collectionPath(empresaId, name), id), {
        ...changes,
        atualizadoEm: serverTimestamp(),
      });
    },
    async remove(id) {
      return deleteDoc(doc(db, collectionPath(empresaId, name), id));
    },
  }), [empresaId, name]);

  return { data, loading, error, ...api };
}
