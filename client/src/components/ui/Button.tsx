import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      'relative inline-flex items-center justify-center font-bold tracking-wide select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcade-magenta focus-visible:ring-offset-2 focus-visible:ring-offset-arcade-bg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer rounded-xl';

    // Size variants (strictly minimum 40px - 56px height for touch ergonomics)
    const sizeStyles = {
      sm: 'h-10 px-3.5 text-xs gap-1.5',
      md: 'h-12 px-5 text-sm gap-2',
      lg: 'h-14 px-8 text-base gap-2.5',
    };

    // Visual variants
    const variantStyles = {
      primary:
        'bg-gradient-to-r from-arcade-purple via-purple-600 to-arcade-magenta text-white shadow-neon-purple hover:shadow-neon-magenta hover:brightness-110 border border-purple-400/30',
      secondary:
        'bg-arcade-surface hover:bg-arcade-elevated text-arcade-text border border-arcade-border hover:border-arcade-purple/60 hover:text-white shadow-arcade-card',
      accent:
        'bg-gradient-to-r from-arcade-gold to-arcade-orange text-arcade-bg font-extrabold shadow-neon-gold hover:brightness-110 border border-amber-300/40',
      ghost:
        'bg-transparent hover:bg-arcade-surface/80 text-arcade-muted hover:text-white border border-transparent',
      danger:
        'bg-arcade-danger/20 hover:bg-arcade-danger/30 text-rose-300 border border-arcade-danger/40 hover:border-arcade-danger',
      icon: 'p-0 w-11 h-11 bg-arcade-surface hover:bg-arcade-elevated border border-arcade-border text-arcade-muted hover:text-white rounded-xl',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>Loading...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
