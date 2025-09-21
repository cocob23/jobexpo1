// src/components/ui/Input.tsx
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  fullWidth?: boolean
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = false,
  className = '',
  style = {},
  ...props
}) => {
  const inputStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: icon ? '0.75rem 1rem 0.75rem 2.75rem' : '0.75rem 1rem',
    fontSize: '1rem',
    borderRadius: '0.75rem',
    border: `2px solid ${error ? 'var(--error-500)' : 'var(--neutral-300)'}`,
    backgroundColor: 'var(--neutral-0)',
    color: 'var(--neutral-800)',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
    ...style,
  }

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
  }

  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--neutral-700)',
  }

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    left: '1rem',
    top: label ? 'calc(50% + 0.625rem)' : '50%',
    transform: 'translateY(-50%)',
    color: 'var(--neutral-400)',
    pointerEvents: 'none',
  }

  const errorStyles: React.CSSProperties = {
    marginTop: '0.25rem',
    fontSize: '0.875rem',
    color: 'var(--error-500)',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--primary-500)'
    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = error ? 'var(--error-500)' : 'var(--neutral-300)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={containerStyles}>
      {label && <label style={labelStyles}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <div style={iconStyles}>{icon}</div>}
        <input
          style={inputStyles}
          className={`modern-input ${className}`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </div>
      {error && <div style={errorStyles}>{error}</div>}
    </div>
  )
}