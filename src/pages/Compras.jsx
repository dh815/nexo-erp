import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { Card, Modal, Field, inputClass, Button } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { createCompra, deleteCompra } from '../lib/compras';
import { parseNFeXML } from '../lib/nfe';

const formasPagamento = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência'];

const emptyForm = { fornecedor: '', data: new Date().toISOString().slice(0, 10), formaPagamento: 'Boleto', numeroParcelas: 0, diasVencimentoBoleto: 30, observacoes: '' };

export default function Compras() {
  const { empresaId } = useAuth();
  const { data: compras, loading } = useCollection('compras');
  const { data: produtos, add: addProduto } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });

  const [modal, setModal] = useState(null); // 'new' | null
  const [form, setForm] = useState(emptyForm);
  const [cart, setCart] = useState([]); // [{produtoId, nome, quantidade, custoUnitario}]
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Sugestão de reposição (MRP simplificado): produtos abaixo do estoque mínimo,
  // sugerindo repor até o dobro do mínimo.
  const sugestoes = useMemo(() => produtos
    .filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo))
    .map((p) => ({ ...p, sugerido: Math.max(Number(p.estoqueMinimo) * 2 - Number(p.estoque), 1) })),
    [produtos]
  );

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function openNew() { setForm(emptyForm); setCart([]); setModal('new'); }

  async function handleImportXML(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const xmlText = await file.text();
      const nfe = parseNFeXML(xmlText);

      const novoCart = [];
      let vinculados = 0;
      let criados = 0;

      for (const item of nfe.itens) {
        let produto = produtos.find((p) => p.sku && item.codigo && p.sku.toLowerCase() === item.codigo.toLowerCase())
          || produtos.find((p) => p.nome.toLowerCase() === item.nome.toLowerCase());

        if (!produto) {
          const ref = await addProduto({
            nome: item.nome,
            sku: item.codigo || '',
            categoria: '',
            fornecedor: nfe.emitenteNome,
            precoCusto: item.valorUnitario,
            precoVenda: item.valorUnitario,
            estoque: 0,
            estoqueMinimo: 0,
            codigoBarras: '',
            peso: '',
            dimensoes: '',
            fotoUrl: '',
          });
          produto = { id: ref.id, nome: item.nome };
          criados++;
        } else {
          vinculados++;
        }

        novoCart.push({ produtoId: produto.id, nome: produto.nome, quantidade: item.quantidade, custoUnitario: item.valorUnitario });
      }

      setForm((f) => ({ ...f, fornecedor: nfe.emitenteNome || f.fornecedor, data: nfe.dataEmissao || f.data }));
      setCart(novoCart);
      alert(`Nota importada: ${vinculados} produto(s) já cadastrado(s) vinculado(s) automaticamente, ${criados} produto(s) novo(s) criado(s) no catálogo.`);
    } catch (err) {
      alert('Não foi possível importar essa nota: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  function addToCart(produto, qty = 1) {
    setCart((c) => {
      const exists = c.find((i) => i.produtoId === produto.id);
      if (exists) return c.map((i) => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qty } : i);
      return [...c, { produtoId: produto.id, nome: produto.nome, quantidade: qty, custoUnitario: Number(produto.precoCusto) || 0 }];
    });
    setModal('new');
  }

  function updateCartItem(produtoId, changes) {
    setCart((c) => c.map((i) => i.produtoId === produtoId ? { ...i, ...changes } : i));
  }
  function removeFromCart(produtoId) {
    setCart((c) => c.filter((i) => i.produtoId !== produtoId));
  }

  const total = cart.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0);
  const geraParcelas = form.formaPagamento === 'Boleto' || (form.formaPagamento === 'Cartão' && Number(form.numeroParcelas) > 0);
  const parcelasEfetivas = form.formaPagamento === 'Boleto' ? Math.max(Number(form.numeroParcelas), 1) : Number(form.numeroParcelas);

  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!form.fornecedor.trim() || cart.length === 0) {
      alert('Informe o fornecedor e adicione ao menos um produto.');
      return;
    }
    setSaving(true);
    try {
      await createCompra(empresaId, { ...form, itens: cart, valorTotal: total });
      setModal(null);
    } catch (err) {
      alert('Não foi possível registrar a compra: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(compra) {
    if (!confirm(`Excluir a compra de ${compra.fornecedor}? O estoque adicionado será removido.`)) return;
    await deleteCompra(empresaId, compra);
  }

  const columns = [
    { key: 'fornecedor', header: 'Fornecedor', render: (r) => <b>{r.fornecedor}</b> },
    { key: 'data', header: 'Data', render: (r) => <span className="text-muted">{r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '—'}</span> },
    { key: 'itens', header: 'Itens', render: (r) => <span className="text-muted">{r.itens?.length || 0} itens</span> },
    { key: 'valorTotal', header: 'Valor total', render: (r) => <b>{money(r.valorTotal)}</b> },
    { key: 'formaPagamento', header: 'Pagamento', render: (r) => <span className="text-muted">{r.formaPagamento} {r.numeroParcelas > 0 ? `· ${r.numeroParcelas}x` : ''}</span> },
  ];

  return (
    <div>
      <PageHeader crumb="Compras" title="Compras" subtitle="Reposição de estoque junto a fornecedores — gera saída financeira automaticamente" actionLabel="Nova compra" onAction={openNew} />

      {sugestoes.length > 0 && (
        <Card className="p-4.5 mb-4 border-warning-bg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-warning-bg text-warning flex items-center justify-center">
              <Icon.layers className="w-4 h-4" />
            </div>
            <div className="font-bold text-[13.5px]">Sugestão de reposição ({sugestoes.length} produto{sugestoes.length > 1 ? 's' : ''} abaixo do mínimo)</div>
          </div>
          <div className="flex flex-col gap-1.5">
            {sugestoes.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[13px] py-1.5 border-b border-[#f0f2f8] last:border-0">
                <div>
                  <b>{p.nome}</b> <span className="text-muted">— {p.estoque} em estoque (mín. {p.estoqueMinimo})</span>
                </div>
                <button onClick={() => addToCart(p, p.sugerido)} className="text-[11.5px] font-bold text-primary-dark border border-line rounded-lg px-2.5 py-1 hover:bg-primary-light">
                  + Comprar {p.sugerido} un.
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={compras} loading={loading} onDelete={handleDelete}
          emptyMessage="Nenhuma compra registrada ainda." />
      </div>

      {modal === 'new' && (
        <Modal title="Nova compra" onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar compra'}</Button></>}>
          <div className="flex items-center justify-between bg-primary-light rounded-xl p-3.5 mb-4">
            <div>
              <div className="text-[13px] font-bold text-primary-dark">Importar XML da nota de entrada</div>
              <div className="text-[11.5px] text-primary-dark opacity-80">Preenche fornecedor, produtos e valores automaticamente</div>
            </div>
            <label className="text-xs font-bold bg-white text-primary-dark rounded-lg px-3 py-2 cursor-pointer border border-line hover:bg-bg-soft shrink-0">
              {importing ? 'Lendo...' : 'Escolher XML'}
              <input type="file" accept=".xml" className="hidden" onChange={handleImportXML} disabled={importing} />
            </label>
          </div>

          <Field label="Fornecedor"><input className={inputClass} value={form.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} autoFocus /></Field>

          <Field label="Produtos">
            <div className="flex items-center gap-2 bg-bg-soft border border-line rounded-lg px-3 py-2 mb-2">
              <Icon.search className="w-4 h-4 text-faint shrink-0" />
              <input className="bg-transparent outline-none text-sm w-full" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mb-3">
              {filteredProdutos.map((p) => (
                <button key={p.id} type="button" onClick={() => addToCart(p)}
                  className="flex items-center justify-between text-[12.5px] border border-line rounded-lg px-2.5 py-1.5 hover:bg-bg-soft text-left">
                  <span>{p.nome} <span className="text-faint">({p.sku})</span></span>
                  <span className="text-primary-dark font-bold">+ Adicionar</span>
                </button>
              ))}
            </div>
          </Field>

          {cart.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {cart.map((i) => (
                <div key={i.produtoId} className="flex items-center gap-2 border border-line rounded-lg p-2.5">
                  <div className="flex-1 min-w-0 text-[13px] font-bold truncate">{i.nome}</div>
                  <input type="number" className="w-16 border border-line rounded-md px-2 py-1 text-[12.5px]" value={i.quantidade}
                    onChange={(e) => updateCartItem(i.produtoId, { quantidade: Number(e.target.value) || 0 })} title="Quantidade" />
                  <span className="text-faint text-[12px]">×</span>
                  <input type="number" className="w-20 border border-line rounded-md px-2 py-1 text-[12.5px]" value={i.custoUnitario}
                    onChange={(e) => updateCartItem(i.produtoId, { custoUnitario: Number(e.target.value) || 0 })} title="Custo unitário" />
                  <span className="text-[12.5px] font-bold w-20 text-right">{money(i.quantidade * i.custoUnitario)}</span>
                  <button onClick={() => removeFromCart(i.produtoId)} className="text-faint hover:text-danger"><Icon.trash className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" className={inputClass} value={form.data} onChange={(e) => set('data', e.target.value)} /></Field>
            <Field label="Forma de pagamento">
              <select className={inputClass} value={form.formaPagamento} onChange={(e) => set('formaPagamento', e.target.value)}>
                {formasPagamento.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Parcelas">
            <select className={inputClass} value={form.numeroParcelas} onChange={(e) => set('numeroParcelas', Number(e.target.value))}>
              <option value={0}>{form.formaPagamento === 'Boleto' ? '1 boleto único' : '0x — à vista'}</option>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}x</option>)}
            </select>
          </Field>
          {form.formaPagamento === 'Boleto' && (
            <Field label="Vencimento do 1º boleto (dias após a data da compra)">
              <input type="number" min="1" className={inputClass} value={form.diasVencimentoBoleto} onChange={(e) => set('diasVencimentoBoleto', e.target.value)} />
            </Field>
          )}
          <div className="text-[11.5px] text-muted -mt-1.5 mb-3">
            {geraParcelas
              ? form.formaPagamento === 'Boleto'
                ? `Vai gerar ${parcelasEfetivas} boleto(s) — o 1º vence em ${form.diasVencimentoBoleto} dias, os seguintes a cada 30 dias.`
                : `Vai gerar ${form.numeroParcelas} conta(s) a pagar no Calendário (1 por mês).`
              : 'Saída lançada à vista, não gera conta a pagar no calendário.'}
          </div>
          <Field label="Observações"><textarea className={inputClass} rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Field>

          <div className="flex justify-between text-base font-extrabold pt-2 mt-1 border-t border-line">
            <span>Total {geraParcelas ? `(${parcelasEfetivas}x de ${money(total / parcelasEfetivas)})` : '(à vista)'}</span>
            <span>{money(total)}</span>
          </div>
        </Modal>
      )}
    </div>
  );
}
