import { clsx } from 'clsx'
import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'primary' | 'white' | 'gray'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

const colorClasses = {
  primary: 'text-primary-600',
  white: 'text-white',
  gray: 'text-gray-600',
}

export default function LoadingSpinner({
  size = 'md',
  className,
  color = 'primary'
}: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
