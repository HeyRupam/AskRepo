# AskRepo

Chat with your GitHub repositories. AskRepo signs you in with GitHub, indexes the code of the repos you pick into a vector database, and answers questions about that code with an LLM, citing the files it used.

## How it works

1. **Sign in** with GitHub OAuth. Your access token is stored encrypted.
2. **Sync** your repositories from GitHub.
3. **Index** a repository. The backend fetches the file tree, keeps source and config files (skipping lockfiles, build output, `node_modules`, minified bundles and anything over 100 KB), splits them into chunks, embeds them and stores the vectors in Postgres with pgvector. Progress is shown live on the repo card.
4. **Chat.** Each question is embedded and matched against that repository's chunks only. The best matches are sent to the model along with recent conversation history, and the answer streams back over Server-Sent Events together with the list of referenced files.

## Tech stack

| Part | Stack |
|---|---|
| Backend | Java 25, Spring Boot 4.1, Spring AI 2.0, Spring Security (OAuth2), Spring Data JPA |
| Database | PostgreSQL 16 + pgvector (HNSW index, cosine distance) |
| AI | Any OpenAI-compatible API (OpenAI, OpenRouter, ...). Defaults: `gpt-4o-mini` for chat, `text-embedding-3-small` (1536 dims) for embeddings |
| Frontend | Next.js 16, React 19, TanStack Query, Tailwind CSS 4, Base UI / shadcn components |

## Getting started

### Prerequisites

- Java 25
- Node.js 20+
- Docker (for Postgres)
- An API key for OpenAI or another OpenAI-compatible provider that also serves embeddings
- A GitHub OAuth app

### 1. Create a GitHub OAuth app

In GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App** and use:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:8080/login/oauth2/code/github`

Copy the client ID and generate a client secret.

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`. Both Docker Compose and the backend read it.

| Variable | Description |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Backend datasource (match the values above) |
| `OPENAI_API_KEY` | API key for the model provider |
| `OPENAI_BASE_URL` | Optional. Defaults to `https://api.openai.com/v1`. For OpenRouter use `https://openrouter.ai/api/v1`. The URL must end in `/v1` |
| `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL` | Optional model overrides (OpenRouter needs provider-prefixed names such as `openai/gpt-4o-mini`). The embedding model must produce 1536-dimensional vectors |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | From the OAuth app |
| `TOKEN_ENCRYPTOR_PASSWORD` | Long random passphrase used to encrypt stored GitHub tokens |
| `TOKEN_ENCRYPTOR_SALT` | Hex salt, e.g. `openssl rand -hex 14` |
| `FRONTEND_URL`, `FRONTEND_ORIGIN` | Where the client runs (redirect after login, CORS) |

Changing `TOKEN_ENCRYPTOR_PASSWORD` or `TOKEN_ENCRYPTOR_SALT` later makes stored tokens unreadable, so users would have to sign in again.

### 3. Start Postgres

```bash
docker compose up -d
```

The container enables the `vector`, `hstore` and `uuid-ossp` extensions on first start. Tables, including the `vector_store` table, are created by the backend on startup.

### 4. Run the backend

```bash
cd backend/backend
./mvnw spring-boot:run
```

The API runs on `http://localhost:8080`.

### 5. Run the client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with GitHub, sync your repositories, click **Index** on one, and once it shows **Ready** click **Chat**.

If the backend is not on `http://localhost:8080`, set `NEXT_PUBLIC_API_BASE_URL` for the client.

## Configuration

Retrieval and chat settings live in `backend/backend/src/main/resources/application.properties`:

| Property | Default | Meaning |
|---|---|---|
| `app.indexing.max-file-bytes` | `102400` | Files larger than this are not indexed |
| `app.indexing.chunk-size` | `800` | Chunk size used when splitting files |
| `app.rag.top-k` | `8` | Chunks retrieved per question |
| `app.rag.min-similarity` | `0.3` | Minimum cosine similarity for a chunk to be used |
| `app.rag.max-context-tokens` | `6000` | Token budget for retrieved code in one prompt |
| `app.chat.history-messages` | `8` | Previous messages sent as conversation history |
| `app.chat.max-history-tokens` | `2000` | Token budget for that history |
| `spring.ai.openai.chat.temperature` | `0.2` | Model temperature |
| `spring.ai.openai.chat.max-tokens` | `1500` | Maximum answer length |

The system prompt is in `backend/backend/src/main/resources/prompts/system.st`.

## API

All endpoints except login require an authenticated session.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/repos?refresh=true` | List repositories (`refresh=true` syncs from GitHub first) |
| `GET` | `/api/repos/{id}` | One repository |
| `POST` | `/api/repos/{id}/index` | Start indexing (`202`, `409` if already running) |
| `GET` | `/api/repos/{id}/status` | Indexing progress |
| `POST` | `/api/repos/{id}/chat/stream` | Ask a question, body `{ "sessionId"?: string, "question": string }`. Responds with an SSE stream |
| `GET` | `/api/repos/{id}/chat/sessions` | Chat sessions for a repository |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | Messages of a session, with sources |
| `PATCH` | `/api/chat/sessions/{sessionId}` | Rename a session, body `{ "title": string }` |
| `DELETE` | `/api/chat/sessions/{sessionId}` | Delete a session and its messages |

The chat stream sends these events, each with a JSON payload:

| Event | Payload |
|---|---|
| `meta` | `sessionId`, `sessionTitle`, `userMessageId`, `sources` (sent first) |
| `token` | `content`, one piece of the answer |
| `done` | `messageId` of the saved answer |
| `error` | `message` |

Errors before the stream starts are returned as JSON `{ "message": ... }` with status `400`, `404` or `409` (repository not indexed yet).

## Project structure

```
backend/backend/      Spring Boot API
  controller/         REST endpoints (auth, repos, chat)
  services/indexing/  file filtering, chunking, indexing jobs
  services/ai/        retrieval, prompt building, chat streaming, chat history
  services/github/    GitHub API client
  entity/, repository/, dto/
client/               Next.js app
  app/                routes (login, dashboard, repositories, chat)
  components/chat/    chat UI
  components/repos/   repository cards and list
  hooks/, lib/        data hooks, API client, SSE parsing
docker/postgres/      database init script
docker-compose.yaml   Postgres + pgvector
```
