import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { DataTable } from '../components/DataTable';
import { Modal, Field, inputClass, Button } from '../components/ui';
import { money } from '../lib/format';

const emptyForm = {
  nome: '', whatsapp: '', email: '', documento: '', endereco: '',
  cidade: '', estado: '', cep: '', observacoes: '',
};

export default function Clientes() {
  const { data: clientes, loading, add, update, remove } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openNew() { setForm(emptyForm); setModal({}); }
  function openEdit(c) { setForm({ ...emptyForm, ...c }); setModal(c); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave() {
    if (!form.nome.trim()) return;
    if (modal.id) await update(modal.id, form);
    else await add({ ...form, totalComprado: 0, valorEmAberto: 0 });
    setModal(null);
  }

  const columns = [
    { key: 'nome', header: 'Cliente', render: (r) => <b>{r.nome}</b> },
    { key: 'cidade', header: 'Cidade/UF', render: (r) => <span className="text-muted">{r.cidade}{r.estado ? `/${r.estado}` : ''}</span> },
    { key: 'whatsapp', header: 'WhatsApp', render: (r) => <span className="text-muted">{r.whatsapp || '—'}</span> },
    { key: 'totalComprado', header: 'Total comprado', render: (r) => <b>{money(r.totalComprado)}</b> },
    { key: 'valorEmAberto', header: 'Em aberto', render: (r) => r.valorEmAberto > 0
        ? <span className="text-danger font-semibold">{money(r.valorEmAberto)}</span>
        : <span className="text-muted">—</span> },
  ];

  return (
    <div>
      <PageHeader crumb="Vendas" title="Clientes" subtitle="Base de clientes, histórico de compras e valores em aberto" actionLabel="Novo cliente" onAction={openNew} />

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={clientes} loading={loading} onEdit={openEdit} onDelete={(r) => remove(r.id)}
          emptyMessage="Nenhum cliente cadastrado ainda. Cadastre o primeiro." />
      </div>

      {modal && (
        <Modal title={modal.id ? 'Editar cliente' : 'Novo cliente'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Nome"><input className={inputClass} value={form.nome} onChange={(e) => set('nome', e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="WhatsApp"><input className={inputClass} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
            <Field label="E-mail"><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
          <Field label="CPF/CNPJ (opcional)"><input className={inputClass} value={form.documento} onChange={(e) => set('documento', e.target.value)} /></Field>
          <Field label="Endereço"><input className={inputClass} value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cidade"><input className={inputClass} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></Field>
            <Field label="Estado"><input className={inputClass} value={form.estado} onChange={(e) => set('estado', e.target.value)} /></Field>
            <Field label="CEP"><input className={inputClass} value={form.cep} onChange={(e) => set('cep', e.target.value)} /></Field>
          </div>
          <Field label="Observações"><textarea className={inputClass} rows={3} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
