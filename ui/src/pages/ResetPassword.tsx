import { CheckCircleIcon, DocumentTextIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
]

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const getPasswordStrength = (password: string): number => {
    return passwordRequirements.filter(req => req.test(password)).length
  }

  const getStrengthColor = (strength: number): string => {
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-orange-500'
    if (strength <= 3) return 'bg-yellow-500'
    if (strength <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = (strength: number): string => {
    if (strength <= 1) return 'Very Weak'
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Fair'
    if (strength <= 4) return 'Good'
    return 'Strong'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const strength = getPasswordStrength(password)
    if (strength < 4) {
      toast.error('Password must meet at least 4 requirements')
      return
    }

    if (!token) {
      toast.error('Invalid reset token')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Implement actual reset password API call
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      toast.success('Password reset successfully!')
      navigate('/login')
    } catch (error) {
      toast.error('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If no token, show error state
  if (!token) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Invalid Reset Link</h2>
            <p className="text-slate-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const passwordStrength = getPasswordStrength(password)

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
                Create New Password
              </h1>
              <p className="text-xl text-slate-600 mb-12">
                Choose a strong password to secure your ThinkDocs account and protect your documents.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Secure Encryption</h3>
                  <p className="text-slate-600">Your password is encrypted and secure</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Strength Validation</h3>
                  <p className="text-slate-600">Real-time password strength checking</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Account Security</h3>
                  <p className="text-slate-600">Enhanced protection for your documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
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
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Reset Your Password
                </h2>
                <p className="text-slate-600">
                  Enter your new password below. Make sure it's strong and secure.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                      placeholder="Enter your new password"
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
                  {password && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Password Strength</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength <= 2 ? 'text-red-600' :
                          passwordStrength <= 3 ? 'text-yellow-600' :
                          passwordStrength <= 4 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {getStrengthText(passwordStrength)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>

                      {/* Requirements Checklist */}
                      <div className="space-y-1">
                        {passwordRequirements.map((req, index) => {
                          const isMet = req.test(password)
                          return (
                            <div key={index} className="flex items-center space-x-2">
                              {isMet ? (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 text-slate-300" />
                              )}
                              <span className={`text-xs ${isMet ? 'text-green-600' : 'text-slate-500'}`}>
                                {req.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm New Password
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                      placeholder="Confirm your new password"
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

                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div className="mt-2">
                      {password === confirmPassword ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600">Passwords match</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600">Passwords do not match</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || passwordStrength < 4 || password !== confirmPassword}
                  className="w-full flex justify-center py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-600">
                  Remember your password?{' '}
                  <Link to="/login" className="font-medium text-slate-900 hover:text-slate-700 transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
