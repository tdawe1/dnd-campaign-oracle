import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Campaign data is relatively static, so we can cache it for a while
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000,   // 30 minutes

            // Gaming app specific: manual refetch is often preferred or sufficient
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,

            // Retry logic with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            retry: 1,
            onError: (error) => {
                // Global mutation error handling could go here
                console.error('Mutation failed:', error)
            },
        },
    },
})
