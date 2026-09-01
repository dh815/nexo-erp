// Integração com a API oficial do WhatsApp Business (Meta Cloud API).
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
const GRAPH_VERSION = 'v21.0';

function credenciaisOk() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// GET /webhook — handshake de verificação exigido pela Meta ao salvar a URL
// do webhook. Precisa devolver o "hub.challenge" em texto puro se o token
// enviado bater com WHATSAPP_VERIFY_TOKEN.
export function verificarWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

// POST /webhook — mensagens recebidas do cliente e atualizações de status.
// Por enquanto só loga; dá pra evoluir pra, por exemplo, marcar o
// agendamento como "confirmado pelo cliente" quando ele responder "sim".
export function receberWebhook(req, res) {
  try {
    const valor = req.body?.entry?.[0]?.changes?.[0]?.value;
    for (const msg of valor?.messages || []) {
      console.log('[whatsapp] mensagem recebida de', msg.from, ':', msg.text?.body || `(${msg.type})`);
    }
    for (const s of valor?.statuses || []) {
      console.log('[whatsapp] status', s.status, 'para', s.recipient_id);
    }
  } catch (err) {
    console.error('[whatsapp] erro processando webhook', err);
  }
  // A Meta espera 200 rápido; sempre responder OK mesmo se algo interno falhar,
  // senão ela fica reentregando o mesmo evento.
  res.sendStatus(200);
}

// Envia mensagem usando um template pré-aprovado pela Meta (obrigatório para
// iniciar conversa fora da janela de 24h). Crie os templates em
// Meta Business Manager > WhatsApp Manager > Modelos de mensagem, com os
// nomes usados em lib/notificacoes.js.
export async function enviarTemplate(paraNumero, nomeTemplate, parametros = []) {
  if (!credenciaisOk()) {
    console.warn(`[whatsapp] credenciais não configuradas — envio de "${nomeTemplate}" pulado (modo dev).`);
    return { pulado: true };
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: normalizarNumero(paraNumero),
    type: 'template',
    template: {
      name: nomeTemplate,
      language: { code: 'pt_BR' },
      components: parametros.length
        ? [{ type: 'body', parameters: parametros.map((texto) => ({ type: 'text', text: String(texto) })) }]
        : [],
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error('[whatsapp] falha ao enviar template', nomeTemplate, 'para', paraNumero, data);
    throw new Error(data?.error?.message || 'Falha ao enviar mensagem no WhatsApp');
  }
  return data;
}

// Números salvos no Brasil variam de formato (com/sem 55, com/sem 9º dígito,
// com máscara). A API exige formato E.164 sem "+" (ex: 5511988887777).
function normalizarNumero(numero) {
  const digitos = String(numero).replace(/\D/g, '');
  return digitos.startsWith('55') ? digitos : `55${digitos}`;
}
