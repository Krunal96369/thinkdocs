import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  const handleSettings = () => {
    navigate('/settings')
    setShowUserMenu(false)
  }

  const handleProfile = () => {
    navigate('/profile')
    setShowUserMenu(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-slate-600 hidden sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Right Section - Minimal User */}
        <div className="flex items-center gap-3">
          {/* Simple Status */}
          <div className="w-2 h-2 bg-emerald-500 rounded-full" title="System online"></div>

          {/* Simple User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1 text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {getInitials(user?.name || 'User')}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </button>

            {/* Simplified Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button
                  onClick={handleSettings}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-3 text-slate-400" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3 text-red-400" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  )
}
