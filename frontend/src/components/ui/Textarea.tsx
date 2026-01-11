import { forwardRef, useState, useEffect, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharacterCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      showCharacterCount = false,
      maxLength,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(0);
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    // Update character count
    useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <textarea
          className={cn(
            'flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors resize-y',
            hasError && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
              ? `${textareaId}-helper`
              : showCharacterCount
              ? `${textareaId}-count`
              : undefined
          }
          {...props}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={`${textareaId}-error`}
                className="text-sm text-destructive flex items-center gap-1"
                role="alert"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </p>
            )}

            {helperText && !error && (
              <p id={`${textareaId}-helper`} className="text-sm text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>

          {showCharacterCount && (
            <p
              id={`${textareaId}-count`}
              className={cn(
                'text-xs text-muted-foreground tabular-nums',
                maxLength && charCount > maxLength * 0.9 && 'text-warning',
                maxLength && charCount === maxLength && 'text-destructive font-semibold'
              )}
            >
              {charCount}
              {maxLength && ` / ${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
