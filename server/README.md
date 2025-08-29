# Mega Chef Server

API simples em Node/Express + MongoDB para armazenar histórico de conversas.

## Configuração

1. Crie um arquivo `.env` em `server/` com:

```
MONGODB_URI=mongodb://127.0.0.1:27017/mega-chef
PORT=4000
```

2. Instale dependências e inicie:

```
cd server
npm install
npm run dev
```

Endpoints principais:
- POST `/api/conversations` → cria conversa (opcionalmente com `initialMessages`)
- GET `/api/conversations/:id` → retorna mensagens
- POST `/api/conversations/:id/messages` → adiciona mensagem `{ role, text }`
- PUT `/api/conversations/:id/messages` → substitui todas as mensagens `{ messages: [] }`


