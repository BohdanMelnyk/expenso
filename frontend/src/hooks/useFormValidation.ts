import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export interface FormValidationResult {
  values: { [key: string]: any };
  errors: ValidationErrors;
  isValid: boolean;
  isFieldValid: (fieldName: string) => boolean;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: () => boolean;
  setFieldValue: (fieldName: string, value: any) => void;
  setFieldError: (fieldName: string, error: string) => void;
  clearFieldError: (fieldName: string) => void;
  clearAllErrors: () => void;
  reset: (initialValues?: { [key: string]: any }) => void;
}

export function useFormValidation(
  initialValues: { [key: string]: any } = {},
  validationRules: ValidationRules = {}
): FormValidationResult {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Minimum value validation (for numbers)
    if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
      return `${fieldName} must be at least ${rules.min}`;
    }

    // Maximum value validation (for numbers)
    if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
      return `${fieldName} must be at most ${rules.max}`;
    }

    // Minimum length validation (for strings)
    if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }

    // Maximum length validation (for strings)
    if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
      return `${fieldName} must be at most ${rules.maxLength} characters`;
    }

    // Pattern validation (for strings)
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return null;
  }, [validationRules]);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isFormValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isFormValid = false;
      }
    });

    setErrors(newErrors);
    return isFormValid;
  }, [values, validationRules, validateField]);

  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Real-time validation - clear error if field becomes valid
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));
  }, [validateField]);

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback((newInitialValues?: { [key: string]: any }) => {
    setValues(newInitialValues || initialValues);
    setErrors({});
  }, [initialValues]);

  const isFieldValid = useCallback((fieldName: string): boolean => {
    return !errors[fieldName];
  }, [errors]);

  const isValid = Object.keys(errors).length === 0 && 
    Object.keys(errors).every(key => !errors[key]);

  return {
    values,
    errors,
    isValid,
    isFieldValid,
    validateField,
    validateForm,
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    reset
  };
}