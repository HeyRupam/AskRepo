"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [query, setQuery] = useState(
        () => new QueryClient()
    )

    return (
        <QueryClientProvider client={query}>
            {children}
        </QueryClientProvider>
    )
}
