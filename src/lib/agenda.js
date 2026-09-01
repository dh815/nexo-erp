// Motor de disponibilidade da Agenda: cruza o expediente do profissional,
// a duração do serviço, os bloqueios/folgas e os agendamentos que já
// existem no dia para descobrir quais horários ainda podem ser marcados.
// Sem dependência externa de biblioteca de datas — só string 'YYYY-MM-DD'
// e 'HH:MM', que é o suficiente para o que a Agenda precisa.

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
export const DIAS_SEMANA_LABEL = {
  dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado',
};

export function diaSemanaKey(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return DIAS_SEMANA[new Date(ano, mes - 1, dia).getDay()];
}

export function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function paraHora(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function somarMinutos(hora, minutos) {
  return paraHora(paraMinutos(hora) + minutos);
}

function sobrepoe(aInicio, aFim, bInicio, bFim) {
  return aInicio < bFim && bInicio < aFim;
}

function intervalosBloqueio(bloqueiosDoDia) {
  return bloqueiosDoDia.map((b) => ({
    inicio: b.diaTodo ? 0 : paraMinutos(b.horaInicio),
    fim: b.diaTodo ? 24 * 60 : paraMinutos(b.horaFim),
  }));
}

function intervalosAgendados(agendamentosDoDia, ignorarId) {
  return agendamentosDoDia
    .filter((a) => a.status !== 'cancelado' && a.id !== ignorarId)
    .map((a) => ({ inicio: paraMinutos(a.horaInicio), fim: paraMinutos(a.horaFim) }));
}

// Expediente do profissional num dia específico (ou null se ele não atende
// nesse dia da semana).
export function expedienteDoDia(profissional, dataISO) {
  const dia = profissional?.horarios?.[diaSemanaKey(dataISO)];
  return dia?.ativo ? dia : null;
}

// Lista de horários de início (strings 'HH:MM') possíveis para um serviço de
// `duracaoMinutos` no dia `dataISO`, considerando expediente, bloqueios e
// agendamentos existentes. Não sugere horário que já passou, se o dia for hoje.
export function slotsDisponiveis({ profissional, dataISO, duracaoMinutos, agendamentosDoDia = [], bloqueiosDoDia = [], granularidade = 15 }) {
  const expediente = expedienteDoDia(profissional, dataISO);
  if (!expediente || !duracaoMinutos) return [];

  const inicioExpediente = paraMinutos(expediente.inicio);
  const fimExpediente = paraMinutos(expediente.fim);
  const ocupados = [...intervalosBloqueio(bloqueiosDoDia), ...intervalosAgendados(agendamentosDoDia)];

  const agora = new Date();
  const ehHoje = dataISO === agora.toISOString().slice(0, 10);
  const minutoAgora = agora.getHours() * 60 + agora.getMinutes();

  const slots = [];
  for (let inicio = inicioExpediente; inicio + duracaoMinutos <= fimExpediente; inicio += granularidade) {
    if (ehHoje && inicio < minutoAgora) continue;
    const fim = inicio + duracaoMinutos;
    if (!ocupados.some((o) => sobrepoe(inicio, fim, o.inicio, o.fim))) slots.push(paraHora(inicio));
  }
  return slots;
}

// Usado ao salvar um agendamento (o horário pode ter sido digitado à mão, não
// necessariamente escolhido de slotsDisponiveis) para garantir que não cria
// choque de horário para o mesmo profissional. `ignorarId` serve para editar
// um agendamento existente sem ele conflitar consigo mesmo.
export function temConflito({ agendamentosDoDia = [], bloqueiosDoDia = [], profissionalId, horaInicio, horaFim, ignorarId }) {
  const novoInicio = paraMinutos(horaInicio);
  const novoFim = paraMinutos(horaFim);
  const agendados = agendamentosDoDia.filter((a) => a.profissionalId === profissionalId);
  const bloqueios = bloqueiosDoDia.filter((b) => b.profissionalId === profissionalId);
  return (
    intervalosAgendados(agendados, ignorarId).some((o) => sobrepoe(novoInicio, novoFim, o.inicio, o.fim)) ||
    intervalosBloqueio(bloqueios).some((o) => sobrepoe(novoInicio, novoFim, o.inicio, o.fim))
  );
}
