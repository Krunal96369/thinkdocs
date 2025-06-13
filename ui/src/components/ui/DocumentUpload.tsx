import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { documentsAPI } from '../../services/api'

interface DocumentUploadProps {
  onUploadComplete?: (document: any) => void
  className?: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  documentId?: string
  error?: string
}

export default function DocumentUpload({ onUploadComplete, className = '' }: DocumentUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const queryClient = useQueryClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Process each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      const uploadIndex = uploads.length + i

      try {
        // Upload the file
        const response = await documentsAPI.upload(file, (progress) => {
          setUploads(prev => prev.map((upload, idx) =>
            idx === uploadIndex
              ? { ...upload, progress, status: progress === 100 ? 'processing' : 'uploading' }
              : upload
          ))
        })

        // Mark as completed
        setUploads(prev => prev.map((upload, idx) =>
          idx === uploadIndex
            ? {
                ...upload,
                progress: 100,
                status: 'completed',
                documentId: response.data.document.id
              }
            : upload
        ))

        toast.success(`${file.name} uploaded successfully!`)

        // Refresh documents list
        queryClient.invalidateQueries({ queryKey: ['documents'] })

        if (onUploadComplete) {
          onUploadComplete(response.data.document)
        }

      } catch (error: any) {
        console.error('Upload error:', error)

        setUploads(prev => prev.map((upload, idx) =>
          idx === uploadIndex
            ? {
                ...upload,
                status: 'error',
                error: error.response?.data?.message || 'Upload failed'
              }
            : upload
        ))

        toast.error(`Failed to upload ${file.name}`)
      }
    }
  }, [uploads.length, queryClient, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const clearCompleted = () => {
    setUploads(prev => prev.filter(upload => upload.status !== 'completed'))
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, idx) => idx !== index))
  }

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return '📤'
      case 'processing':
        return '⚙️'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '📄'
    }
  }

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing with AI...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      default:
        return ''
    }
  }

  return (
    <div className={className}>
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="text-4xl">📄</div>

          {isDragActive ? (
            <div>
              <p className="text-lg font-medium text-blue-600">Drop files here</p>
              <p className="text-sm text-gray-500">Release to upload</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drag & drop documents here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse files
              </p>
              <button className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
                Choose Files
              </button>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Supported: PDF, DOCX, DOC, TXT, MD, HTML (max 50MB each)
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Upload Progress ({uploads.length})
            </h3>
            {uploads.some(u => u.status === 'completed') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Completed
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-4 border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(upload.status)}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {upload.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {getStatusText(upload.status)}
                    </span>
                    {upload.status !== 'uploading' && (
                      <button
                        onClick={() => removeUpload(index)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'processing'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${upload.status === 'processing' ? 100 : upload.progress}%`
                      }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {upload.status === 'error' && upload.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {upload.error}
                  </div>
                )}

                {/* Success Message */}
                {upload.status === 'completed' && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    Document processed successfully! Ready for AI search and chat.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
