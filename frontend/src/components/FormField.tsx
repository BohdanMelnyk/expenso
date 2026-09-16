import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'select' | 'textarea';
  value: any;
  onChange: (value: any) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  maxLength?: number;
  className?: string;
  showValidation?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  maxLength,
  className = '',
  showValidation = true
}) => {
  const hasError = Boolean(error);
  const hasValue = value !== undefined && value !== null && value !== '';
  const isValid = !hasError && hasValue && showValidation;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md text-sm transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
    dark:disabled:bg-gray-700 dark:disabled:text-gray-400
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-400' 
      : isValid
        ? 'border-green-300 focus:border-green-500 focus:ring-green-200 dark:border-green-500 dark:focus:ring-green-400'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400'
    }
  `;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value;
    onChange(newValue);
  };

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={baseInputClasses}
          />
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            step={type === 'number' ? '0.01' : undefined}
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {renderInput()}
        
        {/* Validation Icons */}
        {showValidation && (hasError || isValid) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {hasError && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Success Message */}
      {isValid && !hasError && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          Looks good!
        </p>
      )}
    </div>
  );
};

export default FormField;