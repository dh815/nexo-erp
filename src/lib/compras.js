import {
  collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment,
} from 'firebase/firestore';
import { db } from './firebase';

function path(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

// Cria uma compra (reposição de estoque junto a um fornecedor): grava a
// compra, dá ENTRADA automática no estoque de cada produto comprado e
// gera a Saída financeira correspondente (toda compra vira uma saída).
export async function createCompra(empresaId, compra) {
  const batch = writeBatch(db);

  const compraRef = doc(collection(db, path(empresaId, 'compras')));
  batch.set(compraRef, {
    ...compra,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // Entrada automática de estoque (oposto da baixa que acontece nos Pedidos)
  for (const item of compra.itens) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(item.quantidade) });
  }

  // Toda compra gera uma Saída financeira vinculada
  const saidaRef = doc(collection(db, path(empresaId, 'saidas')));
  batch.set(saidaRef, {
    descricao: `Compra — ${compra.fornecedor || 'fornecedor não informado'}`,
    categoria: 'Estoque',
    fornecedor: compra.fornecedor,
    valor: compra.valorTotal,
    data: compra.data || new Date().toISOString().slice(0, 10),
    formaPagamento: compra.formaPagamento,
    compraId: compraRef.id,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  await batch.commit();
  return compraRef.id;
}

// Exclui uma compra: repõe (retira) o estoque que havia entrado e apaga a
// Saída financeira vinculada.
export async function deleteCompra(empresaId, compra) {
  const batch = writeBatch(db);

  const compraRef = doc(db, path(empresaId, 'compras'), compra.id);
  batch.delete(compraRef);

  for (const item of compra.itens || []) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(-item.quantidade) });
  }

  const saidasSnap = await getDocs(
    query(collection(db, path(empresaId, 'saidas')), where('compraId', '==', compra.id))
  );
  saidasSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}
