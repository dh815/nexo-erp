# Auditoria do NEXO existente

**Repositório analisado:** `github.com/dh815/nexo-erp` (branch `main`, 13 commits, 08–09/08/2026)
**Deploy ao vivo:** `nexo-erp-production-9590.up.railway.app` (Railway, projeto "calm-connection")
**Tamanho do código:** ~3.200 linhas em `src/`, 40 arquivos JS/JSX, 844 KB no repo (sem `node_modules`)

Esta auditoria foi feita lendo o código real do repositório (agora público), a configuração real do serviço no Railway e o histórico de commits — nenhuma informação aqui foi inferida sem checagem.

---

## 1. Arquitetura atual

SPA (Single Page Application) 100% front-end, sem backend próprio. O app roda inteiramente no navegador e fala direto com o Firebase (Firestore + Authentication) e com o Cloudinary. O deploy no Railway apenas serve os arquivos estáticos do build (`vite build` → `serve -s dist`, ver `Procfile` e `package.json`).

Fluxo de dados: `Componente de página` → `useCollection()` (hook genérico) → Firestore, com `onSnapshot` para tempo real. Não existe camada de API/servidor intermediária, nem fila, nem webhook, nem cron — o `fintrack-server` (outro projeto do mesmo usuário no Railway) existe separado e não tem nenhuma ligação com o Nexo hoje.

Multi-tenant lógico já existe, mas de forma simples: cada empresa é isolada em `empresas/{empresaId}/{colecao}`, e o vínculo usuário → empresa é 1 usuário = 1 empresa (`usuarios/{uid}.empresaId`), sem suporte a múltiplos usuários por empresa, papéis/permissões, ou um usuário acessando mais de uma empresa.

## 2. Stack utilizada

- **Front-end:** React 19 + React Router 7, build com Vite 8.
- **Estilo:** Tailwind CSS 4 (via `@tailwindcss/postcss`), com tokens de tema definidos em `src/index.css` (`@theme`) — cores, fontes (Inter + Plus Jakarta Sans para títulos), sombras.
- **Ícones:** SVGs inline escritos à mão no estilo Feather/Lucide (`src/components/Icons.jsx`), sem dependência externa de ícones.
- **Dados:** Firebase (Firestore + Authentication e-mail/senha).
- **Upload de imagem:** Cloudinary (preset unsigned).
- **Hospedagem:** Railway, builder Railpack, serve via `serve` (pacote npm) na porta 8080.
- **Lint:** `oxlint` configurado (`.oxlintrc.json`), com regra de `rules-of-hooks` ativa.
- **Sem testes:** nenhum arquivo `.test.` ou `.spec.`, nenhum framework de teste instalado.
- **Sem CI/CD:** nenhum workflow do GitHub Actions ou similar.
- **Dependência órfã:** `@types/react`/`@types/react-dom` estão no `package.json` mas o projeto é JS puro (não há um único arquivo `.ts`/`.tsx`) — sobra do scaffold inicial do Vite.

## 3. Banco de dados

Firestore (NoSQL, documentos), sem SQL. Estrutura real encontrada no código (não é a do README, que está desatualizado — ver seção 6):

```
usuarios/{uid}                          → { empresaId }
empresas/{empresaId}                    → { nome, ...dados fiscais, features: {} }
empresas/{empresaId}/produtos/{id}
empresas/{empresaId}/clientes/{id}      → inclui totalComprado, valorEmAberto
empresas/{empresaId}/categorias/{id}
empresas/{empresaId}/entradas/{id}
empresas/{empresaId}/saidas/{id}
empresas/{empresaId}/pedidos/{id}       → pedidos de venda, com itens[] e baixa de estoque
empresas/{empresaId}/parcelas/{id}      → alimenta o Calendário financeiro
empresas/{empresaId}/compras/{id}       → compras de fornecedor, dá entrada de estoque
empresas/{empresaId}/notasEntrada/{id}  → devoluções de cliente
empresas/{empresaId}/notasSaida/{id}    → notas fiscais de saída (rascunho/transmitida/cancelada)
```

Regras de segurança (`firestore.rules`) já isolam dados por empresa no nível do banco (não só na interface): todo `read`/`write` em `empresas/{empresaId}/...` exige `empresaDoUsuario() == empresaId`, e a escrita em `usuarios/{uid}` está bloqueada por padrão ("só via backend/admin" — mas hoje não existe esse backend, então a criação de usuário/empresa é 100% manual pelo Firebase Console, como o próprio README explica).

Não há índices compostos do Firestore versionados (`firestore.indexes.json` não existe) — isso vai doer assim que uma tela cruzar `where` + `orderBy` em campos diferentes.

## 4. Funcionalidades existentes (reais, com CRUD funcionando no Firestore)

Confirmado lendo cada página e a lógica de negócio associada:

- **Dashboard** — números reais (total recebido, a receber, contas vencidas, saídas, estoque, clientes, pedidos), com estado vazio ("Comece cadastrando seus dados"). Sem gráficos ainda, só cards.
- **Entradas / Saídas** — CRUD simples de lançamentos financeiros manuais.
- **Financeiro** — visão consolidada (entradas − saídas = saldo, a receber), com nota explícita de que o gráfico de fluxo de caixa "entra numa próxima etapa" (honesto, não finge ter gráfico).
- **Clientes** — CRUD com `totalComprado` e `valorEmAberto`.
- **Produtos** — CRUD com upload de foto via Cloudinary, dimensões, estoque mínimo.
- **Categorias** — CRUD simples.
- **Estoque** — visão derivada dos produtos (não é uma coleção própria).
- **Pedidos de Venda** (`lib/pedidos.js`) — o módulo mais maduro do sistema: cria pedido, dá baixa automática de estoque por item (via `writeBatch`), e gera parcelas segundo regras de negócio reais e bem pensadas (Pix/Dinheiro/Transferência = pago na hora, sem parcela; Cartão só gera parcela se parcelado; **Boleto nunca é instantâneo**, sempre gera ao menos 1 vencimento em dias corridos). Excluir um pedido devolve o estoque.
- **Calculadora de venda** — gera um Pedido de verdade reaproveitando o seletor de produtos.
- **Calendário financeiro** — mostra as parcelas reais geradas pelos Pedidos.
- **Compras** — CRUD de compras de fornecedor, com sugestão de reposição por estoque baixo, gera entrada de estoque + saída financeira automaticamente; suporta importação de XML de NF-e para criar/vincular produtos.
- **Notas Fiscais (Entrada/Saída)** — telas dedicadas; NF de saída nasce a partir de um Pedido existente, com status rascunho/transmitida/cancelada (transmissão real para a SEFAZ **não** existe — é só o status, corretamente sem fingir integração).
- **Relatórios** — dados reais (vendas, clientes, produtos, lucro, estoque, financeiro) com exportação CSV.
- **Configurações** — edição dos dados da empresa (nome, CNPJ, logo via Cloudinary).
- **Busca global** — funcional de verdade (produtos, clientes, pedidos, categorias, entradas, saídas), não é decorativa.
- **Feature flags por empresa** — infraestrutura pronta (`empresas/{id}.features`, `FeatureRoute`, filtro no Sidebar) para ligar recursos exclusivos por cliente sem deploy separado.
- **Autenticação** — e-mail/senha via Firebase Auth, com redirecionamento pós-login corrigido (havia bug, já resolvido conforme histórico de commits).

## 5. Funcionalidades incompletas ou ausentes

Aqui está o ponto mais importante desta auditoria, e onde preciso ser direto com você.

O NEXO que existe hoje é um **ERP de produto/estoque** para negócios que compram, estocam e vendem mercadorias (parecido com uma loja/distribuidora): Produtos, Estoque, Compras, Notas Fiscais de compra/venda, Pedidos com baixa de estoque. Ele **não tem nenhum conceito de**:

- Agenda / agendamento / horário
- Serviços (com duração, profissional, intervalo)
- Profissionais / equipe
- Disponibilidade de horário, bloqueios, folgas
- WhatsApp (nem estrutura preparada, nem menção no código)
- PIX ou qualquer pagamento (só existe o *rótulo* "Pix" como forma de pagamento de um pedido, sem QR Code, sem gateway, sem confirmação de transação)
- IA / assistente
- Marketing, campanhas, fidelidade, indicação, lista de espera, segmentação de clientes
- Multiprofissional / multiunidade
- Landing page comercial, onboarding, planos com cobrança

Ou seja: o prompt mestre descreve o NEXO como **"agenda + WhatsApp + IA para autônomos e pequenos negócios de serviço"** (barbearia, salão, personal trainer, estética). O que existe no repositório é um **ERP de vendas/estoque/financeiro para negócios de produto**, sem agenda nenhuma. Não são o mesmo produto — são dois domínios diferentes que compartilham só a ideia de "empresa cadastra clientes e vende algo".

Isso muda o tamanho do trabalho: não é "adicionar módulos a uma base de agenda que já existe" — é **construir o domínio de agenda/serviços do zero** (que é o coração de tudo que vem depois: disponibilidade, WhatsApp, PIX por agendamento, no-show, lista de espera), enquanto se decide o que fazer com o ERP de produto que já existe (mantém como módulo "Comercial/Produtos" para quem também vende produto, ou deixa em segundo plano). Trato isso como decisão sua na pergunta ao final.

Dentro do próprio domínio ERP atual, o que ficou como "próxima etapa" e nunca foi feito: gráfico de fluxo de caixa no Financeiro, cupons/descontos, orçamentos, contas a pagar separadas de contas a receber, exportação em PDF/Excel (só tem CSV), tela de cadastro de empresa completa com dados fiscais/tributários.

## 6. Problemas encontrados

- **README desatualizado** — descreve Pedidos, Calculadora, Calendário, Relatórios e Configurações como "placeholder", mas todos os cinco já estão implementados com CRUD real. Quem ler o README primeiro vai ter uma visão errada do estado do projeto.
- **Dado falso no Sidebar** — `src/components/Sidebar.jsx` mostra um card fixo "Plano Profissional — 620 de 1.000 pedidos/mês" com uma barra de progresso de 62% **hardcoded**, sem nenhuma consulta ao banco. É exatamente o tipo de "número inventado no dashboard" que o seu prompt pede pra nunca ter — está lá hoje.
- **`alert()`/`confirm()` nativos do navegador** para toda validação e confirmação de exclusão (14 ocorrências). Funciona, mas não combina com "aparência de SaaS premium" — são os popups feios padrão do Chrome.
- **Cadastro de usuário/empresa 100% manual** — não existe tela de onboarding nem de signup; um novo cliente só entra no sistema se alguém criar o usuário no Firebase Console e o documento `usuarios/{uid}` manualmente. Isso não escala como produto comercializável.
- **Sem paginação** — `useCollection` carrega a coleção inteira com `onSnapshot` sempre; para uma empresa com milhares de pedidos/clientes isso vai custar leitura do Firestore e performance no navegador.
- **Sem índices do Firestore versionados** — risco de erro em produção assim que uma consulta combinar filtro + ordenação em campos diferentes (Firestore exige índice composto nesses casos).
- **Sem testes automatizados e sem CI** — qualquer mudança de agora em diante corre o risco de quebrar o que já funciona (Pedidos → estoque → parcelas → calendário → financeiro) sem ninguém perceber antes do usuário final.
- **Dependência órfã** (`@types/react*`) e ausência de `firestore.indexes.json`/regra de storage do Cloudinary documentada.
- **Identidade visual** já é "azul, fundo branco, cantos arredondados, sombras suaves" — mas é azul (`#2e5eff`), não o roxo (`#6C5CE7`) pedido no novo posicionamento. Vai precisar de retema, não de reconstrução (a estrutura de design tokens em `index.css` já é o lugar certo pra trocar).
- **Regra de segurança do Firestore tem um ponto frágil**: `empresaDoUsuario()` faz um `get()` extra a cada request, e a escrita em `usuarios/{uid}` está bloqueada (`allow write: if false`) — correto por segurança, mas significa que hoje **não existe nenhum caminho automatizado** para provisionar um cliente novo; isso precisa de uma Cloud Function ou processo de onboarding antes de vender o SaaS de verdade.

## 7. O que deve ser preservado (não jogar fora)

- O modelo multi-tenant `empresas/{empresaId}/...` com isolamento real nas regras do Firestore — está correto e é a base pra qualquer coisa "SaaS" que venha depois.
- Toda a lógica de negócio de Pedidos (`lib/pedidos.js`, `lib/vencimentos.js`) — baixa de estoque, regras de parcelamento por forma de pagamento, é código maduro e bem comentado, não trivial de refazer.
- O hook `useCollection` — abstração limpa de CRUD + tempo real, reutilizável para qualquer coleção nova (inclusive `servicos`, `agendamentos`, `profissionais` no futuro).
- O sistema de feature flags por empresa (`FeatureRoute` + `empresas/{id}.features`) — é exatamente o mecanismo certo para lançar módulos novos (Agenda, WhatsApp, IA) por cliente, de forma gradual, sem quebrar quem já usa o ERP hoje.
- Os componentes de design system já existentes (`ui.jsx`: Card, Button, Pill, StatCard, Modal, Field, EmptyState, Loading) e o `DataTable` genérico — a base é sólida, só precisa de retema de cor e expansão (faltam Tooltip, Toast, Tabs, Skeleton, Badge de status colorido para agendamento).
- Ícones inline sem dependência externa — leve, sem risco de quebra de versão de lib de ícone.
- A honestidade do código com o que não está pronto (mensagens tipo "entra numa próxima etapa", status "rascunho" em vez de fingir nota fiscal transmitida) — esse princípio deve continuar valendo para os módulos novos (WhatsApp, PIX, IA).
- O módulo comercial inteiro (Produtos/Estoque/Compras/NFs) pode virar o módulo "Comercial" do NEXO novo, para negócios que também vendem produto (ex: barbearia que vende pomada) — não precisa ser descartado, só deixado como módulo opcional via feature flag.

## 8. O que deve ser refatorado

- Trocar a paleta de cor de azul para roxo/marca nova diretamente nos tokens do `@theme` em `index.css` — baixo risco, já é centralizado.
- Extrair um componente `ConfirmDialog`/`Toast` para substituir todos os `alert()`/`confirm()` nativos (14 pontos de uso já mapeados).
- Adicionar paginação (ou paginação por cursor) em `useCollection` antes de qualquer cliente ter uma base grande de dados.
- Corrigir/reescrever o README para refletir o estado real do projeto.
- Remover o card fixo do Sidebar ou torná-lo real (buscar limite de plano de verdade, quando existir cobrança).
- Adicionar `firestore.indexes.json` e subir via Firebase CLI antes de qualquer consulta nova mais complexa.
- Introduzir um processo de onboarding/provisionamento automatizado (provavelmente uma Cloud Function que roda no primeiro login, criando `empresas/{empresaId}` e `usuarios/{uid}` sem depender do Firebase Console manual).

## 9. O que precisa ser criado do zero

Praticamente toda a "espinha dorsal" do posicionamento novo do NEXO não existe hoje e precisa ser construída, na prática como um novo domínio de dados dentro do mesmo projeto (reaproveitando `useCollection`, design system, multi-tenant):

- Modelo de dados de **Serviços**, **Profissionais**, **Agendamentos**, **Disponibilidade/Bloqueios/Folgas**
- Tela de **Agenda** (dia/semana/mês) com os status pedidos no prompt
- Motor de **disponibilidade** (cruzar horário de funcionamento, duração de serviço, folgas, feriados, profissional, agendamentos existentes)
- Arquitetura de **WhatsApp** (isso exige um serviço de backend novo — não dá para receber webhook do WhatsApp Business API numa SPA estática; provavelmente um serviço tipo `nexo-erp-server` na Railway, no mesmo padrão do `fintrack-server` que você já tem)
- **PIX** de verdade (hoje é só um texto no formulário de pagamento) — precisa de gateway (Mercado Pago, Efí, Asaas etc.) e webhook de confirmação, o que também exige backend
- **NEXO IA** consultando dados reais do Firestore
- **CRM avançado** (segmentação automática, histórico consolidado de mensagens/campanhas)
- **Marketing**, **Fidelidade**, **Indicações**, **Lista de espera**, **No-show configurável**
- **Landing page** e **onboarding** de autocadastro (hoje não existe nenhum dos dois)
- **Planos com cobrança** (hoje não há Stripe/gateway de assinatura)

## 10. Plano de implementação por etapas

Adaptando a ordem que você definiu no prompt à realidade do que já existe:

**Fase 0 (nova, antes da Fase 1 do seu prompt) — Decisão de escopo.** Definir com você o que fazer com o ERP de produto atual: vira módulo "Comercial" opcional do novo NEXO, ou fica de lado por enquanto enquanto o foco vai para Agenda. Isso muda a Fase 1 inteira.

**Fase 1 — Fundação:** retema visual (roxo, tokens em `index.css`), extração de `ConfirmDialog`/`Toast`, ampliação do design system (Tabs, Badge, Skeleton, Tooltip), correção do README, paginação em `useCollection`, remoção do dado falso do Sidebar. Baixo risco, não toca em regra de negócio.

**Fase 2 — Core do domínio novo:** modelar e construir Serviços, Profissionais, Agendamentos e o motor de disponibilidade — do zero, seguindo o mesmo padrão de `useCollection` + regras do Firestore por empresa que já existe.

**Fase 3 em diante:** seguem a ordem que você já definiu (WhatsApp, Pagamentos/PIX, Financeiro — já existe, integrar com Agenda —, Comercial — já existe, CRM/Marketing, Fiscal — já existe parcialmente —, SaaS/planos, Polimento), com a diferença de que Financeiro, Comercial e Fiscal partem de uma base real já funcionando, e Agenda/WhatsApp/PIX/IA partem do zero.

---

### O que eu não fiz (de propósito)

Não alterei nenhum arquivo do projeto. Esta é só a auditoria, como você pediu.
