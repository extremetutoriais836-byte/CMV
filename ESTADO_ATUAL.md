# Estado Atual do Projeto — Locus SaaS

Snapshot do que já existe e do que está em andamento. Serve de contexto rápido para
qualquer agente/dev retomar o projeto. Complementa o `CLAUDE.md` (guia de arquitetura) e os
documentos em `design/`. Atualizado em junho/2026.

---

## 1. O que é
SaaS de gestão financeira para restaurantes de delivery (foco **iFood**). Coração: cálculo
de **CMV** e **margem/lucro líquido real** (preço − ingredientes − taxa iFood − custo fixo
− incentivo da loja − cancelamento). Produzido pela **Locus Company** (consultoria de
delivery) — serve tanto para venda B2B quanto para a operação interna (CS/gestores).

## 2. Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 (`@theme` em
`app/globals.css`, sem `tailwind.config`) · Supabase (Postgres + Auth via `@supabase/ssr`,
sessão em cookies) · lucide-react. Sem framework de teste — gate = `npm run build`.

## 3. Estrutura de pastas (atual)
```
app/
  (auth)/        login, cadastro (dark)
  (app)/         dashboard, insumos, fichas, custos-fixos, integracoes, assinatura (light + Sidebar + Paywall)
  api/ifood/     auth, catalog
  api/webhooks/  checkout            (cobrança)
  api/relatorio-diario/             (NOVO — agente do relatório)
  icon.svg, apple-icon.png, favicon.ico, globals.css, layout.tsx
components/  Sidebar, nav, ConfirmDialog, Paywall, OnboardingChecklist, Bloqueado(NOVO)
lib/         supabase, supabaseAdmin, restaurante, format, ifood, billing, match,
             calculo(NOVO), planos(NOVO), relatorioAgente(NOVO)
middleware.ts
public/      logo (locus_wordmark_transparent.png) + ícones (icon-192/512, manifest.json)
design/      documentos de visão/execução (ver §8)
*.sql        migrações (ver §5)
```

## 4. Modelo de dados (tabelas existentes)
- `restaurantes` — perfil do dono; **`id = auth.uid()`**. Extras: `faturamento_estimado`,
  `ifood_conectado`, `plano`, `status_assinatura`, `trial_inicio/fim`, `onboarding_ok`.
- `insumos` — `custo_por_unidade` é coluna **gerada** (preço ÷ qtd embalagem).
- `fichas_tecnicas` + `ingredientes_ficha` (N:N) — receitas e composição.
- `custos_fixos` — gastos mensais por categoria.
- `mapeamentos_ifood` — De-Para produto iFood → ficha (`unique(restaurante_id, ifood_produto_id)`).
- `pedidos_simulados` — snapshot financeiro de venda simulada (modo demo).
- `eventos_webhook` — idempotência de cobrança.
- View `vw_cmv_ficha` — CMV, margem, CMV% por prato (`security_invoker = on`).
- **RLS** ligada em todas as tabelas (`restaurante_id = auth.uid()`).

## 5. Migrações na raiz (rodar na ordem no SQL Editor)
1. `schema.sql` · 2. `schema_rls.sql` · 3. `schema_custos.sql` · 4. `schema_mapeamentos.sql`
· 5. `schema_pedidos.sql` · 6. `schema_status_ifood.sql` · 7. `schema_assinaturas.sql`
· 8. `schema_onboarding.sql`

## 6. O que já está PRONTO (núcleo + fases anteriores)
- Auth + multi-tenant por RLS + middleware de rota.
- Insumos, Fichas técnicas (com conversão kg/L→g/ml), Custos fixos, view de CMV.
- iFood: `/api/ifood/auth` e `/api/ifood/catalog` (com **fallback sandbox** em 401/403).
- De-Para + simulação de venda + dashboard (sobre `pedidos_simulados`).
- **Cobrança (base):** colunas de plano/trial, trigger de proteção, `eventos_webhook`,
  `/api/webhooks/checkout`, `lib/billing.ts` (suporta `asaas`), `lib/supabaseAdmin.ts`,
  `Paywall.tsx` (bloqueia quando trial/assinatura expira).
- Onboarding (`OnboardingChecklist`) + auto-mapear (`lib/match.ts`).
- **Marca/visual:** tokens de cor no `globals.css`, logo oficial transparente, kit de
  ícones (favicon/PWA/apple) + `manifest.json`.

## 7. O que foi feito NESTA SESSÃO
**Fundação compartilhada**
- `lib/calculo.ts` — cálculo financeiro **puro** (fonte única): `calcularLucro`,
  `custoFixoPct`, `cmvPct`, `TAXA_IFOOD` (basico 15,5% / entrega 26,5%).
- `lib/planos.ts` — matriz **plano→feature** + `temAcesso()`. Preços **49,90 / 100 / 199**.

**Paywall por plano (próxima fase / em conclusão)**
- `components/Bloqueado.tsx` — cadeado por feature (gating de produto, não de segurança).
- Ligado em **Custos Fixos** (feature `custos_fixos`, agora Pro).
- `app/(app)/assinatura/page.tsx` — preços/features atualizados (Starter sem custo fixo nem iFood).

**Agente Anthropic do relatório (Trilho A)**
- `lib/relatorioAgente.ts` — agente que gera a mensagem "mastigada" (modelo Haiku) +
  **fallback determinístico sem IA** (`mensagemSemIA`). Tipo `ResumoDia` inclui incentivos
  (loja/iFood), Super Restaurante e avaliações.
- `app/api/relatorio-diario/route.ts` — endpoint server-to-server (segredo
  `x-relatorio-secret`) que apura o dia e chama o agente. **Já usa `pedidos_ifood` (real)
  quando há dado, com fallback para `pedidos_simulados`**, e lê `cs_loja` para os destinos
  (dono/CS).

## 8. Documentos em `design/` (visão e execução)
- `EXECUCAO_claude_code.md` — **runbook único**: todas as fases como prompts prontos, em
  ordem, com guardrails (Fase 1 e Fase 3 reforçadas) + prompt de finalização da Fase 3.
- `blueprint_produto_locus.md` — planos, paywall, dashboard, papéis, WhatsApp, auto-ficha.
- `arquitetura_locus.md` — auditoria de arquitetura (riscos + roadmap).
- `analise_odmonitor.md` — análise do concorrente/referência (OD Monitor).
- `sintese_operacao_locus.md` — custos (n8n R$150 + Z-API), time, automação greenfield.
- `fluxo_relatorio_n8n.md` — fluxo do relatório (n8n → endpoint → Z-API).
- `locus_auditoria_design.md`, `locus_tokens.css`, `locus_brand_kit.svg` — marca.

## 9. EM PROGRESSO / PENDÊNCIAS
- **Fase 1 (paywall + cálculo central):** em conclusão — falta garantir o gating nas demais
  abas Pro (Integrações, seções do dashboard) e o cadeado na Sidebar.
- **Fase 3 (checkout ASAAS):** iniciada pelo dev. Adaptar webhook ao ASAAS (header
  `asaas-access-token`, payload do ASAAS, vínculo `asaas_customer_id/subscription_id`),
  criar `/api/checkout` e a assinatura recorrente. Ver prompt de finalização no runbook.
- **Migrações pendentes (referenciadas no código novo, ainda não criadas):**
  - `schema_pedidos_reais.sql` → tabela **`pedidos_ifood`** (o relatório já a consulta).
  - `schema_cs_loja.sql` → tabela **`cs_loja`** (destinos do relatório).
  - `schema_asaas.sql` → colunas `asaas_customer_id` / `asaas_subscription_id`.
  > Enquanto não rodadas, `/api/relatorio-diario` cai no fallback de simulados / pode
  > falhar ao ler tabelas inexistentes — criar antes de usar em produção.

## 10. Variáveis de ambiente (`.env.local`)
Existentes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`BILLING_PROVIDER`, `BILLING_WEBHOOK_SECRET`.
Novas/necessárias: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (opcional), `RELATORIO_SECRET`,
`ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN`.

## 11. ⚠️ Atenção imediata (bloqueiam cobrança real)
1. **`SUPABASE_SERVICE_ROLE_KEY` está INVÁLIDA** (42 chars, não é JWT). O JWT real começa
   com `eyJ` (~200+ chars). Sem ela, o webhook não grava plano/status. Corrigir em
   Supabase → Settings → API antes de testar cobrança.
2. **Webhook ASAAS** ainda usa o modelo genérico (HMAC); precisa do token `asaas-access-token`
   e do payload do ASAAS (Fase 3).
3. **URL pública** para o webhook (Vercel ou túnel) — `localhost` não recebe webhook.

## 12. Dívida técnica consciente (da auditoria)
- Edição de ficha "apaga e reinsere" ingredientes — **não transacional** (Fase 2: RPC).
- Agregação do dashboard feita no cliente — migrar para RPC quando o volume crescer.
- Ingestão **real** do iFood ainda depende de Merchant Authorization + `IFOOD_MERCHANT_ID`.
- Escopo atual: **somente iFood** (99Food fica para depois).
