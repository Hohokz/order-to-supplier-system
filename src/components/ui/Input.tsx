// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="text-sm font-semibold text-zinc-700 block mb-1.5 md:mb-1">
          {label}
        </label>
        <input
          ref={ref}
          className={`block w-full rounded-xl border text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 
            /* 📱 สเปกสำหรับ Tablet 7-8 นิ้ว (Touch-friendly) */
            px-4 py-3 text-base
            /* 💻 สเปกสำหรับจอคอมพิวเตอร์ (Crisp & Desktop) */
            md:py-2.5 md:text-sm
            ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30' : 'border-zinc-200'} 
            ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
            • {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';