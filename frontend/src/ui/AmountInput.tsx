import React, { useEffect, useState } from 'react';
import { parseAmount } from '../lib/draft';

const show = (n: number) => (n ? n.toFixed(2).replace('.', ',') : '');

/**
 * Money input that keeps what you type ("23," stays "23,") and reports the number.
 * Outside changes (a parse filling the amount) replace the text while the field isn't focused.
 */
const AmountInput: React.FC<{ value: number; onChange: (n: number) => void; className?: string; autoFocus?: boolean }> = ({ value, onChange, className, autoFocus }) => {
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(show(value));
  }, [value, focused]);

  return (
    <input
      inputMode="decimal"
      placeholder="0,00"
      autoFocus={autoFocus}
      className={className}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(show(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAmount(e.target.value) ?? 0);
      }}
    />
  );
};

export default AmountInput;
