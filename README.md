# Nexo ERP

ERP SaaS — frontend em React + Vite, dados no Firebase (Firestore),
upload de imagens no Cloudinary. Mesma stack do Fintrack.

## Status atual

Prontos com CRUD real no Firestore: Dashboard, Entradas, Saídas,
Financeiro (visão consolidada), Clientes, Produtos (com upload de foto),
Categorias, Estoque (visão derivada dos produtos).

Ainda como placeholder, para as próximas etapas: Pedidos de Venda,
Calculadora de venda, Calendário financeiro, Relatórios, Configurações.
A ideia é construí-los nessa ordem, porque Pedidos alimenta o Calendário
e a Calculadora gera Pedidos.

## 1. Configurar o Firebase

Você disse que vai usar a mesma conta Firebase do Fintrack, com um banco
separado. Duas formas de fazer isso:

**Opção A — novo Firestore database dentro do mesmo projeto** (recomendado)
1. Abra o Firebase Console, entre no projeto do Fintrack.
2. Vá em Firestore Database > criar banco de dados e crie um banco
   adicional com um database-id próprio (ex. nexo-erp), ou crie um
   novo projeto Firebase separado se preferir isolamento total (Opção B).
3. Em Configurações do projeto > Seus apps, adicione um novo App Web
   chamado "Nexo ERP" — isso gera as chaves apiKey, authDomain, etc.
4. Ative Authentication > Sign-in method > E-mail/senha.
5. Crie manualmente o primeiro usuário em Authentication > Users > Add user.

**Opção B — projeto Firebase totalmente novo**: repita os mesmos passos em
um projeto novo no console (Adicionar projeto).

### Estrutura de dados (multi-empresa)
```
usuarios/{uid}          -> { empresaId: "empresa_abc" }
empresas/{empresaId}    -> { nome: "Loja Exemplo" }
empresas/{empresaId}/produtos/{id}
empresas/{empresaId}/clientes/{id}
empresas/{empresaId}/categorias/{id}
empresas/{empresaId}/entradas/{id}
empresas/{empresaId}/saidas/{id}
empresas/{empresaId}/pedidos/{id}   (próxima etapa)
```
Depois de criar o usuário no Authentication, crie manualmente no Firestore:
- Um documento em `empresas` (ID livre, ex. `empresa_abc`) com um campo `nome`.
- Um documento em `usuarios/{uid}` (uid = o ID do usuário criado) com
  `empresaId: "empresa_abc"`.

Isso é o "cadastro de empresa" que, na tela de Configurações (próxima
etapa), vai virar uma tela — por enquanto é manual.

### Publicar as regras de segurança
O arquivo `firestore.rules` já está pronto (isola os dados por empresa).
No Firebase Console, vá em Firestore Database > Regras e cole o
conteúdo desse arquivo, ou publique via Firebase CLI:
```
firebase deploy --only firestore:rules
```

## 2. Configurar o Cloudinary

Reaproveite o cloud name do Fintrack (dj4v0sa2n) e crie um upload
preset novo (unsigned) chamado, por exemplo, "nexo_erp", em
Settings > Upload > Upload presets > Add upload preset.

## 3. Variáveis de ambiente

```
cp .env.example .env
```
Preencha com as chaves do Firebase e do Cloudinary.

## 4. Rodar localmente

```
npm install
npm run dev
```
Acesse http://localhost:5173 e entre com o e-mail/senha criado no
Firebase Authentication.

## 5. Subir para o GitHub

```
git init
git add .
git commit -m "Nexo ERP - estrutura inicial"
git branch -M main
git remote add origin https://github.com/dh815/SEU-REPO-AQUI.git
git push -u origin main
```
Lembre-se: o `.env` está no `.gitignore` e não vai subir — configure as
mesmas variáveis como "Environment Variables" na Railway (ou no serviço
de hospedagem que você escolher para o build).

## 6. Deploy

Como é uma SPA React (build estático), pode publicar em:
- Railway (serviço estático ou com um `npm run build` + servidor simples)
- GitHub Pages, como o Fintrack, se preferir manter o mesmo padrão

Quando o projeto crescer e precisar de rotinas de servidor (ex. geração de
nota fiscal, webhooks de pagamento, bot de WhatsApp), aí sim entra um
serviço tipo "nexo-erp-server" na Railway, no mesmo formato do
fintrack-server.

## Próximos passos sugeridos
1. Pedidos de Venda (CRUD + baixa automática de estoque)
2. Calculadora de venda (usa o catálogo de Produtos, gera Pedido)
3. Calendário financeiro (parcelas geradas a partir dos Pedidos)
4. Relatórios (exportação PDF/Excel/CSV)
5. Configurações (cadastro de empresa via tela, ao invés de manual)

## Recursos exclusivos por cliente (feature flags)

Quando um cliente pedir algo específico (uma aba nova, um comportamento
diferente), dá pra criar isso no código e deixar ativado **só na conta
dele**, sem afetar os outros clientes e sem precisar de deploy separado.

Como funciona: cada empresa tem um campo `features` no Firestore
(`empresas/{empresaId}.features`), tipo:
```
features: { relatorioPersonalizadoX: true }
```
Isso é controlado direto no Firestore Console — não tem tela pra isso
dentro do sistema, porque é uma decisão do dono do SaaS (você), não do
cliente.

### Passo a passo pra adicionar um recurso novo

1. Cria a página normalmente em `src/pages/NomeDoRecurso.jsx`.
2. No `src/App.jsx`, importa a página e adiciona a rota envolvida no
   `FeatureRoute`:
   ```jsx
   <Route path="nome-do-recurso" element={
     <FeatureRoute feature="chaveDoRecurso"><NomeDoRecurso /></FeatureRoute>
   } />
   ```
3. No `src/components/Sidebar.jsx`, adiciona o item do menu com a mesma
   chave — ele só aparece pra quem tiver a flag ligada:
   ```js
   { to: '/nome-do-recurso', label: 'Nome do Recurso', icon: Icon.box, feature: 'chaveDoRecurso' }
   ```
4. No Firestore, no documento da empresa daquele cliente específico,
   adiciona o campo `features.chaveDoRecurso: true`.

Pronto — só aquela empresa vê a aba e consegue acessar a rota (mesmo
tentando digitar a URL direto, o `FeatureRoute` bloqueia). Se um dia
quiser liberar pra todo mundo, é só tirar a checagem de feature, ou
ativar a flag pra todas as empresas.
