import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { FilePreview } from '../ui/file-preview';
import { ArrowLeft, AlertCircle } from 'lucide-react';

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
}

export function PublicFileViewer() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      if (!fileId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('id', fileId)
          .eq('is_public', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError('File not found');
          } else {
            setError('Error loading file');
          }
          return;
        }

        if (!data.is_public) {
          setError('This file is private');
          return;
        }

        setFile(data);
      } catch (err) {
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileId]);

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="text-red-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">File Not Available</h1>
          <p className="text-white/60 mb-6">{error || 'The requested file could not be found.'}</p>
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-[#67FFD4] text-black rounded-lg hover:bg-[#8AFFE4] transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-6">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-white font-semibold text-lg truncate max-w-md">
            {file.file_name}
          </h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* File Preview */}
      <div className="p-6">
        <FilePreview
          file={file}
          address="" // No specific user for public viewing
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
