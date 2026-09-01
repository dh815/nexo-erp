// nexo-erp-server — serviço de backend separado da SPA principal.
// Existe só porque webhook e agendamento de tarefas (lembretes) não dá pra
// fazer numa SPA estática. Não tem nenhuma tela; é 100% API + job em segundo
// plano. Ver server/README.md para o passo a passo de configuração.
import 'dotenv/config';
import express from 'express';
import { verificarWebhook, receberWebhook } from './lib/whatsapp.js';
import { iniciarPoller } from './lib/notificacoes.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, servico: 'nexo-erp-server', hora: new Date().toISOString() });
});

// Verificação do webhook feita pela Meta ao salvar a URL em
// Meta for Developers > seu app > WhatsApp > Configuration > Webhook.
app.get('/webhook', verificarWebhook);

// Mensagens recebidas do cliente e atualizações de status (enviado/entregue/
// lido/falhou) dos envios feitos por nós chegam aqui.
app.post('/webhook', receberWebhook);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`nexo-erp-server rodando na porta ${PORT}`);
  iniciarPoller();
});
