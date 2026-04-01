import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css' // Import global styles

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

import { AuthProvider } from '../contexts/AuthContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { NotificationProvider } from './contexts/NotificationContext'

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = createRoot(rootElement)
    root.render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <NotificationProvider>
                        <RouterProvider router={router} />
                    </NotificationProvider>
                </AuthProvider>
            </QueryClientProvider>
        </StrictMode>,
    )
}
