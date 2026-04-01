import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Notification } from '../../types'
import { MOCK_NOTIFICATIONS } from '../../data/mockData'

interface NotificationContextType {
    notifications: Notification[]
    addNotification: (notification: Notification) => void
    markAllRead: () => void
    unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const stored = localStorage.getItem('notifications')
        return stored ? JSON.parse(stored) : MOCK_NOTIFICATIONS
    })

    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications))
    }, [notifications])

    const addNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev])
    }

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, markAllRead, unreadCount }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
