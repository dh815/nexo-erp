import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { Modal, Field, inputClass, Button, Pill } from '../components/ui';
import { ProductPicker } from '../components/ProductPicker';
import { money } from '../lib/format';
import { createPedido, deletePedido } from '../lib/pedidos';

const formasPagamento = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência'];
const statusOptions = ['pago', 'parcial', 'pendente', 'atrasado'];
const statusColor = { pago: 'green', parcial: 'blue', pendente: 'orange', atrasado: 'red' };

const emptyForm = {
  clienteId: '', clienteNome: '', data: new Date().toISOString().slice(0, 10),
  desconto: 0, frete: 0, formaPagamento: 'Pix', numeroParcelas: 0, diasVencimentoBoleto: 30,
  status: 'pendente', observacoes: '',
};

export default function Pedidos() {
  const { empresaId } = useAuth();
  const { data: pedidos, loading, update, remove: removeDoc } = useCollection('pedidos');
  const { data: clientes } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });
  const { data: produtos } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });

  const [modal, setModal] = useState(null); // 'new' | pedido (view/edit) | null
  const [form, setForm] = useState(emptyForm);
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  function openNew() { setForm(emptyForm); setCart([]); setModal('new'); }
  function openView(p) { setModal(p); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const descontoVal = subtotal * (Number(form.desconto) / 100 || 0);
    const total = Math.max(subtotal - descontoVal + (Number(form.frete) || 0), 0);
    return { subtotal, descontoVal, total };
  }, [cart, form.desconto, form.frete]);

  const geraParcelas = form.formaPagamento === 'Boleto' || (form.formaPagamento === 'Cartão' && Number(form.numeroParcelas) > 0);

  async function handleCreate() {
    if (!form.clienteNome || cart.length === 0) {
      alert('Selecione um cliente e ao menos um produto.');
      return;
    }
    setSaving(true);
    try {
      await createPedido(empresaId, {
        ...form,
        itens: cart,
        valorTotal: totals.total,
      });
      setModal(null);
    } catch (err) {
      alert('Não foi possível criar o pedido: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pedido) {
    if (!confirm(`Excluir o pedido de ${pedido.clienteNome}? O estoque dos produtos será devolvido.`)) return;
    await deletePedido(empresaId, pedido);
  }

  async function handleStatusChange(pedido, status) {
    await update(pedido.id, { status });
  }

  const columns = [
    { key: 'cliente', header: 'Cliente', render: (r) => <button className="font-bold hover:text-primary-dark" onClick={() => openView(r)}>{r.clienteNome}</button> },
    { key: 'data', header: 'Data', render: (r) => <span className="text-muted">{r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '—'}</span> },
    { key: 'itens', header: 'Itens', render: (r) => <span className="text-muted">{r.itens?.length || 0} itens</span> },
    { key: 'valorTotal', header: 'Valor total', render: (r) => <b>{money(r.valorTotal)}</b> },
    { key: 'pagamento', header: 'Pagamento', render: (r) => <span className="text-muted">{r.formaPagamento} · {r.numeroParcelas > 0 ? `${r.numeroParcelas}x` : 'à vista'}</span> },
    { key: 'status', header: 'Status', render: (r) => <Pill color={statusColor[r.status] || 'gray'}>{r.status}</Pill> },
  ];

  return (
    <div>
      <PageHeader crumb="Vendas" title="Pedidos de Venda" subtitle="Acompanhe todos os pedidos, status e parcelas" actionLabel="Novo pedido" onAction={openNew} />

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={pedidos} loading={loading} onDelete={handleDelete}
          emptyMessage="Nenhum pedido registrado ainda." />
      </div>

      {modal === 'new' && (
        <Modal title="Novo pedido de venda" onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Salvando...' : 'Criar pedido'}</Button></>}>
          <Field label="Cliente">
            <select className={inputClass} value={form.clienteId}
              onChange={(e) => {
                const c = clientes.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, clienteId: e.target.value, clienteNome: c?.nome || '' }));
              }}>
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>

          <Field label="Produtos">
            <ProductPicker produtos={produtos} cart={cart} onChange={setCart} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desconto (%)"><input type="number" className={inputClass} value={form.desconto} onChange={(e) => set('desconto', e.target.value)} /></Field>
            <Field label="Frete (R$)"><input type="number" className={inputClass} value={form.frete} onChange={(e) => set('frete', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Forma de pagamento">
              <select className={inputClass} value={form.formaPagamento} onChange={(e) => set('formaPagamento', e.target.value)}>
                {formasPagamento.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Parcelas">
              <select className={inputClass} value={form.numeroParcelas} onChange={(e) => set('numeroParcelas', Number(e.target.value))}>
                <option value={0}>{form.formaPagamento === 'Boleto' ? '1 boleto único' : '0x — à vista'}</option>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}x</option>)}
              </select>
            </Field>
          </div>
          {form.formaPagamento === 'Boleto' && (
            <Field label="Vencimento do 1º boleto (dias após a data do pedido)">
              <input type="number" min="1" className={inputClass} value={form.diasVencimentoBoleto} onChange={(e) => set('diasVencimentoBoleto', e.target.value)} />
            </Field>
          )}
          <div className="text-[11.5px] text-muted -mt-1.5 mb-3">
            {geraParcelas
              ? form.formaPagamento === 'Boleto'
                ? `Vai gerar ${Math.max(Number(form.numeroParcelas), 1)} boleto(s) no Calendário — o 1º vence em ${form.diasVencimentoBoleto} dias, os seguintes a cada 30 dias.`
                : `Vai gerar ${form.numeroParcelas} parcela(s) no Calendário financeiro (1 por mês).`
              : 'Recebido à vista, não gera parcela no calendário.'}
          </div>
          <Field label="Data"><input type="date" className={inputClass} value={form.data} onChange={(e) => set('data', e.target.value)} /></Field>
          <Field label="Observações"><textarea className={inputClass} rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Field>

          <div className="bg-bg-soft rounded-xl p-4 mt-2">
            <div className="flex justify-between text-[13px] text-muted py-1"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex justify-between text-[13px] text-muted py-1"><span>Desconto</span><span>- {money(totals.descontoVal)}</span></div>
            <div className="flex justify-between text-[13px] text-muted py-1"><span>Frete</span><span>+ {money(Number(form.frete) || 0)}</span></div>
            <div className="flex justify-between text-base font-extrabold pt-2 mt-1 border-t border-line">
              <span>Total {geraParcelas ? `(${Math.max(Number(form.numeroParcelas), 1)}x de ${money(totals.total / Math.max(Number(form.numeroParcelas), 1))})` : '(à vista)'}</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </Modal>
      )}

      {modal && modal !== 'new' && (
        <Modal title={`Pedido de ${modal.clienteNome}`} onClose={() => setModal(null)}
          footer={<Button variant="ghost" onClick={() => setModal(null)}>Fechar</Button>}>
          <div className="mb-3">
            <span className="text-[11.5px] font-bold text-muted block mb-1.5">Status</span>
            <select className={inputClass} value={modal.status} onChange={(e) => { handleStatusChange(modal, e.target.value); setModal({ ...modal, status: e.target.value }); }}>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="text-[11.5px] font-bold text-muted mb-1.5">Itens</div>
          <div className="flex flex-col gap-1.5 mb-3">
            {(modal.itens || []).map((i, idx) => (
              <div key={idx} className="flex justify-between text-[13px] border-b border-[#f0f2f8] py-1.5">
                <span>{i.quantidade}× {i.nome}</span>
                <span className="font-semibold">{money(i.quantidade * i.precoUnitario)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-base font-extrabold pt-2 border-t border-line">
            <span>Total {modal.numeroParcelas > 0 ? `(${modal.numeroParcelas}x)` : '(à vista)'}</span><span>{money(modal.valorTotal)}</span>
          </div>
          {modal.observacoes && <div className="text-[12.5px] text-muted mt-3">{modal.observacoes}</div>}
        </Modal>
      )}
    </div>
  );
}
