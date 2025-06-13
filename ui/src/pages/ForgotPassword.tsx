import { ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Implement actual forgot password API call
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      setIsEmailSent(true)
      toast.success('Password reset instructions sent to your email')
    } catch (error) {
      toast.error('Failed to send reset instructions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
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
                  Check Your Email
                </h1>
                <p className="text-xl text-slate-600 mb-12">
                  We've sent password reset instructions to your email address.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-slate-900 mb-1">Instructions Sent</h3>
                    <p className="text-slate-600">Check your inbox for the reset link</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-slate-900 mb-1">Check Spam Folder</h3>
                    <p className="text-slate-600">Sometimes emails end up in spam</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-slate-900 mb-1">Valid for 24 Hours</h3>
                    <p className="text-slate-600">Link expires in 24 hours for security</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Success Message */}
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
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-50 mb-6">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>

                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    Email Sent!
                  </h2>

                  <p className="text-slate-600 mb-8">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>

                  <div className="space-y-4">
                    <Link
                      to="/login"
                      className="w-full flex justify-center items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                      <ArrowLeftIcon className="h-5 w-5 mr-2" />
                      Back to Sign In
                    </Link>

                    <button
                      onClick={() => setIsEmailSent(false)}
                      className="w-full flex justify-center py-3 px-6 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                    >
                      Try Different Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
                Forgot Your Password?
              </h1>
              <p className="text-xl text-slate-600 mb-12">
                No worries! Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Secure Process</h3>
                  <p className="text-slate-600">Safe and encrypted password reset</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Email Verification</h3>
                  <p className="text-slate-600">Verification required for security</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-slate-900 mb-1">Quick & Easy</h3>
                  <p className="text-slate-600">Simple process to get back in</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
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
              <div className="mb-8">
                <Link to="/login" className="inline-flex items-center text-slate-900 hover:text-slate-700 mb-6 font-medium">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Sign In
                </Link>

                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
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
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending Instructions...
                    </div>
                  ) : (
                    'Send Reset Instructions'
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
