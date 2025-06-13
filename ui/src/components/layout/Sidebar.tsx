import {
    ArrowUpTrayIcon,
    BoltIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClockIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
    FolderIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    XCircleIcon
} from '@heroicons/react/24/outline'
import {
    ChatBubbleLeftRightIcon as ChatIconSolid,
    DocumentTextIcon as DocumentIconSolid,
    HomeIcon as HomeIconSolid,
    Cog6ToothIcon as SettingsIconSolid,
} from '@heroicons/react/24/solid'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDocuments } from '../../contexts/DocumentContext'
import DocumentUpload from '../ui/DocumentUpload'
import LoadingSpinner from '../ui/LoadingSpinner'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, activeIcon: ChatIconSolid },
  { name: 'Documents', href: '/documents', icon: DocumentTextIcon, activeIcon: DocumentIconSolid },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, activeIcon: SettingsIconSolid },
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const { documents, loading } = useDocuments()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    (doc.filename || doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.originalName || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) // Show only first 5 results

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
      case 'processing':
        return <BoltIcon className="h-3.5 w-3.5 text-yellow-600 animate-pulse" />
      case 'pending':
        return <ClockIcon className="h-3.5 w-3.5 text-blue-600" />
      case 'failed':
        return <XCircleIcon className="h-3.5 w-3.5 text-red-600" />
      default:
        return <div className="w-3.5 h-3.5 bg-gray-400 rounded-full" />
    }
  }

  return (
    <>
      <div className="flex h-full w-64 flex-col bg-white/80 backdrop-blur-sm shadow-xl border-r border-gray-200/50">
        {/* Header */}
        <div className="flex h-16 items-center px-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ThinkDocs
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm shadow-lg">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-lg"
              />
            ) : (
              getInitials(user?.name || 'User')
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            const Icon = isActive ? item.activeIcon : item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 hover:shadow-md'
                )}
              >
                <Icon
                  className={clsx(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="px-4 py-4 border-t border-gray-200/50 space-y-3">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Upload Document
          </button>

          <Link
            to="/chat"
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Chat
          </Link>
        </div>

        {/* Quick Document Access */}
        <div className="px-4 pb-6">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Recent Documents
            </h3>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
            />
          </div>

          {/* Document List */}
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center px-3 py-2.5 text-xs text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-lg group transition-all duration-200 hover:shadow-sm"
                >
                  <FolderIcon className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors duration-200" />
                  <span className="truncate flex-1 group-hover:text-gray-900 font-medium" title={doc.filename || doc.title || doc.originalName || 'Untitled'}>
                    {doc.filename || doc.title || doc.originalName || 'Untitled'}
                  </span>
                  <div className="ml-2 flex-shrink-0" title={`Status: ${doc.status}`}>
                    {getStatusIcon(doc.status)}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg border border-gray-100">
                <div className="flex justify-center mb-2">
                  <DocumentTextIcon className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-xs text-gray-500 font-medium mb-2">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-400">
                    Upload your first document to get started
                  </p>
                )}
              </div>
            )}
          </div>

          {documents.length > 5 && !searchQuery && (
            <Link
              to="/documents"
              className="block text-xs font-medium text-blue-600 hover:text-purple-600 text-center mt-3 py-2 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              View all documents ({documents.length})
            </Link>
          )}
        </div>
      </div>

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

      {/* Click outside to close upload modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUpload(false)}
        />
      )}
    </>
  )
}
