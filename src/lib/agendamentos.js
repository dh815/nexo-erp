// CRUD de agendamentos com a regra de negócio que protege a Agenda de dupla
// marcação: nenhum agendamento pode ser criado ou reagendado para um horário
// que já conflita com outro agendamento (ou bloqueio/folga) do mesmo
// profissional. Segue o mesmo padrão de empresas/{empresaId}/{colecao} do
// useCollection, só que com validação antes de gravar (por isso não usa o
// hook genérico direto, como já acontece em lib/pedidos.js).

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { somarMinutos, temConflito } from './agenda';

function path(empresaId, nome) {
  return `empresas/${empresaId}/${nome}`;
}

// dados: { clienteId?, clienteNome, clienteWhatsapp?, servicoId, servicoNome,
//          duracaoMinutos, preco, profissionalId, profissionalNome, data,
//          horaInicio, observacoes? }
export async function criarAgendamento(empresaId, dados, { agendamentosDoDia = [], bloqueiosDoDia = [] } = {}) {
  const horaFim = somarMinutos(dados.horaInicio, dados.duracaoMinutos);
  if (temConflito({ agendamentosDoDia, bloqueiosDoDia, profissionalId: dados.profissionalId, horaInicio: dados.horaInicio, horaFim })) {
    throw new Error('Esse profissional já tem um compromisso nesse horário. Escolha outro horário.');
  }
  return addDoc(collection(db, path(empresaId, 'agendamentos')), {
    ...dados,
    horaFim,
    status: 'agendado',
    // Flags lidas pelo nexo-erp-server (job de WhatsApp) pra saber o que já
    // foi enviado. Sem WhatsApp do cliente, já nascem "concluídas" (não há
    // o que mandar), senão o poller nunca ia parar de tentar.
    confirmacaoEnviada: !dados.clienteWhatsapp,
    lembreteEnviado: !dados.clienteWhatsapp,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}

export async function reagendar(empresaId, agendamento, { data, horaInicio }, { agendamentosDoDia = [], bloqueiosDoDia = [] } = {}) {
  const horaFim = somarMinutos(horaInicio, agendamento.duracaoMinutos);
  if (temConflito({ agendamentosDoDia, bloqueiosDoDia, profissionalId: agendamento.profissionalId, horaInicio, horaFim, ignorarId: agendamento.id })) {
    throw new Error('Esse profissional já tem um compromisso nesse horário. Escolha outro horário.');
  }
  return updateDoc(doc(db, path(empresaId, 'agendamentos'), agendamento.id), {
    data, horaInicio, horaFim,
    // Mudou o horário: se já tinha lembrete mandado pro horário antigo, reseta
    // pra o job de WhatsApp mandar de novo pro horário novo.
    lembreteEnviado: agendamento.clienteWhatsapp ? false : agendamento.lembreteEnviado,
    atualizadoEm: serverTimestamp(),
  });
}

export async function atualizarStatusAgendamento(empresaId, id, status) {
  return updateDoc(doc(db, path(empresaId, 'agendamentos'), id), { status, atualizadoEm: serverTimestamp() });
}

export async function excluirAgendamento(empresaId, id) {
  return deleteDoc(doc(db, path(empresaId, 'agendamentos'), id));
}
