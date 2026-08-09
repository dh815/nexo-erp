// Leitor de XML de Nota Fiscal Eletrônica (NF-e) — extrai emitente,
// destinatário, data e itens, sem depender de nenhuma biblioteca externa
// (usa o DOMParser nativo do navegador).

function text(el, tag) {
  if (!el) return '';
  const found = el.getElementsByTagName(tag)[0];
  return found ? found.textContent.trim() : '';
}
function num(el, tag) {
  const v = text(el, tag);
  return v ? parseFloat(v) : 0;
}

export function parseNFeXML(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Arquivo XML inválido ou corrompido.');
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0];
  if (!infNFe) {
    throw new Error('Esse XML não parece ser uma NF-e (não encontrei a tag infNFe).');
  }

  const ide = infNFe.getElementsByTagName('ide')[0];
  const emit = infNFe.getElementsByTagName('emit')[0];
  const dest = infNFe.getElementsByTagName('dest')[0];
  const total = infNFe.getElementsByTagName('ICMSTot')[0];

  const dhEmi = text(ide, 'dhEmi') || text(ide, 'dEmi'); // "2026-05-10T08:00:00-03:00" ou "2026-05-10"
  const dataEmissao = dhEmi ? dhEmi.slice(0, 10) : '';

  const itens = Array.from(infNFe.getElementsByTagName('det')).map((det) => {
    const prod = det.getElementsByTagName('prod')[0];
    return {
      codigo: text(prod, 'cProd'),
      nome: text(prod, 'xProd'),
      ncm: text(prod, 'NCM'),
      unidade: text(prod, 'uCom'),
      quantidade: num(prod, 'qCom'),
      valorUnitario: num(prod, 'vUnCom'),
      valorTotal: num(prod, 'vProd'),
    };
  });

  return {
    emitenteNome: text(emit, 'xNome'),
    emitenteDocumento: text(emit, 'CNPJ') || text(emit, 'CPF'),
    destinatarioNome: text(dest, 'xNome'),
    destinatarioDocumento: text(dest, 'CNPJ') || text(dest, 'CPF'),
    dataEmissao,
    valorTotal: num(total, 'vNF'),
    itens,
  };
}
