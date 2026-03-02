import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankImportAPI } from '../api/client';
import { BankImportPreview } from '../types/bankImport';

export const BankImportScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>('haspa_credit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDragActive = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragInactive = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === '') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a CSV file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await bankImportAPI.uploadBankCSV(selectedFile, format);
      const data: BankImportPreview = response.data;

      // Store the preview data and navigate to review screen
      sessionStorage.setItem('bankImportPreview', JSON.stringify(data));
      navigate('/import/bank/review');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload file';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Bank Statement</h1>
        <p className="text-gray-600 mb-8">Upload a CSV file from your bank account</p>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDragActive}
          onDragLeave={handleDragInactive}
          onDragOver={handleDragActive}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12v12m0 0l-3-3m3 3l3-3"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900">
              {selectedFile ? selectedFile.name : 'Drop your CSV file here'}
            </p>
            <p className="text-sm text-gray-600">or click to browse</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.CSV"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Format Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="haspa_credit">Haspa Credit Card (Umsatz)</option>
            <option value="haspa_debit">Haspa Debit Account (CAMT.053)</option>
            <option value="n26">N26 (Coming Soon)</option>
            <option value="monobank">Monobank (Coming Soon)</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          className="mt-8 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Upload and Preview'
          )}
        </button>

        {/* Help Text */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          Supported formats: Haspa Credit Card (Umsatz), Haspa Debit Account (CAMT.053)
        </p>
      </div>
    </div>
  );
};
