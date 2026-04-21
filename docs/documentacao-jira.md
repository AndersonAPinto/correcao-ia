# Guia MCP: Como o Cursor Deve Criar, Selecionar e Excluir Tasks no Jira

## Objetivo deste documento

Este documento instrui o Cursor a:
- Interagir com o Jira via MCP (ex: mcp.composio.dev)
- Criar issues (tasks)
- Buscar / selecionar issues existentes
- Excluir issues quando apropriado

O Cursor deve agir como um **agente de engenharia e produto**, operando diretamente sobre o Jira.

---

## Contexto técnico

- O Jira é acessado via **MCP Server**
- As ações são executadas através de **tools MCP**
- O Cursor **não inventa ações**
- O Cursor **descobre as tools disponíveis via MCP**

Este documento define **como e quando usar cada ação**.

---

## Regras fundamentais (obrigatórias)

Antes de executar qualquer ação no Jira:

- ❌ Não inventar projetos, tipos de issue ou campos
- ❌ Não criar issues duplicadas
- ❌ Não excluir issues sem confirmação explícita
- ✅ Basear decisões no código analisado ou instrução direta do usuário
- ✅ Usar descrições técnicas e objetivas

---

## Ações permitidas no Jira (via MCP)

O MCP expõe ações semelhantes às abaixo (nomes podem variar):

- `jira.create_issue`
- `jira.search_issues`
- `jira.get_issue`
- `jira.update_issue`
- `jira.delete_issue`

O Cursor deve escolher a action adequada conforme a intenção.

---

## 1. Criar tasks no Jira

### Quando criar
Criar uma issue quando:
- Um trabalho acionável é identificado no código
- Uma funcionalidade está incompleta
- Existe débito técnico claro
- O usuário solicita explicitamente

### Action a utilizar
