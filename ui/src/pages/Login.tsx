import {
    DocumentTextIcon,
    EnvelopeIcon,
    EyeIcon,
    EyeSlashIcon,
    LockClosedIcon,
    SparklesIcon
} from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold">ThinkDocs</span>
              </div>
              <h1 className="text-4xl font-bold mb-4">
                AI-Powered Document Intelligence
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Transform your documents into an intelligent, queryable knowledge base using advanced AI and RAG technology.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <SparklesIcon className="h-5 w-5 text-blue-200 mr-3" />
                <span className="text-blue-100">Multi-format document support with OCR</span>
              </div>
              <div className="flex items-center">
                <SparklesIcon className="h-5 w-5 text-blue-200 mr-3" />
                <span className="text-blue-100">Natural language queries with AI responses</span>
              </div>
              <div className="flex items-center">
                <SparklesIcon className="h-5 w-5 text-blue-200 mr-3" />
                <span className="text-blue-100">Semantic search across document content</span>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-300/20 rounded-full blur-xl"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">ThinkDocs</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back
                </h2>
                <p className="text-gray-600">
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Create one here
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>© 2025 ThinkDocs. Built for students and researchers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
