import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import {
  ChatBubbleLeftRightIcon as ChatIconSolid
} from '@heroicons/react/24/solid'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { documentsAPI } from '../services/api'

interface DocumentContent {
  document_id: string
  content: string
  total_pages: number
  current_page: number
  chunks: Array<{
    id: string
    content: string
    page_number: number
    chunk_index: number
  }>
}

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

export default function DocumentViewer() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedContent, setHighlightedContent] = useState<string>('')

  // Fetch document metadata
  const {
    data: documentResponse,
    isLoading: documentLoading,
    error: documentError
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsAPI.getById(documentId!),
    enabled: !!documentId,
  })

  // Fetch document content
  const {
    data: contentResponse,
    isLoading: contentLoading,
    error: contentError,
    refetch: refetchContent
  } = useQuery({
    queryKey: ['document-content', documentId, currentPage],
    queryFn: () => documentsAPI.getContent(documentId!, currentPage),
    enabled: !!documentId,
  })

  const documentData: Document = documentResponse?.data
  const content: DocumentContent = contentResponse?.data

  // Handle search within document
  useEffect(() => {
    if (content?.content && searchQuery) {
      const regex = new RegExp(`(${searchQuery})`, 'gi')
      const highlighted = content.content.replace(regex, '<mark class="bg-yellow-200 px-1 py-0.5 rounded font-medium text-yellow-900">$1</mark>')
      setHighlightedContent(highlighted)
    } else {
      setHighlightedContent(content?.content || '')
    }
  }, [content?.content, searchQuery])

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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (content?.total_pages || 1)) {
      setCurrentPage(page)
    }
  }

  const downloadDocument = async () => {
    try {
      if (content?.content) {
        const blob = new Blob([content.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = `${documentData.filename}_extracted_text.txt`
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Document content downloaded successfully!')
      } else {
        toast('No content available for download')
      }
    } catch (error) {
      toast.error('Failed to download document content')
    }
  }

  // Error states
  if (documentError || contentError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center bg-white rounded-lg border border-slate-200 p-12 max-w-lg mx-auto">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Document not found
            </h2>
            <p className="text-slate-600 mb-8">
              {(documentError as any)?.response?.data?.message ||
               (contentError as any)?.response?.data?.message ||
               'We couldn\'t load this document. Please try again.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center px-6 py-3 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Documents
              </button>
              <button
                onClick={() => refetchContent()}
                className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (documentLoading || contentLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-600">Loading document...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!documentData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center bg-white rounded-lg border border-slate-200 p-12 max-w-lg mx-auto">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
              <DocumentTextIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Document Not Found
            </h2>
            <p className="text-slate-600 mb-8">
              This document doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Documents
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Documents
            </button>

            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-sm ${
                documentData.status === 'completed'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {documentData.status === 'completed' ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                ) : (
                  <ClockIcon className="h-4 w-4 mr-2" />
                )}
                {documentData.status === 'completed' ? 'Ready' : 'Processing'}
              </div>
            </div>
          </div>

          {/* Document Title and Metadata */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mb-4">
                {documentData.title || documentData.filename}
              </h1>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center text-slate-600">
                  <DocumentIcon className="h-5 w-5 mr-2 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{formatFileSize(documentData.size)}</div>
                    <div className="text-xs text-slate-500">File size</div>
                  </div>
                </div>

                <div className="flex items-center text-slate-600">
                  <CalendarIcon className="h-5 w-5 mr-2 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{formatDate(documentData.upload_date)}</div>
                    <div className="text-xs text-slate-500">Uploaded</div>
                  </div>
                </div>

                {documentData.page_count && (
                  <div className="flex items-center text-slate-600">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{documentData.page_count} pages</div>
                      <div className="text-xs text-slate-500">Total pages</div>
                    </div>
                  </div>
                )}

                {documentData.word_count && (
                  <div className="flex items-center text-slate-600">
                    <EyeIcon className="h-5 w-5 mr-2 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{documentData.word_count.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">Words</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:w-80">
              {/* Search */}
              <div className="relative flex-1 lg:w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={downloadDocument}
                  className="flex items-center px-4 py-3 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium"
                  title="Download document"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                {documentData.status === 'completed' && (
                  <button
                    onClick={() => navigate(`/chat?document=${documentData.id}`)}
                    className="flex items-center px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    title="Chat with this document"
                  >
                    <ChatIconSolid className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Chat</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Page Navigation */}
          {content && content.total_pages > 1 && (
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <div className="text-lg font-semibold text-slate-900 mr-4">
                    Page {currentPage} of {content.total_pages}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="flex items-center px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Previous
                  </button>

                  <span className="px-4 py-2 text-sm text-slate-600">
                    {currentPage} / {content.total_pages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= content.total_pages}
                    className="flex items-center px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Next
                    <ArrowLeftIcon className="h-4 w-4 ml-1 rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Content */}
          <div className="p-8">
            {content?.content ? (
              <div
                className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No content available for this document.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
