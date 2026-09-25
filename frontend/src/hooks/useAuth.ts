import { useState, useEffect, useCallback } from 'react'
import { getAuthToken, getUserInfo, clearAuthToken, clearUserInfo } from '../api'
import type { User } from '../types'

/**
 * 认证状态管理：token 检测、登录/登出、401 事件监听
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken())
  const [currentUser, setCurrentUser] = useState<User | null>(getUserInfo())

  // Listen for auth:logout events (from axios interceptor)
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false)
      setCurrentUser(null)
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true)
    setCurrentUser(getUserInfo())
  }, [])

  const handleLogout = useCallback(() => {
    clearAuthToken()
    clearUserInfo()
    setIsAuthenticated(false)
    setCurrentUser(null)
  }, [])

  return { isAuthenticated, currentUser, handleLoginSuccess, handleLogout }
}
