import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// A chave de serviço vem inteira (o JSON todo, como uma string) em uma única
// variável de ambiente, colada no Railway em Settings > Variables >
// FIREBASE_SERVICE_ACCOUNT. Gere em: Firebase Console > Configurações do
// projeto > Contas de serviço > Gerar nova chave privada.
function carregarCredencial() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Variável FIREBASE_SERVICE_ACCOUNT não configurada.');
  return JSON.parse(raw);
}

let db = null;
export function getDb() {
  if (db) return db;
  if (getApps().length === 0) {
    initializeApp({ credential: cert(carregarCredencial()) });
  }
  db = getFirestore();
  return db;
}
