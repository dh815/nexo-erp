import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { Card, Modal, Field, inputClass, Button, Loading, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { expedienteDoDia, paraMinutos, somarMinutos } from '../lib/agenda';
import { criarAgendamento, atualizarStatusAgendamento, excluirAgendamento } from '../lib/agendamentos';
import { useUIFeedback } from '../context/UIFeedbackContext';

const DAY_START = 7 * 60; // 07:00
const DAY_END = 21 * 60; // 21:00
const PX_MIN = 1.4;
const HOUR_MARKS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

const STATUS_INFO = {
  agendado: { label: 'Agendado', color: 'blue' },
  confirmado: { label: 'Confirmado', color: 'green' },
  concluido: { label: 'Concluído', color: 'gray' },
  cancelado: { label: 'Cancelado', color: 'red' },
  'nao-compareceu': { label: 'Não compareceu', color: 'orange' },
};
const statusBorda = { agendado: 'border-l-primary', confirmado: 'border-l-success', concluido: 'border-l-faint', cancelado: 'border-l-danger', 'nao-compareceu': 'border-l-warning' };

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function somarDias(dataISO, n) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const dt = new Date(a, m - 1, d + n);
  return dt.toISOString().slice(0, 10);
}
function formatarDataLonga(dataISO) {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

const emptyForm = { clienteId: '', clienteNome: '', clienteWhatsapp: '', servicoId: '', profissionalId: '', data: hojeISO(), horaInicio: '09:00', observacoes: '' };

export default function Agenda() {
  const { empresaId } = useAuth();
  const { data: profissionais, loading: l1 } = useCollection('profissionais', { orderByField: 'nome', direction: 'asc' });
  const { data: servicos, loading: l2 } = useCollection('servicos', { orderByField: 'nome', direction: 'asc' });
  const { data: clientes } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });
  const { data: agendamentos, loading: l3 } = useCollection('agendamentos');
  const { notify, confirm } = useUIFeedback();
  const loading = l1 || l2 || l3;

  const [selectedDate, setSelectedDate] = useState(hojeISO());
  const [form, setForm] = useState(emptyForm);
  const [novoModal, setNovoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detalheModal, setDetalheModal] = useState(null);
  const [clienteAvulso, setClienteAvulso] = useState(true);

  const profissionaisAtivos = useMemo(() => profissionais.filter((p) => p.ativo !== false), [profissionais]);
  const servicosAtivos = useMemo(() => servicos.filter((s) => s.ativo !== false), [servicos]);
  const agendamentosDoDia = useMemo(() => agendamentos.filter((a) => a.data === selectedDate), [agendamentos, selectedDate]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function abrirNovo({ profissionalId = '', horaInicio = '09:00' } = {}) {
    setForm({ ...emptyForm, data: selectedDate, profissionalId, horaInicio });
    setClienteAvulso(true);
    setNovoModal(true);
  }

  function clickColuna(e, profissional) {
    const expediente = expedienteDoDia(profissional, selectedDate);
    if (!expediente) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let minutos = DAY_START + Math.round(y / PX_MIN / 15) * 15;
    minutos = Math.min(Math.max(minutos, paraMinutos(expediente.inicio)), paraMinutos(expediente.fim) - 5);
    abrirNovo({ profissionalId: profissional.id, horaInicio: `${Math.floor(minutos / 60).toString().padStart(2, '0')}:${(minutos % 60).toString().padStart(2, '0')}` });
  }

  const servicoEscolhido = servicos.find((s) => s.id === form.servicoId);
  const profissionaisParaServico = form.servicoId
    ? profissionaisAtivos.filter((p) => (p.servicosIds || []).includes(form.servicoId))
    : profissionaisAtivos;

  async function handleCriar() {
    if (!form.clienteNome.trim() || !form.servicoId || !form.profissionalId || !form.horaInicio) {
      notify('Preencha cliente, serviço, profissional e horário.', { type: 'error' });
      return;
    }
    const servico = servicos.find((s) => s.id === form.servicoId);
    const profissional = profissionais.find((p) => p.id === form.profissionalId);
    setSaving(true);
    try {
      await criarAgendamento(empresaId, {
        clienteId: form.clienteId || null,
        clienteNome: form.clienteNome.trim(),
        clienteWhatsapp: form.clienteWhatsapp || '',
        servicoId: servico.id,
        servicoNome: servico.nome,
        duracaoMinutos: servico.duracaoMinutos,
        preco: servico.preco || 0,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        data: form.data,
        horaInicio: form.horaInicio,
        observacoes: form.observacoes,
      }, { agendamentosDoDia: agendamentos.filter((a) => a.data === form.data) });
      notify('Agendamento criado com sucesso.', { type: 'success' });
      setNovoModal(false);
      setSelectedDate(form.data);
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function mudarStatus(agendamento, status) {
    await atualizarStatusAgendamento(empresaId, agendamento.id, status);
    setDetalheModal((d) => d && { ...d, status });
  }

  async function handleExcluir(agendamento) {
    if (!(await confirm({ message: `Excluir o agendamento de ${agendamento.clienteNome}?`, confirmLabel: 'Excluir', danger: true }))) return;
    await excluirAgendamento(empresaId, agendamento.id);
    setDetalheModal(null);
  }

  if (loading) return <Loading />;

  if (profissionaisAtivos.length === 0) {
    return (
      <div>
        <PageHeader crumb="Agenda" title="Agenda" subtitle="Sua central de agendamentos, dia a dia" />
        <Card className="p-8 text-center">
          <div className="font-bold text-[14.5px] mb-1.5">Cadastre sua equipe primeiro</div>
          <div className="text-[13px] text-muted mb-4">A Agenda mostra um dia por vez, com uma coluna para cada profissional ativo. Cadastre pelo menos um profissional para começar a marcar horários.</div>
          <Link to="/profissionais" className="inline-block">
            <Button>Ir para Profissionais</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader crumb="Agenda" title="Agenda" subtitle="Clique num horário livre na coluna do profissional para marcar" actionLabel="Novo agendamento" onAction={() => abrirNovo()} />

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setSelectedDate((d) => somarDias(d, -1))} className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:bg-bg-soft">‹</button>
        <button onClick={() => setSelectedDate(hojeISO())} className="text-[11.5px] font-bold text-primary-dark border border-line rounded-lg px-2.5 py-1.5 hover:bg-primary-light">Hoje</button>
        <button onClick={() => setSelectedDate((d) => somarDias(d, 1))} className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:bg-bg-soft">›</button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={`${inputClass} w-auto py-1.5`} />
        <span className="text-[13px] font-bold capitalize ml-1">{formatarDataLonga(selectedDate)}</span>
      </div>

      <Card className="overflow-x-auto">
        <div className="flex min-w-fit">
          <div className="w-14 shrink-0 pt-9 border-r border-line">
            {HOUR_MARKS.map((m) => (
              <div key={m} style={{ height: 60 * PX_MIN }} className="text-[10.5px] text-faint text-right pr-2 -mt-1.5">{Math.floor(m / 60).toString().padStart(2, '0')}:00</div>
            ))}
          </div>
          {profissionaisAtivos.map((p) => {
            const expediente = expedienteDoDia(p, selectedDate);
            const agendamentosDoProfissional = agendamentosDoDia.filter((a) => a.profissionalId === p.id);
            return (
              <div key={p.id} className="w-[190px] shrink-0 border-r border-line last:border-r-0">
                <div className="h-9 flex items-center justify-center gap-1.5 border-b border-line px-2 sticky top-0 bg-white">
                  <div className="w-5 h-5 rounded-full bg-bg-soft-2 overflow-hidden shrink-0 flex items-center justify-center text-faint">
                    {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : <Icon.userCheck className="w-3 h-3" />}
                  </div>
                  <span className="text-[12px] font-bold truncate">{p.nome}</span>
                </div>
                <div
                  className={`relative ${expediente ? 'cursor-cell' : 'bg-bg-soft cursor-not-allowed'}`}
                  style={{ height: (DAY_END - DAY_START) * PX_MIN }}
                  onClick={(e) => clickColuna(e, p)}
                >
                  {HOUR_MARKS.map((m) => (
                    <div key={m} className="absolute left-0 right-0 border-t border-[#f0f2f8]" style={{ top: (m - DAY_START) * PX_MIN }} />
                  ))}
                  {!expediente && (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-faint text-center px-3">Não atende neste dia</div>
                  )}
                  {expediente && (
                    <>
                      {paraMinutos(expediente.inicio) > DAY_START && (
                        <div className="absolute left-0 right-0 top-0 bg-bg-soft/70" style={{ height: (paraMinutos(expediente.inicio) - DAY_START) * PX_MIN }} />
                      )}
                      {paraMinutos(expediente.fim) < DAY_END && (
                        <div className="absolute left-0 right-0 bottom-0 bg-bg-soft/70" style={{ height: (DAY_END - paraMinutos(expediente.fim)) * PX_MIN }} />
                      )}
                    </>
                  )}
                  {agendamentosDoProfissional.map((a) => {
                    const top = (paraMinutos(a.horaInicio) - DAY_START) * PX_MIN;
                    const altura = Math.max((paraMinutos(a.horaFim) - paraMinutos(a.horaInicio)) * PX_MIN, 22);
                    return (
                      <button key={a.id}
                        onClick={(e) => { e.stopPropagation(); setDetalheModal(a); }}
                        className={`absolute left-1 right-1 rounded-md border-l-[3px] ${statusBorda[a.status] || statusBorda.agendado} bg-white shadow-card text-left px-1.5 py-1 overflow-hidden hover:shadow-card-lg ${a.status === 'cancelado' ? 'opacity-50' : ''}`}
                        style={{ top, height: altura }}>
                        <div className="text-[10.5px] font-bold truncate leading-tight">{a.horaInicio} {a.clienteNome}</div>
                        <div className="text-[10px] text-muted truncate leading-tight">{a.servicoNome}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {novoModal && (
        <Modal title="Novo agendamento" onClose={() => setNovoModal(false)}
          footer={<><Button variant="ghost" onClick={() => setNovoModal(false)}>Cancelar</Button><Button onClick={handleCriar} disabled={saving}>{saving ? 'Salvando...' : 'Criar agendamento'}</Button></>}>
          <Field label="Cliente">
            {!clienteAvulso ? (
              <select className={inputClass} value={form.clienteId}
                onChange={(e) => {
                  const c = clientes.find((x) => x.id === e.target.value);
                  set('clienteId', e.target.value); set('clienteNome', c?.nome || ''); set('clienteWhatsapp', c?.whatsapp || '');
                }}>
                <option value="">Selecione um cliente cadastrado...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Nome do cliente" value={form.clienteNome} onChange={(e) => set('clienteNome', e.target.value)} />
                <input className={inputClass} placeholder="WhatsApp (opcional)" value={form.clienteWhatsapp} onChange={(e) => set('clienteWhatsapp', e.target.value)} />
              </div>
            )}
            <button type="button" onClick={() => { setClienteAvulso((v) => !v); set('clienteId', ''); set('clienteNome', ''); set('clienteWhatsapp', ''); }}
              className="text-[11px] font-bold text-primary-dark mt-1.5">
              {clienteAvulso ? 'Escolher cliente já cadastrado' : 'Digitar nome (cliente avulso)'}
            </button>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Serviço">
              <select className={inputClass} value={form.servicoId} onChange={(e) => { set('servicoId', e.target.value); set('profissionalId', ''); }}>
                <option value="">Selecione...</option>
                {servicosAtivos.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.duracaoMinutos}min</option>)}
              </select>
            </Field>
            <Field label="Profissional">
              <select className={inputClass} value={form.profissionalId} onChange={(e) => set('profissionalId', e.target.value)}>
                <option value="">Selecione...</option>
                {profissionaisParaServico.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" className={inputClass} value={form.data} onChange={(e) => set('data', e.target.value)} /></Field>
            <Field label="Horário de início"><input type="time" className={inputClass} value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} /></Field>
          </div>
          {servicoEscolhido && (
            <div className="text-[11.5px] text-muted -mt-1.5 mb-3">
              Termina às {somarMinutos(form.horaInicio || '00:00', servicoEscolhido.duracaoMinutos)} · {money(servicoEscolhido.preco)}
            </div>
          )}
          <Field label="Observações (opcional)"><textarea className={inputClass} rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Field>
        </Modal>
      )}

      {detalheModal && (
        <Modal title={detalheModal.clienteNome} onClose={() => setDetalheModal(null)}
          footer={<><Button variant="danger" onClick={() => handleExcluir(detalheModal)}>Excluir</Button><Button variant="ghost" onClick={() => setDetalheModal(null)}>Fechar</Button></>}>
          <div className="flex items-center gap-2 mb-3">
            <Pill color={(STATUS_INFO[detalheModal.status] || STATUS_INFO.agendado).color}>{(STATUS_INFO[detalheModal.status] || STATUS_INFO.agendado).label}</Pill>
          </div>
          <div className="text-[13px] flex flex-col gap-1.5 mb-4">
            <div><b>Serviço:</b> {detalheModal.servicoNome}</div>
            <div><b>Profissional:</b> {detalheModal.profissionalNome}</div>
            <div><b>Quando:</b> {formatarDataLonga(detalheModal.data)}, {detalheModal.horaInicio}–{detalheModal.horaFim}</div>
            <div><b>Valor:</b> {money(detalheModal.preco)}</div>
            {detalheModal.clienteWhatsapp && <div><b>WhatsApp:</b> {detalheModal.clienteWhatsapp}</div>}
            {detalheModal.observacoes && <div><b>Observações:</b> {detalheModal.observacoes}</div>}
          </div>
          <div className="text-[11.5px] font-bold text-muted mb-1.5">Mudar status</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_INFO).map(([key, info]) => (
              <button key={key} onClick={() => mudarStatus(detalheModal, key)}
                disabled={detalheModal.status === key}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${detalheModal.status === key ? 'bg-primary-light text-primary-dark border-primary' : 'bg-white text-muted border-line hover:bg-bg-soft'}`}>
                {info.label}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
