import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoginPage } from '../../components/LoginPage'
import { useAuth } from '../../contexts/AuthContext'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
    component: LoginRoute,
})

function LoginRoute() {
    const { user, isDemo } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user || isDemo) {
            navigate({ to: '/' })
        }
    }, [user, isDemo, navigate])

    return <LoginPage />
}
