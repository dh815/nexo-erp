import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { DataTable } from '../components/DataTable';
import { Modal, Field, inputClass, Button, Pill } from '../components/ui';
import { money } from '../lib/format';
import { useUIFeedback } from '../context/UIFeedbackContext';

const emptyForm = {
  nome: '', categoria: '', duracaoMinutos: 30, preco: '', descricao: '', ativo: true,
};

export default function Servicos() {
  const { data: servicos, loading, add, update, remove } = useCollection('servicos', { orderByField: 'nome', direction: 'asc' });
  const { confirm } = useUIFeedback();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openNew() { setForm(emptyForm); setModal({}); }
  function openEdit(s) { setForm({ ...emptyForm, ...s }); setModal(s); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave() {
    if (!form.nome.trim() || !form.duracaoMinutos) return;
    const payload = { ...form, duracaoMinutos: Number(form.duracaoMinutos) || 30, preco: Number(form.preco) || 0 };
    if (modal.id) await update(modal.id, payload);
    else await add(payload);
    setModal(null);
  }

  async function handleDelete(servico) {
    if (!(await confirm({ message: `Excluir o serviço "${servico.nome}"? Agendamentos já feitos não são afetados.`, confirmLabel: 'Excluir', danger: true }))) return;
    await remove(servico.id);
  }

  const columns = [
    { key: 'nome', header: 'Serviço', render: (r) => <b>{r.nome}</b> },
    { key: 'categoria', header: 'Categoria', render: (r) => <span className="text-muted">{r.categoria || '—'}</span> },
    { key: 'duracaoMinutos', header: 'Duração', render: (r) => <span className="text-muted">{r.duracaoMinutos} min</span> },
    { key: 'preco', header: 'Preço', render: (r) => <b>{money(r.preco)}</b> },
    { key: 'ativo', header: 'Status', render: (r) => r.ativo !== false ? <Pill color="green">Ativo</Pill> : <Pill color="gray">Inativo</Pill> },
  ];

  return (
    <div>
      <PageHeader crumb="Agenda" title="Serviços" subtitle="Cadastre os serviços que sua equipe oferece, com duração e preço" actionLabel="Novo serviço" onAction={openNew} />

      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={servicos} loading={loading} onEdit={openEdit} onDelete={handleDelete}
          emptyMessage="Nenhum serviço cadastrado ainda. Cadastre o primeiro." />
      </div>

      {modal && (
        <Modal title={modal.id ? 'Editar serviço' : 'Novo serviço'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Nome do serviço"><input className={inputClass} value={form.nome} onChange={(e) => set('nome', e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria (opcional)"><input className={inputClass} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ex: Cabelo, Estética..." /></Field>
            <Field label="Duração (minutos)"><input type="number" min="5" step="5" className={inputClass} value={form.duracaoMinutos} onChange={(e) => set('duracaoMinutos', e.target.value)} /></Field>
          </div>
          <Field label="Preço (R$)"><input type="number" step="0.01" className={inputClass} value={form.preco} onChange={(e) => set('preco', e.target.value)} /></Field>
          <Field label="Descrição (opcional)"><textarea className={inputClass} rows={2} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-muted cursor-pointer">
            <input type="checkbox" checked={form.ativo !== false} onChange={(e) => set('ativo', e.target.checked)} />
            Serviço ativo (aparece na hora de marcar um agendamento)
          </label>
        </Modal>
      )}
    </div>
  );
}
