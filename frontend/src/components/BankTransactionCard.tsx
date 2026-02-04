import React, { useState } from 'react';
import { BankTransaction } from '../types/bankImport';
import { ConfidenceBadge } from './ConfidenceBadge';

interface BankTransactionCardProps {
  transaction: BankTransaction;
}

export const BankTransactionCard: React.FC<BankTransactionCardProps> = ({ transaction }) => {
  const [showRawData, setShowRawData] = useState(false);

  const isExpense = transaction.booking_amount < 0;
  const amountClass = isExpense ? 'text-red-600' : 'text-green-600';
  const amountSign = isExpense ? '-' : '+';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Transaction Header */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900">{transaction.merchant}</h3>
        {transaction.location && (
          <p className="text-sm text-gray-600">{transaction.location}</p>
        )}
      </div>

      {/* Amount and Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Amount</p>
          <p className={`text-2xl font-bold ${amountClass}`}>
            {amountSign}
            {Math.abs(transaction.booking_amount).toFixed(2)} {transaction.booking_currency}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Date</p>
          <p className="text-2xl font-bold text-gray-900">
            {new Date(transaction.transaction_date).toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>

      {/* Exchange Rate Info (if applicable) */}
      {transaction.original_amount !== transaction.booking_amount && (
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-gray-700">
            Original: {Math.abs(transaction.original_amount).toFixed(2)} {transaction.original_currency}
            {transaction.booking_amount !== 0 && (
              <>
                {' '}(Rate: {transaction.booking_amount !== 0 && (transaction.original_amount / Math.abs(transaction.booking_amount)).toFixed(4)})
              </>
            )}
          </p>
        </div>
      )}

      {/* Confidence Score */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">LLM Confidence:</span>
        <ConfidenceBadge score={transaction.confidence_score} />
      </div>

      {/* Raw Data Toggle */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showRawData ? '▼ Hide' : '▶ Show'} Raw Transaction Data
        </button>

        {showRawData && (
          <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1 max-h-48 overflow-y-auto">
            {Object.entries(transaction.raw_data).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-mono text-gray-600">{key}:</span>
                <span className="font-mono">{value || '(empty)'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Reference */}
      {transaction.booking_reference && (
        <div className="text-xs text-gray-500 border-t pt-3">
          Reference: {transaction.booking_reference}
        </div>
      )}
    </div>
  );
};
