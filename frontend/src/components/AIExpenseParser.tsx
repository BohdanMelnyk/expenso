import React, { useState } from 'react';
import { expenseAPI, ParsedExpenseResponse } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

interface AIExpenseParserProps {
  onParsed: (data: ParsedExpenseResponse) => void;
}

const AIExpenseParser: React.FC<AIExpenseParserProps> = ({ onParsed }) => {
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParser, setShowParser] = useState(false);

  const handleParse = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to parse');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const response = await expenseAPI.parseExpense({ text: inputText });
      onParsed(response.data);
      setInputText('');
      setShowParser(false);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to parse expense'));
    } finally {
      setParsing(false);
    }
  };

  const handleClose = () => {
    setShowParser(false);
    setInputText('');
    setError(null);
  };

  return (
    <div className="mb-6">
      {!showParser ? (
        <button
          type="button"
          onClick={() => setShowParser(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <span className="text-xl">✨</span>
          <span>Parse Expense with AI</span>
        </button>
      ) : (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h3 className="text-lg font-semibold text-gray-800">AI Expense Parser</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Describe your expense in natural language, e.g., "20 euros for groceries at Kaufland today with credit card"
          </p>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="E.g., 'Spent 15.50 euros at Lidl yesterday for food shopping, paid cash'"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 mb-3 font-sans"
            rows={3}
            disabled={parsing}
          />

          {error && (
            <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing || !inputText.trim()}
              className={`flex-1 py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                parsing || !inputText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
              }`}
            >
              {parsing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Parsing...
                </span>
              ) : (
                '✨ Parse & Fill Form'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIExpenseParser;
