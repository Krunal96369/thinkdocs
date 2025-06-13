import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { createContext, ReactNode, useContext, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

interface Document {
  id: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  processedAt?: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress?: number
  processingStage?: string
  metadata: {
    pages?: number
    words?: number
    language?: string
    topics?: string[]
  }
  tags: string[]
  summary?: string
  userId: string
}

interface DocumentSearchResult {
  document: Document
  chunks: Array<{
    id: string
    content: string
    pageNumber?: number
    score: number
    highlighted: string
  }>
}

interface DocumentContextType {
  documents: Document[]
  loading: boolean
  selectedDocument: Document | null
  searchResults: DocumentSearchResult[]
  uploadDocument: (file: File) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
  searchDocuments: (query: string, filters?: any) => Promise<void>
  selectDocument: (document: Document | null) => void
  updateDocumentTags: (documentId: string, tags: string[]) => Promise<void>
  refreshDocuments: () => void
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined)

export function useDocuments() {
  const context = useContext(DocumentContext)
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider')
  }
  return context
}

interface DocumentProviderProps {
  children: ReactNode
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([])
  const queryClient = useQueryClient()

  // Fetch documents
  const {
    data: documents = [],
    isLoading: loading,
    refetch: refreshDocuments,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.get('/documents')
      return response.data.documents
    },
  })

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            toast.loading(`Uploading: ${progress}%`, {
              id: `upload-${file.name}`,
            })
          }
        },
      })

      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Document uploaded: ${data.document.filename}`, {
        id: `upload-${data.document.originalName}`,
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Upload failed'
      toast.error(message)
    },
  })

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/documents/${documentId}`)
    },
    onSuccess: () => {
      toast.success('Document deleted')
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      if (selectedDocument?.id === arguments[0]) {
        setSelectedDocument(null)
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Delete failed'
      toast.error(message)
    },
  })

  // Update document tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ documentId, tags }: { documentId: string; tags: string[] }) => {
      const response = await api.patch(`/documents/${documentId}/tags`, { tags })
      return response.data
    },
    onSuccess: () => {
      toast.success('Tags updated')
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Update failed'
      toast.error(message)
    },
  })

  // Search documents
  const searchDocuments = async (query: string, filters?: any) => {
    try {
      const response = await api.post('/documents/search', {
        query,
        filters,
        limit: 20,
      })
      setSearchResults(response.data.results)
    } catch (error: any) {
      console.error('Search failed:', error)
      const message = error.response?.data?.message || 'Search failed'
      toast.error(message)
      setSearchResults([])
    }
  }

  const uploadDocument = async (file: File) => {
    await uploadMutation.mutateAsync(file)
  }

  const deleteDocument = async (documentId: string) => {
    await deleteMutation.mutateAsync(documentId)
  }

  const selectDocument = (document: Document | null) => {
    setSelectedDocument(document)
  }

  const updateDocumentTags = async (documentId: string, tags: string[]) => {
    await updateTagsMutation.mutateAsync({ documentId, tags })
  }

  const value: DocumentContextType = {
    documents,
    loading,
    selectedDocument,
    searchResults,
    uploadDocument,
    deleteDocument,
    searchDocuments,
    selectDocument,
    updateDocumentTags,
    refreshDocuments,
  }

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  )
}
