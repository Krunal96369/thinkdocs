import { ArrowLeftIcon, CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
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
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="max-w-md">
              <h1 className="text-4xl font-bold mb-6">
                Check Your Email
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                We've sent password reset instructions to your email address.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-300" />
                  <span className="text-blue-100">Instructions sent successfully</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-300" />
                  <span className="text-blue-100">Check your spam folder if needed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-300" />
                  <span className="text-blue-100">Link expires in 24 hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-300/20 rounded-full blur-lg" />
        </div>

        {/* Right Side - Success Message */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 bg-white">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Email Sent!
              </h2>

              <p className="text-gray-600 mb-8">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>

              <div className="space-y-4">
                <Link
                  to="/login"
                  className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Sign In
                </Link>

                <button
                  onClick={() => setIsEmailSent(false)}
                  className="w-full flex justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Try Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6">
              Forgot Your Password?
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              No worries! Enter your email address and we'll send you instructions to reset your password.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-300" />
                <span className="text-blue-100">Secure password reset process</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-300" />
                <span className="text-blue-100">Email verification required</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-300" />
                <span className="text-blue-100">Quick and easy process</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-300/20 rounded-full blur-lg" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link to="/login" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-8">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Sign In
            </Link>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Reset Password
            </h2>
            <p className="text-gray-600 mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
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
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
