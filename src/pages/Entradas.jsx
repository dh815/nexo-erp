import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { DataTable } from '../components/DataTable';
import { Modal, Field, inputClass, Button, Pill } from '../components/ui';
import { money, dateBR } from '../lib/format';

const emptyForm = { descricao: '', categoria: '', valor: '', data: '', formaPagamento: '', observacoes: '' };
const formasPagamento = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência'];

export default function Entradas() {
  const { data: entradas, loading, add, update, remove } = useCollection('entradas');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openNew() { setForm({ ...emptyForm, data: new Date().toISOString().slice(0, 10) }); setModal({}); }
  function openEdit(r) { setForm({ ...emptyForm, ...r }); setModal(r); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave() {
    if (!form.descricao.trim() || !form.valor) return;
    const payload = { ...form, valor: Number(form.valor) || 0 };
    if (modal.id) await update(modal.id, payload);
    else await add(payload);
    setModal(null);
  }

  const columns = [
    { key: 'descricao', header: 'Descrição', render: (r) => <b>{r.descricao}</b> },
    { key: 'categoria', header: 'Categoria', render: (r) => r.categoria ? <Pill color="blue">{r.categoria}</Pill> : '—' },
    { key: 'valor', header: 'Valor', render: (r) => <span className="font-semibold text-success">+ {money(r.valor)}</span> },
    { key: 'data', header: 'Data', render: (r) => <span className="text-muted">{r.data ? new Date(r.data).toLocaleDateString('pt-BR') : dateBR(r.criadoEm)}</span> },
    { key: 'formaPagamento', header: 'Pagamento', render: (r) => <span className="text-muted">{r.formaPagamento || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader crumb="Financeiro" title="Entradas" subtitle="Registre e acompanhe todos os recebimentos da empresa" actionLabel="Nova entrada" onAction={openNew} />

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={entradas} loading={loading} onEdit={openEdit} onDelete={(r) => remove(r.id)}
          emptyMessage="Nenhuma entrada registrada ainda." />
      </div>

      {modal && (
        <Modal title={modal.id ? 'Editar entrada' : 'Nova entrada'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Descrição"><input className={inputClass} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria"><input className={inputClass} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ex: Vendas" /></Field>
            <Field label="Valor (R$)"><input type="number" className={inputClass} value={form.valor} onChange={(e) => set('valor', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" className={inputClass} value={form.data} onChange={(e) => set('data', e.target.value)} /></Field>
            <Field label="Forma de pagamento">
              <select className={inputClass} value={form.formaPagamento} onChange={(e) => set('formaPagamento', e.target.value)}>
                <option value="">Selecione...</option>
                {formasPagamento.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Observações"><textarea className={inputClass} rows={3} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
