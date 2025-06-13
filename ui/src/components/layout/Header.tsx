import {
  ArrowRightOnRectangleIcon,
  ArrowUpTrayIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import DocumentUpload from '../ui/DocumentUpload'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
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

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-40">
        {/* Left Section */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Upload Button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* API Status */}
          <div className="flex items-center">
            <div className="flex items-center bg-green-50 text-green-700 px-2 md:px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-xs ml-1.5 font-medium hidden sm:inline">Online</span>
            </div>
          </div>

          {/* Notifications */}
          <button className="relative p-2 md:p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 h-2 w-2 bg-blue-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-2 md:px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium truncate max-w-24">{user?.name}</div>
                <div className="text-xs text-gray-500">Account</div>
              </div>
              <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={handleProfile}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
                  Profile
                </button>

                <button
                  onClick={handleSettings}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                  Settings
                </button>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-400" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Upload Documents
              </h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <DocumentUpload
                onUploadComplete={() => {
                  setShowUpload(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

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
