@AGENTS.md

# CLAUDE.md

Guia para o Claude Code (e qualquer dev) trabalhar neste repositório.
A linha `@AGENTS.md` acima importa as regras específicas desta versão do Next.js — **leia-as**.

## O que é este projeto

**SaaS premium de gestão inteligente para restaurantes.** O coração é o cálculo
de **CMV (Custo da Mercadoria Vendida)** e a **margem líquida real de delivery** —
o lucro depois de descontar ingredientes, taxa do iFood e custo fixo. Inclui uma
integração (em evolução) com a **API do iFood**.

Fluxo de valor, ponta a ponta:

> Insumos → Fichas Técnicas (receitas) → Custos Fixos → Mapeamento De-Para iFood →
> Simulação de vendas → Dashboard de lucro real.

## Stack

- **Next.js 16.2.9** (App Router, **Turbopack**) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (`@import "tailwindcss"` em `app/globals.css`, sem `tailwind.config`)
- **Supabase** — Postgres + Auth, via `@supabase/ssr` (sessão em **cookies**) e `@supabase/supabase-js`
- **lucide-react** — **major 1.x** (mais nova que o esperado; checar export antes de usar ícone novo)
- Sem framework de teste. Validação = `npm run build` (roda TS + ESLint).

## Como rodar

```bash
npm install
npm run dev          # http://localhost:3000
```

**Variáveis de ambiente (`.env.local`):**

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_IFOOD_CLIENT_ID=...
IFOOD_CLIENT_SECRET=...            # SERVER-ONLY, nunca exponha no front
# IFOOD_MERCHANT_ID=...            # da loja autorizada — destrava catálogo E pedidos reais
# Cobrança / assinaturas (todos server-only):
BILLING_PROVIDER=asaas            # 'asaas' (cobrança real) | 'generic' (teste HMAC)
BILLING_WEBHOOK_SECRET=...        # ASAAS: = authToken do webhook (header asaas-access-token)
ASAAS_API_KEY=...                 # SERVER-ONLY — chave da API ASAAS (Conta > Integrações > API)
ASAAS_ENV=sandbox                 # 'sandbox' (padrão) | 'production'
SUPABASE_SERVICE_ROLE_KEY=...     # SERVER-ONLY — bypassa RLS, só em lib/supabaseAdmin.ts (JWT longo)
```

**Fluxo de checkout ASAAS (cartão NUNCA toca o nosso front):**
1. `/assinatura` → "Assinar" faz `POST /api/checkout { plano }`.
2. `app/api/checkout/route.ts` pega o `restauranteId` da **sessão** (cookies, nunca do cliente)
   e chama `criarCheckout(plano, restauranteId, email)` em `lib/billing.ts`.
3. `criarCheckout` cria um cliente + uma cobrança avulsa no ASAAS com
   `externalReference = "{restauranteId}|{plano}"` e devolve o **`invoiceUrl`** (checkout hospedado).
   O front redireciona (`window.location.href`) para essa URL.
4. Pagamento confirmado → ASAAS chama `POST /api/webhooks/checkout` com header
   `asaas-access-token` (= `BILLING_WEBHOOK_SECRET`). `verifyWebhookSignature` valida o token;
   `parseEvent` lê `payment.externalReference` e, em `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`,
   ativa `status_assinatura='ativa'` + `plano=<plano>` via **service role** (idempotente por event_id).
5. O `Paywall`/`Bloqueado` destravam as abas do plano na próxima leitura de `getAssinatura()`.

Configurar no painel ASAAS: webhook apontando para `<URL>/api/webhooks/checkout`, com o mesmo
authToken de `BILLING_WEBHOOK_SECRET`, eventos de pagamento habilitados.

`lib/supabase.ts` falha **alto e claro** (console.error + throw no browser) se as chaves
estiverem ausentes ou no valor de placeholder — não mascara com fallback.

## Banco de dados (rodar na ordem, no SQL Editor do Supabase)

Os `.sql` na raiz são migrações idempotentes:

1. `schema.sql` — tabelas base + view **`vw_cmv_ficha`** (CMV/margem/CMV% por prato)
2. `schema_rls.sql` — **RLS** em todas as tabelas + `security_invoker` na view
3. `schema_custos.sql` — coluna `restaurantes.faturamento_estimado`
4. `schema_mapeamentos.sql` — tabela `mapeamentos_ifood` (De-Para) + RLS
5. `schema_pedidos.sql` — tabela `pedidos_simulados` + RLS
6. `schema_status_ifood.sql` — coluna `restaurantes.ifood_conectado`
7. `schema_assinaturas.sql` — colunas de plano/trial em `restaurantes` + trigger de
   proteção de coluna + tabela `eventos_webhook` (idempotência)
8. `schema_onboarding.sql` — coluna `restaurantes.onboarding_ok` (dispensar checklist)
9. `schema_pedidos_reais.sql` — tabela `pedidos_ifood` (pedidos REAIS importados do iFood) + RLS
10. `schema_resumo.sql` — RPCs `resumo_vendas(restaurante_id, periodo)` e `vendas_por_prato(restaurante_id)`
    (agregação no banco p/ o dashboard Pro; SECURITY INVOKER → respeita RLS)
11. `schema_cs_loja.sql` — tabela `cs_loja` (roteamento CS↔loja p/ o relatório); RLS sem policy
    (uso interno só via service role)
12. `schema_templates_nicho.sql` — tabela `templates_ficha` (kits curados por nicho) + seed v1;
    RLS leitura pública. Alimenta `/fichas/sugeridas` (pré-monta fichas do cardápio via `lib/match`)
13. `schema_benchmark.sql` — RPCs `evolucao_desde` (série própria, INVOKER) e `benchmark_nicho`
    (agregado ANÔNIMO por nicho, SECURITY DEFINER, mínimo 3 lojas — LGPD). Onboarding §6/§8.
14. `schema_multitenant.sql` — **fundação multi-tenant** (organizacao→lojas→membros + papel),
    backfill (cada loja → 1 org, dono), helper `tem_acesso_loja` e **RLS backward-compatible**
    (`restaurante_id = auth.uid()` OU membros) em todas as tabelas. **NÃO quebra contas 1-loja.**
15. `schema_gestor.sql` — `gestores_locus` + RPC `carteira_gestor` (visão interna de carteira).

#### Versão Casal do Açaí (app atual — rodar depois das anteriores)

16. `schema_entrega.sql` — em `restaurantes`: `modelo_entrega` ('propria'|'plataforma'),
    `taxa_plataforma` (padrão 30), `meta_lucro` (padrão 4,00), `bloqueado`, `email`.
    Substitui o `TAXA_IFOOD_PADRAO` fixo — a taxa passa a ser **por restaurante**.
17. `schema_config.sql` — tabela `config_app` (chave-valor jsonb): `tutorial_videos`,
    `faixas_cmv`, `taxas_entrega`, `meta_lucro_padrao`. RLS: **leitura pública**,
    escrita só via service role (painel `/admin`) — permite trocar sem redeploy.
18. `seed_acaiteria.sql` — kit de açaiteria em `templates_ficha`. **Atenção:** usa o
    schema REAL (`nicho, nome_prato_modelo, insumos`), não a coluna `payload`.
19. `schema_bloqueio.sql` — estende `protege_colunas_assinatura` para também blindar
    `bloqueado` e `email` (sem isso, o usuário se desbloqueava sozinho pela anon key)
    e fixa `search_path`. **Rodar sempre depois do `schema_entrega.sql`.**

> O app atual (Casal do Açaí) usa apenas: `restaurantes`, `insumos`, `fichas_tecnicas`,
> `ingredientes_ficha`, `custos_fixos`, `vw_cmv_ficha`, `config_app` e `templates_ficha`.
> As tabelas de iFood/pedidos/assinatura seguem no banco (nada foi apagado), mas não
> têm UI — o caminho de volta continua curto.

### Modelo de dados (resumo)

- `restaurantes` — "perfil" do dono. **`id = auth.uid()`** (1 usuário = 1 restaurante).
  Extras: `faturamento_estimado`, `ifood_conectado`, `plano`, `status_assinatura`, `trial_inicio`, `trial_fim`.
- `insumos` — matéria-prima. `custo_por_unidade` é coluna **GERADA** (`preco_pago / quantidade_embalagem`).
- `fichas_tecnicas` — receitas (nome + preço de venda).
- `ingredientes_ficha` — junção N:N ficha×insumo. `quantidade_utilizada` na **unidade original** do insumo.
- `custos_fixos` — gastos mensais (1 linha por categoria).
- `mapeamentos_ifood` — De-Para produto iFood → ficha. `unique(restaurante_id, ifood_produto_id)`.
- `pedidos_simulados` — **snapshot** financeiro de cada venda simulada (valores congelados).
- View `vw_cmv_ficha` — `cmv = Σ(quantidade_utilizada × custo_por_unidade)`, margem, `cmv_pct`.

## Arquitetura de pastas

```
app/
  layout.tsx              # raiz (pt-BR, metadata)
  page.tsx                # "/" -> redirect /dashboard
  (auth)/                 # login + cadastro (DARK premium, sem Sidebar)
  (app)/                  # painel logado (LIGHT premium, com Sidebar)
    layout.tsx            # shell: <Sidebar/> + <main>
    dashboard/ insumos/ fichas/ custos-fixos/ integracoes/
    dashboard/ insumos/ fichas/ custos-fixos/ integracoes/ assinatura/
  api/ifood/
    auth/route.ts         # GET: token client_credentials do iFood
    catalog/route.ts      # GET: catálogo, com fallback sandbox em 401/403
  api/webhooks/
    checkout/route.ts     # POST: webhook de cobrança (HMAC + service role, idempotente)
components/  Sidebar.tsx  nav.ts  ConfirmDialog.tsx  Paywall.tsx
lib/         supabase.ts  restaurante.ts  format.ts  ifood.ts  billing.ts  supabaseAdmin.ts
middleware.ts             # proteção de rota (exceto api/webhooks); redireciona p/ /login
```

## Convenções e regras importantes

- **Multi-tenant por `auth.uid()`.** Todo fetch/insert filtra/grava `restaurante_id = user.id`.
  Use `getUsuarioAtual()` no mount; chame `ensureRestauranteDoUsuario(user)` antes de inserts
  que dependem da FK `restaurante_id`.
- **Segurança em 2 camadas:** `middleware.ts` protege **rota**; **RLS** protege **dado**.
  Uma não substitui a outra. Toda tabela nova → ligar RLS com policy `restaurante_id = auth.uid()`.
- **Segredos só no servidor.** `IFOOD_CLIENT_SECRET` só em `lib/ifood.ts` / API Routes.
  Nunca importar `lib/ifood.ts` em componente `"use client"`.
- **Conversão de unidades (fichas):** insumo em `kg`/`L` → usuário digita em `g`/`ml`, custo ÷ 1000.
  **Grava no banco na unidade original** (150 g → 0,15 kg) p/ a view continuar correta. Helper `conversao()`.
- **Decimais:** `parseDecimalBR()` (lib/format) aceita vírgula br; inputs numéricos usam `step="any"`.
- **Moeda:** `brl()` (lib/format), `Intl.NumberFormat pt-BR`.
- **Design / marca Locus:** tokens em `app/globals.css` (`@theme`): `--color-brand` #3062E5,
  `--color-brand-light` #578CFE, `--color-brand-deep`, `--color-ink` #16161A, `--color-glow`,
  `--color-profit/loss/amber`. Geram utilitários `bg-brand`, `text-brand-light`, etc.
  - **Accent primário = azul da marca** (`brand`). **Emerald é reservado a lucro/sucesso**
    (valores positivos, margem positiva, "conectado/confirmado/incluído", etapa concluída).
  - **Contraste:** `brand` (#3062E5) só em fills/ícones/títulos grandes-bold ou texto sobre
    fundo claro; em **superfície dark** texto/link pequeno usa `brand-light` (#578CFE, passa AA).
  - Painel `(app)` é **light**; `(auth)` e cards iFood são **dark** (iFood usa vermelho). Não inverter.
    Superfícies dark de marca podem usar o brilho radial `--color-glow` (ex.: auth).
  - Wordmark oficial: `public/locus_wordmark_transparent.png` (prateado, só sobre fundo escuro)
    via `next/image`, `alt="Locus"`. Ícones/PWA pelas convenções do Next (`app/icon.svg`,
    `app/apple-icon.png`, `app/favicon.ico`) + `public/manifest.json` (`themeColor` no export `viewport`).
- **UX estabelecida:** botões com `"Salvando..."` (spinner), `ConfirmDialog` para exclusões,
  atualização **otimista** + persistência. **Edição reusa o formulário do topo** (modo edição, borda emerald), sem modal.
- **iFood defensivo:** catálogo degrada para produtos `sandbox-*` em 401/403/sem merchant,
  retornando **200** com `source: "fallback"` — a tela nunca quebra.
- **Billing / paywall:** colunas `plano`/`status_assinatura`/`trial_*` em `restaurantes` só
  podem ser escritas pela **service role** (webhook). Um **trigger `BEFORE UPDATE`** bloqueia
  o usuário (auth.uid() não-nulo) de alterá-las pela anon key. `components/Paywall.tsx` (no
  layout `(app)`) borra+bloqueia o conteúdo quando o trial/assinatura expira — `/assinatura`
  é sempre liberada. Helpers: `getAssinatura()` / `acessoBloqueado()` em `lib/restaurante.ts`.
  O webhook (`api/webhooks/checkout`) valida assinatura HMAC (`lib/billing.ts`), é idempotente
  por `event_id` (`eventos_webhook`) e usa `lib/supabaseAdmin.ts` (service role). **Nunca**
  importar `billing.ts`/`supabaseAdmin.ts` em `"use client"`.

## Validação

`npm run build` é o gate (compila + TypeScript + ESLint). Rodar antes de considerar pronto.
O hint `'FormEvent' is deprecated` é falso-positivo dos tipos do React — ignorar.

## Dívida técnica consciente (não esquecer)

- **Taxa iFood não é persistida por ficha.** A simulação assume `TAXA_IFOOD_PADRAO = 15,5%`
  (Plano Básico) em `integracoes/page.tsx`. Fidelidade total → coluna em `fichas_tecnicas`.
- **Edição de ficha = "apaga e reinsere" ingredientes** (não transacional). Futuro: RPC no Postgres.
- **`middleware.ts`** usa a convenção antiga (Next 16 sugere `proxy.ts`). Funciona; warning cosmético.
- **iFood real** depende do Merchant Authorization Code aprovado + `IFOOD_MERCHANT_ID`.
  Hoje cai em modo sandbox. Próximos: taxa iFood por ficha.
- **Pedidos reais (`pedidos_ifood`):** `POST /api/ifood/pedidos` faz polling do módulo Order
  do iFood (`/order/v1.0/events:polling` → detalhe → ack), normaliza (`lib/ifood.buscarPedidosReais`),
  calcula o lucro com `calcularLucro` (incluindo `incentivoLojaPct` e `cancelamentoPct`) e dá
  upsert em `pedidos_ifood` (RLS, sem service role). Defensivo: sem `IFOOD_MERCHANT_ID` ou em
  falha → `source: "fallback"`, e `pedidos_simulados` permanece como modo demo/trial.
  **Pendências confirmáveis só com pedido real:** mapeamento exato dos campos financeiros do
  payload do iFood (incentivo iFood vs loja, comissão) e o vínculo item→ficha p/ CMV por pedido
  (a tabela já tem `ficha_tecnica_id`/`custo_ingredientes`).

## Git

Não é um repositório git por padrão neste ambiente. Se for inicializar, branch a partir de `main`
antes de commitar; só commitar/pushar quando solicitado.
