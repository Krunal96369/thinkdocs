import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
    language: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshToken()
      }, 15 * 60 * 1000) // Refresh every 15 minutes

      return () => clearInterval(interval)
    }
  }, [user])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setLoading(false)
        return
      }

      // Set the token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // Verify token and get user data
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('authToken')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await api.post('/auth/login', { email, password })

      const { access_token, user: userData } = response.data

      // Store token
      localStorage.setItem('authToken', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Set user data
      setUser(userData)

      toast.success('Welcome back!')
      return true
    } catch (error: any) {
      console.error('Login failed:', error)
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await api.post('/auth/register', { email, password, name })

      const { access_token, user: userData } = response.data

      // Store token
      localStorage.setItem('authToken', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Set user data
      setUser(userData)

      toast.success(`Welcome to ThinkDocs, ${userData.name}!`)
      return true
    } catch (error: any) {
      console.error('Registration failed:', error)
      const message = error.response?.data?.detail || 'Registration failed'
      toast.error(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('authToken')

    // Clear API headers
    delete api.defaults.headers.common['Authorization']

    // Clear user state
    setUser(null)

    // Navigate to login
    navigate('/login')

    // Show success message
    toast.success('Logged out successfully')
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates })
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await api.post('/auth/refresh')
      const { access_token } = response.data

      localStorage.setItem('authToken', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      return false
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
