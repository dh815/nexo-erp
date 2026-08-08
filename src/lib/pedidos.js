import {
  collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment,
} from 'firebase/firestore';
import { db } from './firebase';

function path(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

// Cria um pedido de venda: grava o pedido, dá baixa automática no estoque
// de cada produto vendido e, se o pagamento for Cartão ou Boleto parcelado,
// gera as parcelas que alimentam o Calendário financeiro.
//
// Pix, Dinheiro e Transferência são considerados recebidos na hora — não
// geram parcela nenhuma, e o pedido já entra como "pago". O mesmo vale
// para "0 parcelas" (venda à vista), independente da forma de pagamento.
export async function createPedido(empresaId, pedido) {
  const batch = writeBatch(db);
  const numParcelas = Number(pedido.numeroParcelas) || 0;
  const geraParcelas = numParcelas > 0 && ['Cartão', 'Boleto'].includes(pedido.formaPagamento);

  const pedidoRef = doc(collection(db, path(empresaId, 'pedidos')));
  batch.set(pedidoRef, {
    ...pedido,
    numeroParcelas: numParcelas,
    status: geraParcelas ? (pedido.status || 'pendente') : 'pago',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // Baixa automática de estoque
  for (const item of pedido.itens) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(-item.quantidade) });
  }

  // Se recebido à vista, gera a Entrada financeira na hora (o dinheiro já entrou).
  // Se parcelado (Cartão/Boleto), a Entrada de cada parcela é gerada quando ela
  // é marcada como recebida no Calendário financeiro — ver receberParcela().
  if (!geraParcelas) {
    const entradaRef = doc(collection(db, path(empresaId, 'entradas')));
    batch.set(entradaRef, {
      descricao: `Venda — pedido ${pedidoRef.id.slice(0, 6)} (${pedido.clienteNome})`,
      categoria: 'Vendas',
      valor: pedido.valorTotal,
      data: pedido.data || new Date().toISOString().slice(0, 10),
      formaPagamento: pedido.formaPagamento,
      pedidoId: pedidoRef.id,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  }

  // Geração das parcelas (Calendário financeiro) — só Cartão/Boleto parcelado
  if (geraParcelas) {
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

// Marca uma parcela como recebida e gera a Entrada financeira correspondente.
export async function receberParcela(empresaId, parcela) {
  const batch = writeBatch(db);

  const parcelaRef = doc(db, path(empresaId, 'parcelas'), parcela.id);
  batch.update(parcelaRef, { status: 'pago' });

  const entradaRef = doc(collection(db, path(empresaId, 'entradas')));
  batch.set(entradaRef, {
    descricao: `Parcela ${parcela.numero}/${parcela.totalParcelas} — ${parcela.clienteNome}`,
    categoria: 'Parcelamento',
    valor: parcela.valor,
    data: new Date().toISOString().slice(0, 10),
    formaPagamento: '',
    pedidoId: parcela.pedidoId,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  await batch.commit();
}
