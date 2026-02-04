import React from 'react';

interface ConfidenceBadgeProps {
  score: number; // 0.0 to 1.0
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score }) => {
  let color = 'bg-red-100 text-red-800';
  let label = 'Low';

  if (score >= 0.8) {
    color = 'bg-green-100 text-green-800';
    label = 'High';
  } else if (score >= 0.5) {
    color = 'bg-yellow-100 text-yellow-800';
    label = 'Medium';
  }

  const percentage = Math.round(score * 100);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${color}`}>
      {label} ({percentage}%)
    </span>
  );
};
