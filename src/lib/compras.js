import {
  collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { calcularVencimentos } from './vencimentos';

function path(empresaId, name) {
  return `empresas/${empresaId}/${name}`;
}

// Cria uma compra (reposição de estoque junto a um fornecedor): grava a
// compra e dá ENTRADA automática no estoque de cada produto comprado.
//
// Pix, Dinheiro e Transferência são pagos na hora — a Saída é lançada
// direto. Boleto NUNCA é instantâneo (tem prazo de compensação mesmo
// "à vista"), então sempre gera ao menos 1 conta a pagar no Calendário,
// contada em dias corridos a partir da data da compra (prazo configurável).
// Cartão só gera conta a pagar quando o número de parcelas é maior que 0;
// a Saída de cada conta a pagar só é lançada quando ela é marcada como paga.
export async function createCompra(empresaId, compra) {
  const batch = writeBatch(db);
  const formaPagamento = compra.formaPagamento;
  const numParcelasInformado = Number(compra.numeroParcelas) || 0;
  const numParcelas = formaPagamento === 'Boleto' ? Math.max(numParcelasInformado, 1) : numParcelasInformado;
  const geraParcelas = formaPagamento === 'Boleto' || (formaPagamento === 'Cartão' && numParcelas > 0);

  const compraRef = doc(collection(db, path(empresaId, 'compras')));
  batch.set(compraRef, {
    ...compra,
    numeroParcelas: numParcelas,
    status: geraParcelas ? 'pendente' : 'pago',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // Entrada automática de estoque (oposto da baixa que acontece nos Pedidos)
  for (const item of compra.itens) {
    const produtoRef = doc(db, path(empresaId, 'produtos'), item.produtoId);
    batch.update(produtoRef, { estoque: increment(item.quantidade) });
  }

  if (!geraParcelas) {
    // À vista: gera a Saída financeira completa na hora
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
  } else {
    // Boleto (sempre) ou Cartão parcelado: gera as contas a pagar
    const valorParcela = compra.valorTotal / numParcelas;
    const vencimentos = calcularVencimentos({
      formaPagamento,
      numeroParcelas: numParcelas,
      diasVencimentoBoleto: compra.diasVencimentoBoleto,
      dataBase: compra.data,
    });

    vencimentos.forEach((vencimento, idx) => {
      const parcelaRef = doc(collection(db, path(empresaId, 'parcelasPagar')));
      batch.set(parcelaRef, {
        compraId: compraRef.id,
        fornecedor: compra.fornecedor,
        numero: idx + 1,
        totalParcelas: numParcelas,
        valor: valorParcela,
        vencimento,
        status: 'pendente',
        criadoEm: serverTimestamp(),
      });
    });
  }

  await batch.commit();
  return compraRef.id;
}

// Exclui uma compra: repõe (retira) o estoque que havia entrado e apaga a
// Saída e/ou as contas a pagar vinculadas.
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

  const parcelasSnap = await getDocs(
    query(collection(db, path(empresaId, 'parcelasPagar')), where('compraId', '==', compra.id))
  );
  parcelasSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

// Marca uma conta a pagar como paga e lança a Saída financeira correspondente.
export async function pagarParcela(empresaId, parcela) {
  const batch = writeBatch(db);

  const parcelaRef = doc(db, path(empresaId, 'parcelasPagar'), parcela.id);
  batch.update(parcelaRef, { status: 'pago' });

  const saidaRef = doc(collection(db, path(empresaId, 'saidas')));
  batch.set(saidaRef, {
    descricao: `Parcela ${parcela.numero}/${parcela.totalParcelas} — ${parcela.fornecedor}`,
    categoria: 'Estoque',
    fornecedor: parcela.fornecedor,
    valor: parcela.valor,
    data: new Date().toISOString().slice(0, 10),
    formaPagamento: '',
    compraId: parcela.compraId,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  await batch.commit();
}
