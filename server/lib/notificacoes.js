// Job em segundo plano que roda a cada poucos minutos e cuida de duas coisas:
// 1) confirmação automática assim que um agendamento novo é criado;
// 2) lembrete automático perto do horário marcado.
// Os agendamentos ficam em empresas/{empresaId}/agendamentos (multi-tenant),
// então usamos collectionGroup pra varrer todas as empresas de uma vez.
import { getDb } from './firebaseAdmin.js';
import { enviarTemplate } from './whatsapp.js';

const INTERVALO_MS = 5 * 60 * 1000; // a cada 5 minutos
const ANTECEDENCIA_LEMBRETE_MIN = 120; // lembrete até 2h antes do horário

async function processarConfirmacoes(db) {
  const snap = await db.collectionGroup('agendamentos')
    .where('status', '==', 'agendado')
    .where('confirmacaoEnviada', '==', false)
    .limit(50)
    .get();

  for (const docSnap of snap.docs) {
    const ag = docSnap.data();
    if (!ag.clienteWhatsapp) continue;
    try {
      await enviarTemplate(ag.clienteWhatsapp, 'confirmacao_agendamento', [
        ag.clienteNome, ag.servicoNome, formatarDataHora(ag),
      ]);
      await docSnap.ref.update({ confirmacaoEnviada: true, confirmacaoEnviadaEm: new Date() });
      console.log('[notificacoes] confirmação enviada:', docSnap.ref.path);
    } catch (err) {
      console.error('[notificacoes] erro enviando confirmação', docSnap.ref.path, err.message);
    }
  }
}

async function processarLembretes(db) {
  const snap = await db.collectionGroup('agendamentos')
    .where('status', '==', 'agendado')
    .where('lembreteEnviado', '==', false)
    .limit(200)
    .get();

  const agora = new Date();
  for (const docSnap of snap.docs) {
    const ag = docSnap.data();
    if (!ag.clienteWhatsapp || !ag.data || !ag.horaInicio) continue;
    const horario = new Date(`${ag.data}T${ag.horaInicio}:00`);
    const minutosAte = (horario - agora) / 60000;
    if (minutosAte > ANTECEDENCIA_LEMBRETE_MIN || minutosAte < 0) continue;
    try {
      await enviarTemplate(ag.clienteWhatsapp, 'lembrete_agendamento', [
        ag.clienteNome, ag.servicoNome, formatarDataHora(ag),
      ]);
      await docSnap.ref.update({ lembreteEnviado: true, lembreteEnviadoEm: new Date() });
      console.log('[notificacoes] lembrete enviado:', docSnap.ref.path);
    } catch (err) {
      console.error('[notificacoes] erro enviando lembrete', docSnap.ref.path, err.message);
    }
  }
}

function formatarDataHora(ag) {
  const [ano, mes, dia] = ag.data.split('-');
  return `${dia}/${mes}/${ano} às ${ag.horaInicio}`;
}

export function iniciarPoller() {
  const rodar = async () => {
    try {
      const db = getDb();
      await processarConfirmacoes(db);
      await processarLembretes(db);
    } catch (err) {
      // Erro mais comum aqui no começo: falta configurar FIREBASE_SERVICE_ACCOUNT,
      // ou o Firestore pedindo pra criar um índice (a mensagem de erro do
      // Firestore já vem com o link direto pra criar o índice com 1 clique).
      console.error('[notificacoes] poller falhou:', err.message);
    }
  };
  rodar();
  setInterval(rodar, INTERVALO_MS);
}
