# Vazio - Plataforma de gravações com transcrição estruturada

## Arquitetura
- `api/`: Node.js + Express + Prisma + PostgreSQL.
- `mobile/`: React Native app (login + lista + botão de gravação).
- `web/`: React app para pesquisa global e edição dos campos estruturados.

## Modelo de dados (PostgreSQL)
- `User`: usuários autenticados.
- `Audio`: arquivo, transcrição bruta e colunas estruturadas (`DATA`, `CLIENTE`, `MEIO`, `ASSUNTO`).
- `AuditLog`: registro de criação, alteração e exclusão com `oldValue/newValue`.

## Fluxo
1. Usuário faz login no app mobile.
2. Grava e envia áudio para `POST /api/audios`.
3. API salva arquivo e cria registro.
4. Processo assíncrono transcreve e extrai os campos estruturados.
5. App exibe grid/lista com reproduzir/deletar/criar novo.
6. Web permite pesquisar todas as gravações e editar campos; toda alteração gera auditoria.

## Endpoints principais
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/audios` (upload)
- `GET /api/audios/mine`
- `DELETE /api/audios/:id`
- `GET /api/admin/audios?q=`
- `PATCH /api/admin/audios/:id`

## Subir API
```bash
cd api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
