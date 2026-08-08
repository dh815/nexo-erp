import {
  collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment,
} from 'firebase/firestore';
import { db } from './firebase';

function path(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

// Cria um pedido de venda: grava o pedido, dá baixa automática no estoque
// de cada produto vendido e, se parcelado, gera as parcelas que alimentam
// o Calendário financeiro.
export async function createPedido(empresaId, pedido) {
  const batch = writeBatch(db);

  const pedidoRef = doc(collection(db, path(empresaId, 'pedidos')));
  batch.set(pedidoRef, {
    ...pedido,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // Baixa automática de estoque
  for (const item of pedido.itens) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(-item.quantidade) });
  }

  // Geração das parcelas (Calendário financeiro)
  const numParcelas = Number(pedido.numeroParcelas) || 1;
  const valorParcela = pedido.valorTotal / numParcelas;
  const dataBase = pedido.data ? new Date(pedido.data) : new Date();

  for (let i = 1; i <= numParcelas; i++) {
    const vencimento = new Date(dataBase);
    vencimento.setMonth(vencimento.getMonth() + i);
    const parcelaRef = doc(collection(db, path(empresaId, 'parcelas')));
    batch.set(parcelaRef, {
      pedidoId: pedidoRef.id,
      clienteNome: pedido.clienteNome,
      numero: i,
      totalParcelas: numParcelas,
      valor: valorParcela,
      vencimento: vencimento.toISOString().slice(0, 10),
      status: 'pendente',
      criadoEm: serverTimestamp(),
    });
  }

  await batch.commit();
  return pedidoRef.id;
}

// Exclui um pedido: repõe o estoque e remove as parcelas associadas.
export async function deletePedido(empresaId, pedido) {
  const batch = writeBatch(db);

  const pedidoRef = doc(db, path(empresaId, 'pedidos'), pedido.id);
  batch.delete(pedidoRef);

  for (const item of pedido.itens || []) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(item.quantidade) });
  }

  const parcelasSnap = await getDocs(
    query(collection(db, path(empresaId, 'parcelas')), where('pedidoId', '==', pedido.id))
  );
  parcelasSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}
