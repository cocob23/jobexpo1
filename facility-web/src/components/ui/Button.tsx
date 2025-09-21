// src/components/ui/Button.tsx
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none',
    opacity: disabled || loading ? 0.7 : 1,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'inherit',
  }

  const sizeStyles = {
    sm: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      height: '2rem',
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
      height: '2.75rem',
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
      height: '3.5rem',
    },
  }

  const variantStyles = {
    primary: {
      background: 'var(--gradient-primary)',
      color: 'var(--neutral-0)',
      boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.3)',
    },
    secondary: {
      background: 'var(--gradient-secondary)',
      color: 'var(--neutral-0)',
      boxShadow: '0 4px 14px 0 rgba(240, 147, 251, 0.3)',
    },
    success: {
      background: 'var(--gradient-success)',
      color: 'var(--neutral-0)',
      boxShadow: '0 4px 14px 0 rgba(79, 172, 254, 0.3)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--primary-500)',
      border: '2px solid var(--primary-500)',
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--primary-500)',
      boxShadow: 'none',
    },
  }

  const hoverStyles = {
    primary: {
      boxShadow: '0 6px 20px 0 rgba(102, 126, 234, 0.4)',
      transform: 'translateY(-2px)',
    },
    secondary: {
      boxShadow: '0 6px 20px 0 rgba(240, 147, 251, 0.4)',
      transform: 'translateY(-2px)',
    },
    success: {
      boxShadow: '0 6px 20px 0 rgba(79, 172, 254, 0.4)',
      transform: 'translateY(-2px)',
    },
    outline: {
      background: 'var(--primary-500)',
      color: 'var(--neutral-0)',
    },
    ghost: {
      background: 'var(--primary-50)',
    },
  }

  const styles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return
    Object.assign(e.currentTarget.style, hoverStyles[variant])
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return
    Object.assign(e.currentTarget.style, variantStyles[variant])
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <button
      style={styles}
      className={`modern-button ${className}`}
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading && <span className="spinner" style={{ marginRight: '0.5rem' }} />}
      {children}
    </button>
  )
}