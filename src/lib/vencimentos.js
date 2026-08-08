// Boleto vence em X dias corridos a partir da emissão (padrão configurável
// por pedido/compra); boletos seguintes (quando parcelado em carnê) vencem
// a cada 30 dias após o primeiro. Cartão parcelado segue o ciclo de fatura
// (1 mês por parcela), que é a convenção usual desse meio de pagamento.
export function calcularVencimentos({ formaPagamento, numeroParcelas, diasVencimentoBoleto, dataBase }) {
  const base = dataBase ? new Date(dataBase) : new Date();
  const datas = [];

  if (formaPagamento === 'Boleto') {
    const dias = Number(diasVencimentoBoleto) || 30;
    const primeiro = new Date(base);
    primeiro.setDate(primeiro.getDate() + dias);
    datas.push(primeiro);
    for (let i = 1; i < numeroParcelas; i++) {
      const d = new Date(datas[i - 1]);
      d.setDate(d.getDate() + 30);
      datas.push(d);
    }
  } else {
    // Cartão parcelado: uma parcela por mês, a partir do mês seguinte
    for (let i = 1; i <= numeroParcelas; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      datas.push(d);
    }
  }

  return datas.map((d) => d.toISOString().slice(0, 10));
}
