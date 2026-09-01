import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { Card, Modal, Field, inputClass, Button, Loading, EmptyState, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { uploadImage } from '../lib/cloudinary';
import { DIAS_SEMANA_LABEL } from '../lib/agenda';
import { useUIFeedback } from '../context/UIFeedbackContext';

const diasOrdem = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const horarioPadrao = () => Object.fromEntries(diasOrdem.map((d) => [d, { ativo: !['sab', 'dom'].includes(d), inicio: '09:00', fim: '19:00' }]));

const emptyForm = { nome: '', telefone: '', fotoUrl: '', servicosIds: [], ativo: true, horarios: horarioPadrao() };

export default function Profissionais() {
  const { data: profissionais, loading, add, update, remove } = useCollection('profissionais', { orderByField: 'nome', direction: 'asc' });
  const { data: servicos } = useCollection('servicos', { orderByField: 'nome', direction: 'asc' });
  const { notify, confirm } = useUIFeedback();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  function openNew() { setForm(emptyForm); setModal({}); }
  function openEdit(p) { setForm({ ...emptyForm, ...p, horarios: { ...horarioPadrao(), ...p.horarios } }); setModal(p); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function toggleServico(id) {
    setForm((f) => ({
      ...f,
      servicosIds: f.servicosIds.includes(id) ? f.servicosIds.filter((x) => x !== id) : [...f.servicosIds, id],
    }));
  }

  function setHorario(dia, campo, valor) {
    setForm((f) => ({ ...f, horarios: { ...f.horarios, [dia]: { ...f.horarios[dia], [campo]: valor } } }));
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'profissionais');
      set('fotoUrl', url);
    } catch (err) {
      notify('Não foi possível enviar a foto. Verifique a configuração do Cloudinary.', { type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.nome.trim()) return;
    if (modal.id) await update(modal.id, form);
    else await add(form);
    setModal(null);
  }

  async function handleDelete(p) {
    if (!(await confirm({ message: `Excluir ${p.nome} da equipe? Agendamentos já feitos não são afetados.`, confirmLabel: 'Excluir', danger: true }))) return;
    await remove(p.id);
  }

  return (
    <div>
      <PageHeader crumb="Agenda" title="Profissionais" subtitle="Equipe, serviços que cada um faz e horário de trabalho" actionLabel="Novo profissional" onAction={openNew} />

      {loading ? <Loading /> : profissionais.length === 0 ? (
        <EmptyState message="Nenhum profissional cadastrado ainda. Cadastre o primeiro." />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {profissionais.map((p) => (
            <Card key={p.id} className="p-4.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-bg-soft-2 flex items-center justify-center overflow-hidden shrink-0 text-faint">
                  {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" /> : <Icon.userCheck className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13.5px] truncate">{p.nome}</div>
                  <div className="text-[11px] text-faint truncate">{p.telefone || 'Sem telefone'}</div>
                </div>
                {p.ativo !== false ? <Pill color="green">Ativo</Pill> : <Pill color="gray">Inativo</Pill>}
              </div>
              <div className="text-[11px] text-muted mt-3">
                {(p.servicosIds || []).length > 0
                  ? `${p.servicosIds.length} serviço${p.servicosIds.length > 1 ? 's' : ''}`
                  : 'Nenhum serviço vinculado'}
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => openEdit(p)} className="flex-1 text-[11.5px] font-bold text-primary-dark border border-line rounded-lg px-2.5 py-1.5 hover:bg-primary-light">Editar</button>
                <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-danger shrink-0">
                  <Icon.trash className="w-[14px] h-[14px]" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editar profissional' : 'Novo profissional'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Foto (opcional)">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-bg-soft-2 flex items-center justify-center overflow-hidden shrink-0">
                {form.fotoUrl ? <img src={form.fotoUrl} className="w-full h-full object-cover" /> : <Icon.userCheck className="w-5 h-5 text-faint" />}
              </div>
              <label className="text-xs font-semibold text-primary-dark cursor-pointer">
                {uploading ? 'Enviando...' : 'Escolher foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploading} />
              </label>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"><input className={inputClass} value={form.nome} onChange={(e) => set('nome', e.target.value)} autoFocus /></Field>
            <Field label="Telefone/WhatsApp"><input className={inputClass} value={form.telefone} onChange={(e) => set('telefone', e.target.value)} /></Field>
          </div>

          <Field label="Serviços que realiza">
            {servicos.length === 0 ? (
              <div className="text-[12px] text-faint">Cadastre serviços primeiro para vincular aqui.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {servicos.map((s) => (
                  <button type="button" key={s.id} onClick={() => toggleServico(s.id)}
                    className={`text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border ${
                      form.servicosIds.includes(s.id) ? 'bg-primary-light text-primary-dark border-primary' : 'bg-white text-muted border-line hover:bg-bg-soft'
                    }`}>
                    {s.nome}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="Horário de trabalho">
            <div className="flex flex-col gap-1.5">
              {diasOrdem.map((dia) => (
                <div key={dia} className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 w-[92px] shrink-0 text-[12px] font-semibold text-muted cursor-pointer">
                    <input type="checkbox" checked={form.horarios[dia].ativo} onChange={(e) => setHorario(dia, 'ativo', e.target.checked)} />
                    {DIAS_SEMANA_LABEL[dia]}
                  </label>
                  <input type="time" disabled={!form.horarios[dia].ativo} value={form.horarios[dia].inicio}
                    onChange={(e) => setHorario(dia, 'inicio', e.target.value)}
                    className={`${inputClass} py-1 text-[12px] disabled:opacity-40`} />
                  <span className="text-faint text-[11px]">até</span>
                  <input type="time" disabled={!form.horarios[dia].ativo} value={form.horarios[dia].fim}
                    onChange={(e) => setHorario(dia, 'fim', e.target.value)}
                    className={`${inputClass} py-1 text-[12px] disabled:opacity-40`} />
                </div>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-muted cursor-pointer mt-1">
            <input type="checkbox" checked={form.ativo !== false} onChange={(e) => set('ativo', e.target.checked)} />
            Profissional ativo (aparece na Agenda)
          </label>
        </Modal>
      )}
    </div>
  );
}
