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
    createdAt: string,
    chunkCount: number,
    filesTotal: number,
    filesProcessed: number,
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
    },
}