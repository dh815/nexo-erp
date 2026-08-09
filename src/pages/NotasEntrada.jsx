import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { Modal, Field, inputClass, Button, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { createDevolucao, deleteDevolucao } from '../lib/notas';
import { deleteCompra } from '../lib/compras';

const emptyForm = { clienteId: '', clienteNome: '', pedidoId: '', motivo: '', data: new Date().toISOString().slice(0, 10) };

export default function NotasEntrada() {
  const { empresaId } = useAuth();
  const { data: compras, loading: l1 } = useCollection('compras');
  const { data: devolucoes, loading: l2 } = useCollection('devolucoes');
  const { data: clientes } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });
  const { data: pedidos } = useCollection('pedidos');
  const { data: produtos } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });
  const loading = l1 || l2;

  const [modal, setModal] = useState(null); // 'new' | null
  const [form, setForm] = useState(emptyForm);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const comprasRows = compras.map((c) => ({ ...c, tipo: 'compra' }));
    const devolucoesRows = devolucoes.map((d) => ({ ...d, tipo: 'devolucao' }));
    return [...comprasRows, ...devolucoesRows].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [compras, devolucoes]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function openNew() { setForm(emptyForm); setCart([]); setModal('new'); }

  function addToCart(produto) {
    setCart((c) => {
      const exists = c.find((i) => i.produtoId === produto.id);
      if (exists) return c.map((i) => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...c, { produtoId: produto.id, nome: produto.nome, quantidade: 1, valorUnitario: Number(produto.precoVenda) || 0 }];
    });
  }
  function updateCartItem(produtoId, changes) {
    setCart((c) => c.map((i) => i.produtoId === produtoId ? { ...i, ...changes } : i));
  }
  function removeFromCart(produtoId) {
    setCart((c) => c.filter((i) => i.produtoId !== produtoId));
  }

  const total = cart.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );
  const pedidosDoCliente = form.clienteId ? pedidos.filter((p) => p.clienteId === form.clienteId) : [];

  async function handleSave() {
    if (!form.clienteId || cart.length === 0) {
      alert('Selecione o cliente e ao menos um produto sendo devolvido.');
      return;
    }
    setSaving(true);
    try {
      await createDevolucao(empresaId, { ...form, itens: cart, valorTotal: total });
      setModal(null);
    } catch (err) {
      alert('Não foi possível registrar a devolução: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (row.tipo === 'compra') {
      if (!confirm(`Excluir a compra de ${row.fornecedor}? O estoque adicionado será removido.`)) return;
      await deleteCompra(empresaId, row);
    } else {
      if (!confirm(`Excluir a devolução de ${row.clienteNome}? O estoque devolvido será removido.`)) return;
      await deleteDevolucao(empresaId, row);
    }
  }

  const columns = [
    { key: 'tipo', header: 'Tipo', render: (r) => <Pill color={r.tipo === 'compra' ? 'blue' : 'orange'}>{r.tipo === 'compra' ? 'Compra' : 'Devolução'}</Pill> },
    { key: 'quem', header: 'Fornecedor/Cliente', render: (r) => <b>{r.tipo === 'compra' ? r.fornecedor : r.clienteNome}</b> },
    { key: 'data', header: 'Data', render: (r) => <span className="text-muted">{r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '—'}</span> },
    { key: 'itens', header: 'Itens', render: (r) => <span className="text-muted">{r.itens?.length || 0} itens</span> },
    { key: 'valorTotal', header: 'Valor', render: (r) => <b>{money(r.valorTotal)}</b> },
  ];

  return (
    <div>
      <PageHeader crumb="Notas Fiscais" title="NFs de Entrada" subtitle="Compras e devoluções — tudo que entra em estoque" actionLabel="Nova devolução" onAction={openNew} />

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={rows} loading={loading} onDelete={handleDelete}
          emptyMessage="Nenhuma nota de entrada ainda. Compras aparecem aqui automaticamente." />
      </div>
      <div className="text-[12px] text-muted mt-3">
        As compras são registradas na aba <b>Compras</b> e aparecem aqui automaticamente. Use "Nova devolução" para quando um cliente devolve um produto.
      </div>

      {modal === 'new' && (
        <Modal title="Nova devolução" onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar devolução'}</Button></>}>
          <Field label="Cliente">
            <select className={inputClass} value={form.clienteId}
              onChange={(e) => {
                const c = clientes.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, clienteId: e.target.value, clienteNome: c?.nome || '', pedidoId: '' }));
              }}>
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>

          {form.clienteId && (
            <Field label="Pedido de origem (opcional)">
              <select className={inputClass} value={form.pedidoId} onChange={(e) => set('pedidoId', e.target.value)}>
                <option value="">Não vincular a um pedido</option>
                {pedidosDoCliente.map((p) => <option key={p.id} value={p.id}>{p.id.slice(0, 6)} — {money(p.valorTotal)}</option>)}
              </select>
            </Field>
          )}

          <Field label="Produtos sendo devolvidos">
            <div className="flex items-center gap-2 bg-bg-soft border border-line rounded-lg px-3 py-2 mb-2">
              <Icon.search className="w-4 h-4 text-faint shrink-0" />
              <input className="bg-transparent outline-none text-sm w-full" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto mb-3">
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
                  <input type="number" className="w-20 border border-line rounded-md px-2 py-1 text-[12.5px]" value={i.valorUnitario}
                    onChange={(e) => updateCartItem(i.produtoId, { valorUnitario: Number(e.target.value) || 0 })} title="Valor unitário" />
                  <span className="text-[12.5px] font-bold w-20 text-right">{money(i.quantidade * i.valorUnitario)}</span>
                  <button onClick={() => removeFromCart(i.produtoId)} className="text-faint hover:text-danger"><Icon.trash className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" className={inputClass} value={form.data} onChange={(e) => set('data', e.target.value)} /></Field>
          </div>
          <Field label="Motivo"><textarea className={inputClass} rows={2} value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Ex: produto com defeito" /></Field>

          <div className="flex justify-between text-base font-extrabold pt-2 mt-1 border-t border-line">
            <span>Total da devolução</span><span>{money(total)}</span>
          </div>
        </Modal>
      )}
    </div>
  );
}
