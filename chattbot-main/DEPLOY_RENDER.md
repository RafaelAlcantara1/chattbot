## Deploy do backend (API) no Render

### 1) O que já fizemos
- Adicionamos `render.yaml` configurando um serviço web Node no diretório `server`.
- O servidor Express já está pronto em `server/index.js` com rotas `/api/*`.

### 2) Variáveis de ambiente necessárias (defina no Render)
- `MONGODB_URI`: string de conexão do MongoDB (Atlas ou outro).
- `PORT`: defina `10000` (opcional; o Render define `PORT` automaticamente, mas mantemos alinhado com o código).
- Opcional: `NODE_VERSION=18` (já incluído no blueprint).

No painel do Render, após criar o serviço, vá em Settings → Environment → Add Environment Variable e crie as acima.

### 3) Como criar o serviço a partir do GitHub
1. Faça push deste repositório para o GitHub.
2. No Render, clique em New → Blueprint e selecione o repositório.
3. O Render lerá `render.yaml` e criará o serviço `mega-chef-api` apontando para `server/`.
4. Em Environment, adicione `MONGODB_URI` e ajuste `PORT` se desejar. Salve e Deploy.

### 4) URL da API
Após o deploy, você terá uma URL do tipo `https://mega-chef-api.onrender.com`.

### 5) Configurar o frontend para usar a API
No frontend (CRA), crie um arquivo `.env` na raiz do projeto com:

```
REACT_APP_API_BASE_URL=https://mega-chef-api.onrender.com
```

Reinicie `npm start` para o CRA ler o `.env`. Em produção, ajuste a variável no ambiente de build.

O frontend usa `process.env.REACT_APP_API_BASE_URL` (veja `src/components/Chatbot.js`).

### 6) Teste rápido
- Verifique saúde da API: `GET https://<sua-url>/api/health` → `{ ok: true }`.
- No app, o histórico deve carregar e as ações de criar/alterar conversa devem funcionar.

### 7) Observações
- Caso o Render force outra `PORT`, o Express usa `process.env.PORT` automaticamente.
- Se quiser logs detalhados, já temos `morgan('dev')` habilitado.


