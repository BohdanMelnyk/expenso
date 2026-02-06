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
          <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100">
                  <th className="text-left px-2 py-1 font-semibold text-gray-800">Column</th>
                  <th className="text-left px-2 py-1 font-semibold text-gray-800">CSV Header</th>
                  <th className="text-left px-2 py-1 font-semibold text-gray-800">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">0</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Umsatz getätigt von</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.card_number || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">1</td>
                  <td className="px-2 py-1 font-mono text-gray-600 font-bold text-green-700">Belegdatum</td>
                  <td className="px-2 py-1 font-mono text-gray-900 font-bold text-green-700">{transaction.raw_data.document_date || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">2</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Buchungsdatum</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.booking_date || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">3</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Originalbetrag</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.original_amount || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">4</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Originalwährung</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.original_currency || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">5</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Umrechnungskurs</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.exchange_rate || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">6</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Buchungsbetrag</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.booking_amount || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">7</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Buchungsw√§hrung</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.booking_currency || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">8</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Transaktionsbeschreibung</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.transaction_desc || '(empty)'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">9</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Transaktionsbeschreibung Zusatz</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.transaction_desc_extra || '(empty)'}</td>
                </tr>
                <tr className="hover:bg-blue-50">
                  <td className="px-2 py-1 font-mono text-gray-600">10</td>
                  <td className="px-2 py-1 font-mono text-gray-600">Buchungsreferenz</td>
                  <td className="px-2 py-1 font-mono text-gray-900">{transaction.raw_data.booking_reference || '(empty)'}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
              <strong>Belegdatum (Column 1):</strong> Document date from the invoice - <strong>{transaction.raw_data.document_date}</strong> ✓
            </div>
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
