import {
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon
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
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-50 relative">
          <div className="flex flex-col justify-center px-12 text-slate-900">
            <div className="mb-12">
              <div className="flex items-center mb-8">
                <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold">ThinkDocs</span>
              </div>
              <h1 className="text-4xl font-bold mb-4 text-slate-900">
                AI-Powered Document Intelligence
              </h1>
              <p className="text-xl text-slate-600 mb-12">
                Transform your documents into an intelligent, queryable knowledge base using advanced AI and RAG technology.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Multi-format Support</h3>
                  <p className="text-slate-600">Upload PDFs, Word docs, and text files with OCR support</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Natural Language Queries</h3>
                  <p className="text-slate-600">Ask questions in plain English and get AI-powered responses</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Semantic Search</h3>
                  <p className="text-slate-600">Find relevant content across all your documents instantly</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">ThinkDocs</h1>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Welcome back
                </h2>
                <p className="text-slate-600">
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-slate-900 hover:text-slate-700 transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-medium text-slate-900 hover:text-slate-700 transition-colors"
                    >
                      Create one here
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-slate-500">
              <p>© 2025 ThinkDocs. Built for students and researchers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
