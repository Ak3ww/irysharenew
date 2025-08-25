import React, { useState } from 'react';

interface TextInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputType?: string;
  max?: number;
  error?: string;
  label?: string;
}

export default function TextInput({ 
  placeholder, 
  value, 
  onChange, 
  inputType = 'text', 
  max, 
  error, 
  label 
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
          {label.toUpperCase()}
        </label>
      )}
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#67FFD4] transition-colors ${
          error ? 'border-red-400' : ''
        }`}
        style={{ fontFamily: 'Irys2' }}
      />
      {error && (
        <p className="text-red-400 text-sm" style={{ fontFamily: 'Irys2' }}>
          {error}
        </p>
      )}
    </div>
  );
}
