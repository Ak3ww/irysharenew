import { useState } from 'react';
import { MoreVertical, Download, Share } from 'lucide-react';

interface FileData {
  id: string;
  owner_address: string;
  file_url: string;
  file_name: string;
  tags: string[];
  is_encrypted: boolean;
  file_size_bytes: number;
  is_public: boolean;
  profile_visible: boolean;
  file_type: string;
  created_at: string;
  updated_at: string;
  is_owned?: boolean;
  recipient_address?: string;
  recipient_username?: string;
  shared_at?: string;
}

interface FileCardProps {
  file: FileData;
  isNew?: boolean;
  onPreview: (file: FileData) => void;
  onMenuAction: (action: string, file: FileData) => void;
}

export function FileCard({ file, isNew = false, onPreview, onMenuAction }: FileCardProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  // File type helpers
  const isImage = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || 
           name.endsWith('.gif') || name.endsWith('.bmp') || name.endsWith('.webp');
  };

  const isPDF = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.pdf');
  };

  const isVideo = (file: FileData) => {
    const name = file?.file_name?.toLowerCase() || '';
    return name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.avi');
  };

  const isAudio = (file: FileData) => {
  const name = file?.file_name?.toLowerCase() || '';
  const type = file?.file_type?.toLowerCase() || '';
  return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac') || 
         name.endsWith('.m4a') || name.endsWith('.aac') || name.endsWith('.webm') || name.endsWith('.opus') ||
         type.startsWith('audio/');
};

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Menu functions
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const handleMenuAction = (action: string) => {
    setShowShareMenu(false);
    onMenuAction(action, file);
  };

  return (
    <div
      className={`group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 cursor-pointer ${
        isNew ? 'ring-2 ring-emerald-500 ring-opacity-50' : ''
      }`}
      onClick={() => onPreview(file)}
    >
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          New
        </div>
      )}
      
      <div className="mb-4 flex items-center justify-center" style={{ minHeight: 80 }}>
        {isImage(file) ? (
          <div className="text-4xl">🖼️</div>
        ) : isPDF(file) ? (
          <div className="text-4xl">📄</div>
        ) : isVideo(file) ? (
          <div className="text-4xl">🎬</div>
        ) : isAudio(file) ? (
          <div className="text-4xl">🎵</div>
        ) : (
          <div className="text-4xl">📁</div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-sm truncate flex-1">
            {file.file_name}
          </h3>
          {file.is_encrypted && (
            <span className="text-[#67FFD4] text-lg" title="Encrypted file">🔒</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>
            {file.shared_at ? 
              `Shared: ${new Date(file.shared_at).toLocaleDateString()}` : 
              `Created: ${new Date(file.created_at).toLocaleDateString()}`
            }
          </span>
          <span>{formatFileSize(file.file_size_bytes)}</span>
        </div>
        
        {!file.is_owned && (
          <div className="text-xs text-[#67FFD4] font-medium">
            From: {file.owner_address.slice(0, 6)}...{file.owner_address.slice(-4)}
          </div>
        )}
      </div>
      
      {/* 3-Dot Menu */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="p-1 rounded-full bg-black/50 text-white hover:text-[#67FFD4] transition-colors"
            title="File Options"
          >
            <MoreVertical size={16} />
          </button>
          
          {/* Dropdown Menu */}
          {showShareMenu && (
            <div className="absolute right-0 top-8 bg-[#1A1A1A] border border-white/20 rounded-lg shadow-lg z-30 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuAction('download');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-sm"
              >
                <Download size={14} />
                Download
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuAction('share');
                }}
                disabled={!file.is_owned || !file.is_encrypted}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                  !file.is_owned || !file.is_encrypted 
                    ? 'text-white/40 cursor-not-allowed' 
                    : 'text-white hover:bg-white/10'
                }`}
                title={!file.is_owned || !file.is_encrypted ? 'Only file owners can share encrypted files' : 'Share file'}
              >
                <Share size={14} />
                Share
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 