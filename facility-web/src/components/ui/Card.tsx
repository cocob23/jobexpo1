// src/components/ui/Card.tsx
import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'gradient'
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = true,
  className = '',
  style = {},
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '1rem',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  }

  const paddingStyles = {
    sm: { padding: '1rem' },
    md: { padding: '1.5rem' },
    lg: { padding: '2rem' },
  }

  const variantStyles = {
    default: {
      background: 'var(--neutral-0)',
      border: '1px solid var(--neutral-200)',
      boxShadow: shadow ? 'var(--shadow-md)' : 'none',
    },
    elevated: {
      background: 'var(--gradient-card)',
      border: '1px solid var(--neutral-100)',
      boxShadow: shadow ? 'var(--shadow-xl)' : 'none',
    },
    gradient: {
      background: 'var(--gradient-hero)',
      border: 'none',
      color: 'var(--neutral-0)',
      boxShadow: shadow ? 'var(--shadow-glow)' : 'none',
    },
  }

  const styles: React.CSSProperties = {
    ...baseStyles,
    ...paddingStyles[padding],
    ...variantStyles[variant],
    ...style,
  }

  return (
    <div
      style={styles}
      className={`modern-card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}