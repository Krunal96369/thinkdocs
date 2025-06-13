import {
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

  // Filter documents based on search - ensure documents is an array
  const documentsArray = Array.isArray(documents) ? documents : []
  const filteredDocuments = documentsArray.filter(doc =>
    (doc.filename || '').toLowerCase().includes(searchQuery.toLowerCase())
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
        return <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
      case 'processing':
        return <BoltIcon className="w-3 h-3 text-blue-500 animate-pulse" />
      case 'pending':
        return <ClockIcon className="w-3 h-3 text-amber-500" />
      case 'failed':
        return <XCircleIcon className="w-3 h-3 text-red-500" />
      default:
        return <div className="w-3 h-3 bg-slate-300 rounded-full" />
    }
  }

  return (
    <>
      <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200">
        {/* Header */}
        <div className="flex h-16 items-center px-6 border-b border-slate-200">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <span className="ml-3 text-lg font-bold text-slate-900">
              ThinkDocs
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-medium text-sm">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              getInitials(user?.name || 'User')
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-600 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            const Icon = isActive ? item.activeIcon : item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={clsx(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-700'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions - Minimal */}
        <div className="px-4 py-4 border-t border-slate-200">
          <Link
            to="/chat"
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </Link>
        </div>

        {/* Quick Document Access */}
        <div className="px-4 pb-6">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Recent Documents
            </h3>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white transition-all"
            />
          </div>

          {/* Document List */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg group transition-colors"
                >
                  <FolderIcon className="h-4 w-4 mr-2 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                  <span className="truncate flex-1 group-hover:text-slate-900 font-medium" title={doc.filename || 'Untitled'}>
                    {doc.filename || 'Untitled'}
                  </span>
                  <div className="ml-2 flex-shrink-0" title={`Status: ${doc.status}`}>
                    {getStatusIcon(doc.status)}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setShowUpload(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-slate-900 mb-4">
                      Upload Document
                    </h3>
                    <DocumentUpload
                      onUploadComplete={(document) => {
                        setShowUpload(false)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
