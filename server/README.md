# nexo-erp-server

Backend separado da SPA principal, só pra coisas que uma SPA estática não
consegue fazer: receber webhook do WhatsApp e rodar um job em segundo plano
que manda confirmação e lembrete de agendamento pro cliente.

Não tem tela nenhuma. Roda como um segundo serviço no mesmo projeto Railway
do Nexo ERP, mesmo repositório GitHub, com "Root Directory" = `server`.

## O que ele faz hoje

- **Confirmação automática**: quando um agendamento novo é criado com o
  WhatsApp do cliente preenchido, manda uma mensagem de confirmação.
- **Lembrete automático**: até 2h antes do horário marcado, manda um
  lembrete (se ainda não tiver sido enviado).
- Um job interno confere isso a cada 5 minutos — não precisa de cron
  separado.

## Passo a passo pra deixar funcionando de verdade

Sem isso configurado, o serviço sobe normalmente mas só *loga* que pularia
o envio (não trava nem dá erro pro resto do sistema).

### 1. Conta e app na Meta

1. Tenha (ou crie) uma conta no [Meta Business Suite](https://business.facebook.com).
2. Vá em [developers.facebook.com/apps](https://developers.facebook.com/apps), crie um app do tipo **Business** e adicione o produto **WhatsApp**.
3. No painel do WhatsApp do app (API Setup), você já tem um número de teste pra começar. Anote:
   - **Phone number ID**
   - **Token de acesso temporário** (24h, só pra testar; pra produção, gere um token permanente via **System User** no Business Manager)

### 2. Templates de mensagem

Toda mensagem que a empresa inicia (fora de uma conversa já aberta pelo
cliente) precisa de um **template aprovado** pela Meta. Crie em
**WhatsApp Manager > Modelos de mensagem**:

- `confirmacao_agendamento` — categoria "Utilidade", corpo com 3 variáveis, ex.:
  `Olá {{1}}! Seu agendamento de {{2}} foi confirmado para {{3}}.`
- `lembrete_agendamento` — mesma ideia, ex.:
  `Olá {{1}}! Passando pra lembrar do seu {{2}} hoje às {{3}}.`

Aprovação costuma sair em minutos, às vezes até 1 dia.

### 3. Webhook

Depois que o serviço estiver publicado no Railway (próximo passo), configure
em **Meta for Developers > seu app > WhatsApp > Configuration > Webhook**:

- **Callback URL**: `https://<url-do-seu-servico>.up.railway.app/webhook`
- **Verify token**: o mesmo valor que você colocar em `WHATSAPP_VERIFY_TOKEN`
- Inscreva no campo **messages**

### 4. Firebase

Gere a chave de serviço em **Firebase Console > Configurações do projeto >
Contas de serviço > Gerar nova chave privada**. Isso baixa um `.json`. Copie
o conteúdo inteiro (como uma linha só) pra variável `FIREBASE_SERVICE_ACCOUNT`.

### 5. Variáveis no Railway

No serviço `nexo-erp-server`, em Settings > Variables:

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Primeira execução

Na primeira vez que o job rodar, é bem provável que o Firestore devolva um
erro pedindo pra criar um índice (por causa do `collectionGroup` com dois
filtros). O próprio erro vem com um link direto — é só clicar e confirmar
no console do Firebase, não precisa criar nada manualmente.
