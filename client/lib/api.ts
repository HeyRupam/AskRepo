export type User = {
    id: string,
    githubId: number,
    githubUsername: string,
    displayName: string,
    avatarUrl: string | null
}

export type IndexStatus = "PENDING" | "INDEXING" | "READY" | "FAILED"

export type Repository = {
    id: string,
    githubRepoId: number,
    owner: string,
    name: string,
    fullName: string,
    isPrivate: boolean,
    // NOTE: the backend DTO spells this field "defaulBranch"
    defaulBranch: string | null,
    language: string | null,
    htmlUrl: string,
    description: string | null,
    indexStatus: IndexStatus,
    indexedAt: string | null,
    chunkCount: number,
    filesTotal: number,
    filesProcessed: number,
    errorMessage: string | null
}

export type IndexStatusResponse = {
    repoId: string,
    indexStatus: IndexStatus,
    filesTotal: number,
    filesProcessed: number,
    chunkCount: number,
    indexedAt: string | null,
    errorMessage: string | null
}

export function getApiBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
}

export async function getGithubLoginUrl() {
    return `${getApiBaseUrl()}/oauth2/authorization/github`
}

export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

async function parseError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        return data.message ?? data.error ?? res.statusText;
    } catch {
        return res.statusText;
    }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        throw new ApiError(res.status, await parseError(res));
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

export const api = {
    me: () => apiFetch<User>("/api/auth/me"),
    logout: () => apiFetch<void>("/api/auth/logout", {
        method: "POST"
    }),
    repos: {
        /** refresh=false reads the cached list; refresh=true syncs from GitHub first. */
        list: (refresh = false) =>
            apiFetch<Repository[]>(`/api/repos?refresh=${refresh}`),
        index: (id: string) =>
            apiFetch<Repository>(`/api/repos/${id}/index`, { method: "POST" }),
        status: (id: string) =>
            apiFetch<IndexStatusResponse>(`/api/repos/${id}/status`),
    },
    chat: {
        sessions: (repoId: string) =>
            apiFetch<ChatSession[]>(`/api/repos/${repoId}/chat/sessions`),
        messages: (sessionId: string) =>
            apiFetch<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`),
        rename: (sessionId: string, title: string) =>
            apiFetch<ChatSession>(`/api/chat/sessions/${sessionId}`, {
                method: "PATCH",
                body: JSON.stringify({ title }),
            }),
        remove: (sessionId: string) =>
            apiFetch<void>(`/api/chat/sessions/${sessionId}`, { method: "DELETE" }),
    },
}

export type SourceRef = {
    filePath: string,
    chunkIndex: number,
    language: string,
    score: number,
    preview: string
}

export type ChatSession = {
    id: string,
    repositoryId: string,
    title: string,
    createdAt: string,
    updatedAt: string
}

export type ChatRole = "USER" | "ASSISTANT"

export type ChatMessage = {
    id: string,
    sessionId: string,
    role: ChatRole,
    content: string,
    sources: SourceRef[],
    createdAt: string
}

export type ChatStreamHandlers = {
    onMeta?: (meta: { sessionId: string, sessionTitle: string, userMessageId: string, sources: SourceRef[] }) => void,
    onToken?: (content: string) => void,
    onDone?: (done: { messageId: string }) => void,
    onError?: (message: string) => void,
}

export async function streamChat(
    repoId: string,
    body: { sessionId?: string | null, question: string },
    handlers: ChatStreamHandlers,
    signal?: AbortSignal,
): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/api/repos/${repoId}/chat/stream`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
        },
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok) {
        throw new ApiError(res.status, await parseError(res));
    }
    if (!res.body) {
        throw new ApiError(500, "Streaming is not supported by this browser");
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";

    const dispatch = (block: string) => {
        let event = "message";
        const data: string[] = [];
        for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
                event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
                const value = line.slice(5);
                data.push(value.startsWith(" ") ? value.slice(1) : value);
            }
        }
        if (data.length === 0) return;
        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(data.join("\n"));
        } catch {
            return;
        }
        switch (event) {
            case "meta":
                handlers.onMeta?.(payload as Parameters<NonNullable<ChatStreamHandlers["onMeta"]>>[0]);
                break;
            case "token":
                handlers.onToken?.(String(payload.content ?? ""));
                break;
            case "done":
                handlers.onDone?.(payload as { messageId: string });
                break;
            case "error":
                handlers.onError?.(String(payload.message ?? "Something went wrong"));
                break;
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value.replace(/\r\n/g, "\n");
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
            dispatch(buffer.slice(0, sep));
            buffer = buffer.slice(sep + 2);
        }
    }
    if (buffer.trim()) dispatch(buffer);
}