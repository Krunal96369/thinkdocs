import {
  ArrowDownTrayIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  ListBulletIcon,
  PhotoIcon,
  PresentationChartBarIcon,
  Squares2X2Icon,
  TagIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import DocumentUpload from '../components/ui/DocumentUpload'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { documentsAPI } from '../services/api'

interface Document {
  id: string
  filename: string
  title: string
  size: number
  content_type: string
  status: string
  tags: string[]
  upload_date: string
  processed_at?: string
  user_id: string
  page_count?: number
  word_count?: number
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch documents
  const {
    data: documentsResponse,
    isLoading,
    error
  } = useQuery({
    queryKey: ['documents', { status: selectedStatus === 'all' ? undefined : selectedStatus }],
    queryFn: () => documentsAPI.getAll({ status: selectedStatus === 'all' ? undefined : selectedStatus }),
    refetchInterval: 5000, // Refresh every 5 seconds to show processing updates
  })

  const documents: Document[] = documentsResponse?.data?.documents || []

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete document')
    },
  })

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
    } as const

    const getStatusIcon = (status: string) => {
      const iconClass = "h-3 w-3"
      switch (status) {
        case 'pending':
          return <ClockIcon className={iconClass} />
        case 'processing':
          return <BoltIcon className={`${iconClass} animate-pulse`} />
        case 'completed':
          return <CheckCircleIcon className={iconClass} />
        case 'failed':
          return <XCircleIcon className={iconClass} />
        default:
          return <DocumentIcon className={iconClass} />
      }
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
        statusStyles[status as keyof typeof statusStyles] || 'bg-gray-50 text-gray-700 border-gray-200'
      }`}>
        <span className="mr-1">{getStatusIcon(status)}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getFileIcon = (contentType: string) => {
    const iconClass = "h-6 w-6 text-gray-600"

    if (contentType?.includes('pdf')) {
      return <DocumentIcon className={`${iconClass} text-red-600`} />
    }
    if (contentType?.includes('word') || contentType?.includes('document')) {
      return <DocumentTextIcon className={`${iconClass} text-blue-600`} />
    }
    if (contentType?.includes('text') || contentType?.includes('plain')) {
      return <DocumentTextIcon className={`${iconClass} text-gray-600`} />
    }
    if (contentType?.includes('image')) {
      return <PhotoIcon className={`${iconClass} text-green-600`} />
    }
    if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) {
      return <PresentationChartBarIcon className={`${iconClass} text-orange-600`} />
    }
    return <DocumentIcon className={iconClass} />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.filename}"?`)) {
      deleteMutation.mutate(document.id)
    }
  }

  const handleView = (document: Document) => {
    navigate(`/documents/${document.id}`)
  }

  const handleDownload = (document: Document) => {
    // TODO: Implement download functionality
    toast('Download feature coming soon!')
  }

  const handleChat = (document: Document) => {
    navigate(`/chat?document=${document.id}`)
  }

  // Calculate statistics
  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'completed').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed').length,
    totalSize: documents.reduce((acc, doc) => acc + doc.size, 0),
    totalPages: documents.reduce((acc, doc) => acc + (doc.page_count || 0), 0),
    totalWords: documents.reduce((acc, doc) => acc + (doc.word_count || 0), 0),
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-white/50 max-w-md mx-auto">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 mb-6">
                <XCircleIcon className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                Error Loading Documents
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {(error as any)?.response?.data?.message || 'Failed to load documents'}
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Documents
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your documents and enable AI-powered search and chat
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-white/80 hover:shadow-md transition-all duration-200 flex items-center text-gray-700 bg-white/60 backdrop-blur-sm"
            >
              {viewMode === 'grid' ? (
                <>
                  <ListBulletIcon className="h-5 w-5 mr-2" />
                  List
                </>
              ) : (
                <>
                  <Squares2X2Icon className="h-5 w-5 mr-2" />
                  Grid
                </>
              )}
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2 rotate-180" />
              {showUpload ? 'Hide Upload' : 'Upload Documents'}
            </button>
          </div>
        </div>

        {/* Statistics Cards - Simplified & Focused */}
        {documents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Documents</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.completed} ready for AI</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Storage</p>
                  <p className="text-3xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.totalPages.toLocaleString()} pages total</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TagIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Processing</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.processing}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.failed > 0 ? `${stats.failed} failed` : 'All processed'}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <ChartBarIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/50">
              <div className="p-8">
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">Upload New Documents</h2>
                <DocumentUpload
                  onUploadComplete={(document) => {
                    setShowUpload(false)
                    toast.success(`${document.filename} uploaded successfully!`)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search documents by name, title, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/50">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl">
                  <DocumentTextIcon className="h-20 w-20 text-gray-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                {documents.length === 0
                  ? 'Upload your first document to get started with AI-powered search and chat.'
                  : 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                }
              </p>
              {documents.length === 0 && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <ArrowDownTrayIcon className="h-6 w-6 mr-3 rotate-180" />
                  Upload Your First Document
                </button>
              )}
            </div>
          ) : (
            <div className={`p-8 ${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8' : 'space-y-2'}`}>
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-2xl hover:border-blue-200 hover:shadow-xl transition-all duration-300 ${
                    viewMode === 'grid' ? 'p-6' : 'p-5'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid View - Simplified & Clean
                    <div className="space-y-4">
                      {/* Header with clear hierarchy */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="p-2 bg-gray-50 rounded-xl border">
                            {getFileIcon(document.content_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleView(document)}
                              title="Click to view document"
                            >
                              {document.title || document.filename}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                              {formatFileSize(document.size)} • {formatDate(document.upload_date)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(document.status)}
                      </div>

                      {/* Key metadata only */}
                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100">
                        {document.page_count && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-900">{document.page_count}</p>
                            <p className="text-xs text-gray-500">Pages</p>
                          </div>
                        )}
                        {document.word_count && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-900">{document.word_count.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Words</p>
                          </div>
                        )}
                      </div>

                      {/* Tags - if any */}
                      {document.tags && document.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {document.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 border"
                            >
                              {tag}
                            </span>
                          ))}
                          {document.tags.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-500">
                              +{document.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Simplified Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(document)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          {document.status === 'completed' ? 'Open' : 'View'}
                        </button>

                        {document.status === 'completed' && (
                          <button
                            onClick={() => handleChat(document)}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                            Chat
                          </button>
                        )}

                        {/* More actions dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === document.id ? null : document.id)}
                            className="p-2.5 border border-gray-300 text-gray-400 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors"
                            title="More actions"
                          >
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdown === document.id && (
                            <>
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                  onClick={() => {
                                    handleDownload(document)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4 mr-3 text-gray-400" />
                                  Download
                                </button>

                                <div className="border-t border-gray-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    handleDelete(document)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4 mr-3 text-red-400" />
                                  Delete
                                </button>
                              </div>

                              {/* Click outside to close */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenDropdown(null)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // List View - Clean & Efficient
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* File Icon */}
                        <div className="p-2 bg-gray-50 rounded-xl border">
                          {getFileIcon(document.content_type)}
                        </div>

                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3
                              className="text-base font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleView(document)}
                            >
                              {document.title || document.filename}
                            </h3>
                            {getStatusBadge(document.status)}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatFileSize(document.size)}</span>
                            {document.page_count && <span>{document.page_count} pages</span>}
                            <span>{formatDate(document.upload_date)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Compact Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleView(document)}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                        >
                          {document.status === 'completed' ? 'Open' : 'View'}
                        </button>

                        {document.status === 'completed' && (
                          <button
                            onClick={() => handleChat(document)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium"
                          >
                            Chat
                          </button>
                        )}

                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === document.id ? null : document.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="More actions"
                          >
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdown === document.id && (
                            <>
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                  onClick={() => {
                                    handleDownload(document)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4 mr-3 text-gray-400" />
                                  Download
                                </button>

                                <div className="border-t border-gray-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    handleDelete(document)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4 mr-3 text-red-400" />
                                  Delete
                                </button>
                              </div>

                              {/* Click outside to close */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenDropdown(null)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer - Enhanced */}
        {documents.length > 0 && (
          <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
            <p className="text-gray-600 font-medium">
              <span className="font-bold text-gray-900">Showing {filteredDocuments.length}</span> of{' '}
              <span className="font-bold text-gray-900">{documents.length}</span> documents
              {searchQuery && (
                <span className="ml-2">
                  matching "<span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{searchQuery}</span>"
                </span>
              )}
            </p>
            {stats.completed > 0 && (
              <div className="mt-2">
                <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 rounded-xl text-sm font-semibold border border-green-200/50">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {stats.completed} documents ready for AI chat
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
