# MoneyFlow — Índice de Arquitetura

Documentação técnica completa para desenvolvimento do MoneyFlow, aplicação web de controle financeiro pessoal.

---

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| [01-visao-geral.md](01-visao-geral.md) | Contexto, princípios e stack tecnológica |
| [02-modelos-de-dados.md](02-modelos-de-dados.md) | Schema completo do banco de dados |
| [03-api.md](03-api.md) | Endpoints REST, contratos de request/response |
| [04-modulo-lancamentos.md](04-modulo-lancamentos.md) | Regras de negócio de lançamentos e parcelas |
| [05-modulo-bancos.md](05-modulo-bancos.md) | Contas e visão consolidada de saldo |
| [06-modulo-objetivos.md](06-modulo-objetivos.md) | Metas financeiras e progresso |
| [07-brain.md](07-brain.md) | Motor de recomendações — algoritmo e regras |
| [08-relatorios.md](08-relatorios.md) | Queries e lógica dos relatórios |
| [09-telegram-bot.md](09-telegram-bot.md) | Comandos, fluxo e integração do bot |
| [10-frontend.md](10-frontend.md) | Componentes, rotas e estado da UI |
| [11-fases.md](11-fases.md) | Roadmap de desenvolvimento por fase |

---

## Princípios Guia

- **Single-user** — sem multi-tenant, sem autenticação complexa no MVP
- **Mobile-first** — UI responsiva, bot Telegram como canal alternativo
- **Brain sempre consistente** — qualquer mutação de dado dispara recalculo do orçamento
- **Parcelas como entidades reais** — cada parcela é uma `Transaction` autônoma vinculada a um `InstallmentGroup`
