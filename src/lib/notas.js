import {
  collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

function path(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

// DEVOLUÇÃO (NF de Entrada) — cliente devolve produto(s) de uma venda.
// Estoque volta (entrada) e é lançada uma Saída financeira (o dinheiro
// devolvido ao cliente), igual já acontece com Compras.
export async function createDevolucao(empresaId, devolucao) {
  const batch = writeBatch(db);

  const devolucaoRef = doc(collection(db, path(empresaId, 'devolucoes')));
  batch.set(devolucaoRef, {
    ...devolucao,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  for (const item of devolucao.itens) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(item.quantidade) });
  }

  const saidaRef = doc(collection(db, path(empresaId, 'saidas')));
  batch.set(saidaRef, {
    descricao: `Devolução — ${devolucao.clienteNome}`,
    categoria: 'Devolução',
    valor: devolucao.valorTotal,
    data: devolucao.data || new Date().toISOString().slice(0, 10),
    formaPagamento: '',
    devolucaoId: devolucaoRef.id,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  await batch.commit();
  return devolucaoRef.id;
}

export async function deleteDevolucao(empresaId, devolucao) {
  const batch = writeBatch(db);

  batch.delete(doc(db, path(empresaId, 'devolucoes'), devolucao.id));

  for (const item of devolucao.itens || []) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(-item.quantidade) });
  }

  const saidasSnap = await getDocs(
    query(collection(db, path(empresaId, 'saidas')), where('devolucaoId', '==', devolucao.id))
  );
  saidasSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

// NOTA DE SAÍDA — gerada a partir de um Pedido de Venda já existente.
// Guarda um retrato (snapshot) dos dados do pedido no momento da geração.
// status: 'rascunho' (gerada, aguardando transmissão) | 'transmitida' | 'cancelada'.
//
// A transmissão de verdade pra SEFAZ (com validade fiscal) depende de um
// provedor de NF-e (certificado digital + webservice) — não é feita aqui.
// Este registro já guarda tudo que um provedor desses precisaria receber.
export async function createNotaSaida(empresaId, pedido) {
  const existente = await getDocs(
    query(collection(db, path(empresaId, 'notasSaida')), where('pedidoId', '==', pedido.id))
  );
  if (!existente.empty) {
    throw new Error('Esse pedido já tem uma nota de saída gerada.');
  }

  const notaRef = doc(collection(db, path(empresaId, 'notasSaida')));
  await writeBatch(db).set(notaRef, {
    pedidoId: pedido.id,
    clienteNome: pedido.clienteNome,
    itens: pedido.itens,
    valorTotal: pedido.valorTotal,
    data: pedido.data || new Date().toISOString().slice(0, 10),
    status: 'rascunho',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }).commit();

  return notaRef.id;
}

export async function updateNotaSaidaStatus(empresaId, notaId, status) {
  await updateDoc(doc(db, path(empresaId, 'notasSaida'), notaId), { status, atualizadoEm: serverTimestamp() });
}

export async function deleteNotaSaida(empresaId, notaId) {
  await deleteDoc(doc(db, path(empresaId, 'notasSaida'), notaId));
}
