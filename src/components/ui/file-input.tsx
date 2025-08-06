import React, { forwardRef } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
interface FileInputProps {
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  loading?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
  placeholder?: string;
  maxSize?: number; // in bytes
  className?: string;
  variant?: 'default' | 'profile' | 'upload';
}
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ 
    onChange, 
    accept = "*/*", 
    disabled = false, 
    loading = false,
    selectedFile,
    onClear,
    placeholder = "Choose a file...",
    maxSize,
    className = "",
    variant = "default"
  }, ref) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        // Check file size if maxSize is specified
        if (maxSize && file.size > maxSize) {
          const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          alert(`File must be smaller than ${maxSizeMB}MB`);
          return;
        }
        onChange(file);
      } else {
        onChange(null);
      }
    };
    const handleClear = () => {
      if (onClear) {
        onClear();
      } else {
        onChange(null);
      }
      // Reset the input value
      if (ref && 'current' in ref && ref.current) {
        ref.current.value = '';
      }
    };
    const getFileIcon = () => {
      if (!selectedFile) return <Upload size={20} />;
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
        return <Image size={20} />;
      } else if (fileName.match(/\.(pdf|doc|docx|txt|md)$/)) {
        return <FileText size={20} />;
      } else {
        return <File size={20} />;
      }
    };
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Custom File Input Container */}
        <div className="relative group">
          {/* Hidden native file input */}
          <input
            ref={ref}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled || loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-manipulation"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
          />
          {/* Custom styled file input */}
          <div className={`
            relative w-full min-h-[60px] bg-white/5 border border-white/10 rounded-lg 
            transition-all duration-200 cursor-pointer
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:border-white/20'}
            ${selectedFile ? 'border-[#67FFD4]/30 bg-[#67FFD4]/5' : ''}
          `}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-[#67FFD4] flex-shrink-0">
                  {getFileIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white/80 text-sm block truncate">
                    {selectedFile ? selectedFile.name : placeholder}
                  </span>
                  {selectedFile && (
                    <span className="text-white/50 text-xs block">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  )}
                </div>
              </div>
              {selectedFile && !disabled && !loading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-white/40 hover:text-red-400 transition-colors p-1 rounded flex-shrink-0"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          {/* Focus ring */}
          <div className="absolute inset-0 rounded-lg ring-2 ring-transparent transition-all duration-200 pointer-events-none group-focus-within:ring-[#67FFD4]/50"></div>
        </div>
        {/* File size validation info */}
        {selectedFile && maxSize && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">
              File size: {formatFileSize(selectedFile.size)}
            </span>
            <span className={`${
              selectedFile.size > maxSize ? 'text-red-400' : 'text-green-400'
            }`}>
              {formatFileSize(selectedFile.size)} / {formatFileSize(maxSize)}
            </span>
          </div>
        )}
        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 text-[#67FFD4] text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#67FFD4]"></div>
            <span>Processing file...</span>
          </div>
        )}
      </div>
    );
  }
);
FileInput.displayName = 'FileInput'; 
