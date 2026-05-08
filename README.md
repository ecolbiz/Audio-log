# AudioLog - Plataforma de gravações com transcrição estruturada

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

## Preciso instalar PostgreSQL no Mac para rodar em dev?
Sim — para rodar a API localmente, **PostgreSQL é obrigatório** porque o Prisma está configurado com `provider = "postgresql"` no schema.

## Passo a passo (macOS) para instalar e rodar o projeto

### 1) Pré-requisitos
Instale:
- **Homebrew**
- **Node.js 20+** (recomendado usar `nvm`)
- **PostgreSQL 16+**

Exemplo com Homebrew:
```bash
brew update
brew install nvm
brew install node
brew install postgresql@16
```

### 2) Iniciar e habilitar PostgreSQL
```bash
brew services start postgresql@16
```

Verifique se subiu corretamente:
```bash
brew services list
psql --version
```

### 3) Criar usuário/banco para desenvolvimento
```bash
createuser -s postgres
createdb audiolog_dev
```

Se preferir criar com SQL:
```bash
psql postgres
CREATE ROLE audiolog_user WITH LOGIN PASSWORD 'vazio123';
ALTER ROLE audiolog_user CREATEDB;
CREATE DATABASE audiolog_dev OWNER audiolog_user;
\q
```

### 4) Configurar variáveis de ambiente da API
```bash
cd api
cp .env.example .env
```

Edite o `.env` e ajuste `DATABASE_URL` (exemplo):
```env
DATABASE_URL="postgresql://audiolog_user:vazio123@localhost:5432/audiolog_dev?schema=public"
JWT_SECRET="troque-este-segredo"
PORT=3000
```

### 5) Instalar dependências da API e preparar banco
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 6) Rodar API
```bash
npm run dev
```

### 7) (Opcional) Rodar Web
Em outro terminal:
```bash
cd web
npm install
npm run dev
```

### 8) (Opcional) Rodar Mobile
Em outro terminal:
```bash
cd mobile
npm install
npm start
```

## Subir API (resumo rápido)
```bash
cd api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
