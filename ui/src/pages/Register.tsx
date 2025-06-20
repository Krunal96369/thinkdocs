import {
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, loading } = useAuth()

  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    return { checks, score }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    } else if (formData.email.length > 255) {
      newErrors.email = 'Email must be less than 255 characters'
    }

    // Strong password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (passwordStrength.score < 5) {
      newErrors.password = 'Password must meet all requirements'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const success = await register(formData.email, formData.password, formData.name)
    if (!success) {
      // Error is handled by the auth context with toast
      return
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
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
                Join ThinkDocs Today
              </h1>
              <p className="text-xl text-slate-600 mb-12">
                Create your account and start building your intelligent document library with AI-powered insights.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Free to Start</h3>
                  <p className="text-slate-600">Begin with our free tier and upgrade as you grow</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Secure & Private</h3>
                  <p className="text-slate-600">Your documents are encrypted and never shared</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Easy Setup</h3>
                  <p className="text-slate-600">Get started in minutes with our intuitive interface</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
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
                  Create your account
                </h2>
                <p className="text-slate-600">
                  Join ThinkDocs and unlock AI-powered document intelligence
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Full name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 transition-colors ${
                        errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-slate-900'
                      }`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

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
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 transition-colors ${
                        errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-slate-900'
                      }`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
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
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 transition-colors ${
                        errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-slate-900'
                      }`}
                      placeholder="Create a strong password"
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

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              passwordStrength.score >= level
                                ? passwordStrength.score <= 2
                                  ? 'bg-red-500'
                                  : passwordStrength.score <= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center ${passwordStrength.checks.length ? 'text-green-600' : 'text-slate-400'}`}>
                          {passwordStrength.checks.length ? <CheckCircleIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />}
                          8+ characters
                        </div>
                        <div className={`flex items-center ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-slate-400'}`}>
                          {passwordStrength.checks.uppercase ? <CheckCircleIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />}
                          Uppercase
                        </div>
                        <div className={`flex items-center ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-slate-400'}`}>
                          {passwordStrength.checks.lowercase ? <CheckCircleIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />}
                          Lowercase
                        </div>
                        <div className={`flex items-center ${passwordStrength.checks.number ? 'text-green-600' : 'text-slate-400'}`}>
                          {passwordStrength.checks.number ? <CheckCircleIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />}
                          Number
                        </div>
                        <div className={`flex items-center ${passwordStrength.checks.special ? 'text-green-600' : 'text-slate-400'} col-span-2`}>
                          {passwordStrength.checks.special ? <CheckCircleIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />}
                          Special character
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 transition-colors ${
                        errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-slate-900'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-medium text-slate-600 hover:text-slate-500 transition-colors"
                    >
                      Sign in here
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
