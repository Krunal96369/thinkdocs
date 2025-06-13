import {
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    CalendarIcon,
    ClockIcon,
    DocumentIcon,
    DocumentTextIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    XCircleIcon
} from '@heroicons/react/24/outline'
import {
    ChatBubbleLeftRightIcon as ChatIconSolid,
    DocumentTextIcon as DocumentTextIconSolid
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

  const document: Document = documentResponse?.data
  const content: DocumentContent = contentResponse?.data

  // Handle search within document
  useEffect(() => {
    if (content?.content && searchQuery) {
      const regex = new RegExp(`(${searchQuery})`, 'gi')
      const highlighted = content.content.replace(regex, '<mark class="bg-yellow-300/80 px-1 py-0.5 rounded font-semibold text-yellow-900">$1</mark>')
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
        const a = document.createElement('a')
        a.href = url
        a.download = `${document.filename}_extracted_text.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Document content downloaded successfully!')
      } else {
        toast.info('No content available for download')
      }
    } catch (error) {
      toast.error('Failed to download document content')
    }
  }

  const getFileTypeInfo = () => {
    const contentType = document?.content_type || ''
    const filename = document?.filename || ''

    if (contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
      return { type: 'PDF', color: 'red', icon: DocumentTextIconSolid }
    } else if (contentType.includes('word') || filename.toLowerCase().includes('.doc')) {
      return { type: 'Word', color: 'blue', icon: DocumentIcon }
    } else if (contentType.includes('text') || filename.toLowerCase().endsWith('.txt')) {
      return { type: 'Text', color: 'gray', icon: DocumentTextIcon }
    } else {
      return { type: 'Document', color: 'gray', icon: DocumentTextIcon }
    }
  }

  const fileInfo = getFileTypeInfo()

  // Error states
  if (documentError || contentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60 max-w-lg mx-auto">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-red-50 to-orange-50 mb-8">
              <XCircleIcon className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed text-lg">
              {(documentError as any)?.response?.data?.message ||
               (contentError as any)?.response?.data?.message ||
               'We couldn\'t load this document. Please try again.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-semibold"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Documents
              </button>
              <button
                onClick={() => refetchContent()}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60">
            <LoadingSpinner size="lg" />
            <p className="mt-6 text-gray-600 font-semibold text-lg">Loading your document...</p>
            <p className="mt-2 text-gray-500 text-sm">This might take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60 max-w-lg mx-auto">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-gray-50 to-blue-50 mb-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Document Not Found
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed text-lg">
              This document doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-white/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Top Row - Back button and basic info */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-semibold shadow-sm"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Documents
              </button>

              <div className="flex items-center space-x-3">
                {/* Status Badge */}
                <div className={`inline-flex items-center px-4 py-2 rounded-xl font-semibold text-sm ${
                  document.status === 'completed'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {document.status === 'completed' ? (
                    <SparklesIcon className="h-4 w-4 mr-1.5" />
                  ) : (
                    <ClockIcon className="h-4 w-4 mr-1.5 animate-pulse" />
                  )}
                  {document.status === 'completed' ? 'Ready' : 'Processing'}
                </div>

                {/* File Type Badge */}
                <div className={`inline-flex items-center px-4 py-2 rounded-xl font-semibold text-sm border
                  ${fileInfo.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                    fileInfo.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  <fileInfo.icon className="h-4 w-4 mr-1.5" />
                  {fileInfo.type}
                </div>
              </div>
            </div>

            {/* Document Title and Metadata */}
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight mb-4">
                  {document.title || document.filename}
                </h1>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <DocumentIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{formatFileSize(document.size)}</div>
                      <div className="text-xs text-gray-500">File size</div>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{formatDate(document.upload_date)}</div>
                      <div className="text-xs text-gray-500">Uploaded</div>
                    </div>
                  </div>

                  {document.page_count && (
                    <div className="flex items-center text-gray-600">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{document.page_count} pages</div>
                        <div className="text-xs text-gray-500">Total pages</div>
                      </div>
                    </div>
                  )}

                  {document.word_count && (
                    <div className="flex items-center text-gray-600">
                      <EyeIcon className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{document.word_count.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Words</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row xl:flex-col gap-4 xl:w-80">
                {/* Enhanced Search */}
                <div className="relative flex-1 xl:w-full">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm transition-all duration-200 font-medium placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <XCircleIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={downloadDocument}
                    className="flex items-center px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-semibold shadow-sm"
                    title="Download document"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  {document.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/chat?document=${document.id}`)}
                      className="flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg"
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
          {/* Enhanced Page Navigation */}
          {content && content.total_pages > 1 && (
            <div className="bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50 border-b border-gray-200/50 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <div className="text-lg font-bold text-gray-900 mr-4">
                    Page {currentPage} of {content.total_pages}
                  </div>
                  <div className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full border">
                    {Math.round((currentPage / content.total_pages) * 100)}% complete
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-end space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    First
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="flex items-center px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Previous
                  </button>

                  <div className="flex items-center space-x-1 mx-4">
                    {Array.from({ length: Math.min(content.total_pages, 7) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-200 ${
                            page === currentPage
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}

                    {content.total_pages > 7 && (
                      <span className="text-gray-500 px-2 font-semibold">...</span>
                    )}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= content.total_pages}
                    className="flex items-center px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    Next
                    <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handlePageChange(content.total_pages)}
                    disabled={currentPage >= content.total_pages}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Content */}
          <div className="p-8 lg:p-12">
            {content && content.content && content.content.trim() ? (
              <div className="space-y-8">
                {document.status === 'completed' ? (
                  <>
                    {/* Search Results Info */}
                    {searchQuery && (
                      <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200/50 rounded-2xl shadow-sm">
                        <div className="flex items-center">
                          <MagnifyingGlassIcon className="h-6 w-6 text-yellow-600 mr-3" />
                          <div>
                            <p className="text-lg font-semibold text-yellow-800">
                              Searching for: <span className="font-bold">"{searchQuery}"</span>
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                              Highlighted matches are shown in yellow below
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main Content Container */}
                    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center">
                          <DocumentTextIconSolid className="h-6 w-6 text-blue-600 mr-3" />
                          <h3 className="text-lg font-bold text-gray-900">Document Content</h3>
                          {content.total_pages > 1 && (
                            <span className="ml-auto text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                              Page {currentPage}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="p-8 lg:p-12 text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-lg selection:bg-blue-100"
                        style={{
                          lineHeight: '1.9',
                          fontSize: '1.125rem',
                          maxWidth: 'none'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: highlightedContent
                        }}
                      />
                    </div>
                  </>
                ) : (
                  // Enhanced Processing State
                  <div className="text-center py-20">
                    <div className="mx-auto flex items-center justify-center h-28 w-28 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 mb-8 border-2 border-yellow-200/50">
                      <svg className="h-14 w-14 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                      Processing Your Document
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
                      We're extracting and analyzing the content of your document. This usually takes just a few moments.
                    </p>
                    <div className="inline-flex items-center px-6 py-3 rounded-xl text-lg bg-yellow-50 text-yellow-800 border-2 border-yellow-200 font-semibold">
                      <ClockIcon className="h-5 w-5 mr-2 animate-pulse" />
                      Status: {document.status}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Enhanced No Content State
              <div className="text-center py-20">
                <div className="mx-auto flex items-center justify-center h-28 w-28 rounded-3xl bg-gradient-to-br from-gray-50 to-blue-50 mb-8 border-2 border-gray-200">
                  <DocumentTextIcon className="h-14 w-14 text-gray-400" />
                </div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                  No Content Available
                </h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
                  This document appears to be empty or the content couldn't be extracted.
                </p>
                <button
                  onClick={() => navigate('/documents')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Documents
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
