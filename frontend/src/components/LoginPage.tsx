import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation } from '../hooks/useFormValidation';
import FormField from './FormField';
import { AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useFormValidation(
    {
      username: '',
      password: '',
      totp_code: '',
    },
    {
      username: { required: true },
      password: { required: true },
      totp_code: { required: true },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!form.validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(form.values.username, form.values.password, form.values.totp_code);
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401) {
        setApiError('Invalid credentials');
      } else if (status === 429) {
        setApiError('Too many attempts, please try again later');
      } else {
        setApiError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Expenso</h1>
          <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Error Message */}
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField
            label="Username"
            name="username"
            type="text"
            value={form.values.username}
            onChange={(value) => form.setFieldValue('username', value)}
            error={form.errors.username}
            placeholder="Enter your username"
            required
            disabled={isSubmitting}
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            value={form.values.password}
            onChange={(value) => form.setFieldValue('password', value)}
            error={form.errors.password}
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
          />

          <FormField
            label="TOTP Code"
            name="totp_code"
            type="text"
            value={form.values.totp_code}
            onChange={(value) => form.setFieldValue('totp_code', value)}
            error={form.errors.totp_code}
            placeholder="Enter 6-digit code"
            required
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
          Lost access? Contact your administrator.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
