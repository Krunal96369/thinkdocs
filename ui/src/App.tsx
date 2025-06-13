import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DocumentProvider } from './contexts/DocumentContext'
import { SocketProvider } from './contexts/SocketContext'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import DocumentViewer from './pages/DocumentViewer'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <SocketProvider>
      <DocumentProvider>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Header />

            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:sessionId" element={<Chat />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:documentId" element={<DocumentViewer />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </DocumentProvider>
    </SocketProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
