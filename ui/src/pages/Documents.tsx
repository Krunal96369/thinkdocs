import {
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  PresentationChartBarIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import DocumentUpload from '../components/ui/DocumentUpload'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDocuments } from '../contexts/DocumentContext'
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
  const [showUpload, setShowUpload] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Use shared DocumentContext instead of separate API call
  const { documents, loading: isLoading, refreshDocuments } = useDocuments()

  // Debug log to help identify issues
  console.log('Documents data:', {
    documents,
    isLoading,
    documentsLength: documents?.length
  })

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsAPI.delete(id),
    onSuccess: () => {
      refreshDocuments()
      toast.success('Document deleted')
      setActiveMenu(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete document')
    },
  })

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => {
    if (!doc) return false
    const filename = doc.filename || ''
    const tags = doc.tags || []

    return filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
           tags.some(tag => tag?.toLowerCase().includes(searchQuery.toLowerCase()))
  })

    const getStatusIcon = (status: string) => {
      switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
        case 'processing':
        return <ClockIcon className="w-4 h-4 text-amber-500" />
        case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />
        default:
        return <DocumentIcon className="w-4 h-4 text-slate-400" />
    }
  }

  const getFileIcon = (contentType: string) => {
    if (contentType?.includes('pdf')) return <DocumentTextIcon className="w-5 h-5 text-red-500" />
    if (contentType?.includes('image')) return <PhotoIcon className="w-5 h-5 text-blue-500" />
    if (contentType?.includes('presentation')) return <PresentationChartBarIcon className="w-5 h-5 text-orange-500" />
    return <DocumentIcon className="w-5 h-5 text-slate-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleDocumentClick = (doc: Document) => {
    if (doc.status === 'completed') {
      navigate(`/chat?document=${doc.id}`)
    } else {
      navigate(`/documents/${doc.id}`)
  }
  }

  const handleMenuClick = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    setActiveMenu(activeMenu === docId ? null : docId)
  }

  return (
    <div className="min-h-screen bg-white">
        {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
              <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
              <p className="text-sm text-slate-600 mt-1">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Search with embedded upload */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-12 py-2 w-80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
                <button
                  onClick={() => setShowUpload(true)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  title="Upload document"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <DocumentTextIcon className="w-8 h-8 text-slate-400" />
                </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {documents.length === 0
                  ? 'Upload your first document to get started with AI-powered search and chat.'
                : 'Try adjusting your search criteria.'
                }
              </p>
              {documents.length === 0 && (
                <button
                  onClick={() => setShowUpload(true)}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  Upload Your First Document
                </button>
              )}
            </div>
          ) : (
          <div className="space-y-1">
            {filteredDocuments.map((doc) => (
                <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className="group relative flex items-center p-4 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 mr-4">
                  {getFileIcon(doc.content_type)}
                          </div>

                {/* Main Content */}
                          <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 truncate">
                      {doc.title || doc.filename}
                            </h3>
                    {getStatusIcon(doc.status)}
                      </div>

                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>Updated {formatDate(doc.processed_at || doc.upload_date)}</span>
                    <span>{formatFileSize(doc.size)}</span>
                    {doc.page_count && <span>{doc.page_count} pages</span>}
                    {doc.word_count && <span>{doc.word_count.toLocaleString()} words</span>}
                      </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {doc.tags.slice(0, 3).map((tag) => (
                            <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                      {doc.tags.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{doc.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                </div>

                {/* Action Menu */}
                <div className="flex-shrink-0 ml-4 relative">
                        <button
                    onClick={(e) => handleMenuClick(e, doc.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                          </button>

                          {/* Dropdown Menu */}
                  {activeMenu === doc.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/documents/${doc.id}`)
                          setActiveMenu(null)
                                  }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                        View Details
                                </button>
                      {doc.status === 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/chat?document=${doc.id}`)
                            setActiveMenu(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                          Start Chat
                          </button>
                        )}
                      <hr className="my-1 border-slate-100" />
                          <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMutation.mutate(doc.id)
                                  }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Delete
                                </button>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Upload Documents</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
              </div>
            <DocumentUpload
              onUploadComplete={() => {
                refreshDocuments()
                setShowUpload(false)
              }}
            />
          </div>
      </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  )
}
