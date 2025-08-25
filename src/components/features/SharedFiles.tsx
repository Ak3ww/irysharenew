import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../utils/supabase';
import { downloadAndDecryptFromIrys } from '../../utils/aesIrys';

export function SharedFiles() {
  const { address } = useAccount();
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Fetch shared files
  useEffect(() => {
    if (!address) return;
    fetchSharedFiles();
  }, [address]);

    const fetchSharedFiles = async () => {
      if (!address) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_files', { 
        user_address: address.toLowerCase().trim() 
      });
      if (error) throw error;
      const shared = data?.filter((file: any) => !file.is_owned) || [];
      setSharedFiles(shared);
    } catch (error) {
          console.error('Error fetching shared files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilePreview = async (file: any) => {
    setSelectedFile(file);
    if (file.is_encrypted) {
      try {
        const decryptedData = await downloadAndDecryptFromIrys(file.file_url, address!);
        const blob = new Blob([decryptedData], { type: file.file_type || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Failed to decrypt file:', error);
        alert('Failed to decrypt file');
      }
        } else {
      setPreviewUrl(file.file_url);
    }
  };

  const closePreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const filteredFiles = sharedFiles.filter((file: any) => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'images' && file.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ||
      (fileTypeFilter === 'documents' && file.file_name.match(/\.(pdf|doc|docx|txt)$/i)) ||
      (fileTypeFilter === 'videos' && file.file_name.match(/\.(mp4|avi|mov|webm)$/i)) ||
      (fileTypeFilter === 'audio' && file.file_name.match(/\.(mp3|wav|ogg|flac)$/i)) ||
      (fileTypeFilter === 'encrypted' && file.is_encrypted);
    return matchesSearch && matchesType;
  });

  if (!address) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/80 text-lg font-medium" style={{ fontFamily: 'Irys2' }}>
              Please connect your wallet to view shared files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                SHARED FILES
            </h1>
              <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
              Files shared with you by other users
            </p>
          </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#67FFD4]" style={{ fontFamily: 'Irys1' }}>
                {sharedFiles.length}
            </div>
              <div className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                Total Files
            </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-black border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all"
                style={{ fontFamily: 'Irys2' }}
              />
            </div>
            {/* Filter */}
            <div className="flex-shrink-0">
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all appearance-none cursor-pointer"
                style={{ fontFamily: 'Irys2' }}
              >
                <option value="all" className="bg-black text-white">ALL TYPES</option>
                <option value="images" className="bg-black text-white">IMAGES</option>
                <option value="documents" className="bg-black text-white">DOCUMENTS</option>
                <option value="videos" className="bg-black text-white">VIDEOS</option>
                <option value="audio" className="bg-black text-white">AUDIO</option>
                <option value="encrypted" className="bg-black text-white">ENCRYPTED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {loading ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#67FFD4] mx-auto"></div>
            <p className="text-white/80 mt-4 text-lg font-medium" style={{ fontFamily: 'Irys2' }}>
              Loading shared files...
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-white/80 text-lg font-medium" style={{ fontFamily: 'Irys2' }}>
              {sharedFiles.length === 0 ? 'No files shared with you yet.' : 'No files match your search.'}
            </p>
            <p className="text-white/40 text-sm mt-2" style={{ fontFamily: 'Irys2' }}>
              {sharedFiles.length === 0 ? 'Files shared with you will appear here!' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFiles.map((file: any) => (
            <div
              key={file.id}
              onClick={() => handleFilePreview(file)}
                className="bg-black border border-gray-700 rounded-xl p-6 cursor-pointer transition-all hover:border-[#67FFD4] hover:shadow-lg hover:shadow-[#67FFD4]/20 group"
            >
              <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl">
                    {file.is_encrypted ? '🔒' : '📁'}
                  </div>
                  <div className="text-white/40 text-xs" style={{ fontFamily: 'Irys2' }}>
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
              </div>
                <h3 className="text-white font-semibold mb-2 truncate" style={{ fontFamily: 'Irys1' }}>
                {file.file_name}
              </h3>
                <div className="text-white/60 text-sm mb-3" style={{ fontFamily: 'Irys2' }}>
                  {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                </div>
                <div className="text-[#67FFD4] text-xs font-medium" style={{ fontFamily: 'Irys2' }}>
                  From: {file.owner_address.slice(0, 6)}...{file.owner_address.slice(-4)}
              </div>
            </div>
          ))}
              </div>
            )}

        {/* File Preview Modal */}
      {selectedFile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-black border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h3 className="text-white text-xl font-bold" style={{ fontFamily: 'Irys1' }}>
                {selectedFile.file_name}
                </h3>
              <button
                  onClick={closePreview}
                  className="text-white/60 hover:text-white transition-colors"
              >
                  ✕
              </button>
            </div>

              {/* Preview Content */}
              <div className="p-6">
                {previewUrl && (
                  <div className="mb-6">
                    {selectedFile.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={previewUrl} alt={selectedFile.file_name} className="max-w-full h-auto rounded-lg" />
                    ) : selectedFile.file_name.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video controls className="max-w-full h-auto rounded-lg">
                        <source src={previewUrl} type={selectedFile.file_type} />
                        Your browser does not support the video tag.
                      </video>
                    ) : selectedFile.file_name.match(/\.(mp3|wav|ogg|flac)$/i) ? (
                      <audio controls className="w-full">
                        <source src={previewUrl} type={selectedFile.file_type} />
                        Your browser does not support the audio tag.
                      </audio>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                          <div className="text-4xl mb-4">📄</div>
                        <p className="text-white/60" style={{ fontFamily: 'Irys2' }}>
                          Preview not available for this file type
                        </p>
                        </div>
                      )}
                  </div>
                )}

                {/* File Info */}
                <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#67FFD4] font-bold" style={{ fontFamily: 'Irys2' }}>OWNER:</span>
                      <span className="ml-2 text-white" style={{ fontFamily: 'Irys2' }}>
                        {selectedFile.owner_address}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#67FFD4] font-bold" style={{ fontFamily: 'Irys2' }}>SIZE:</span>
                      <span className="ml-2 text-white" style={{ fontFamily: 'Irys2' }}>
                        {(selectedFile.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-[#67FFD4] font-bold" style={{ fontFamily: 'Irys2' }}>TYPE:</span>
                      <span className="ml-2 text-white" style={{ fontFamily: 'Irys2' }}>
                        {selectedFile.is_encrypted ? '🔒 ENCRYPTED' : '🌐 PUBLIC'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#67FFD4] font-bold" style={{ fontFamily: 'Irys2' }}>SHARED:</span>
                      <span className="ml-2 text-white" style={{ fontFamily: 'Irys2' }}>
                        {new Date(selectedFile.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="mt-6 text-center">
                      <button
                        onClick={async () => {
                          try {
                            if (selectedFile.is_encrypted) {
                            const decryptedData = await downloadAndDecryptFromIrys(selectedFile.file_url, address!);
                              const blob = new Blob([decryptedData], { type: selectedFile.file_type || 'application/octet-stream' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = selectedFile.file_name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } else {
                              const a = document.createElement('a');
                              a.href = selectedFile.file_url;
                              a.download = selectedFile.file_name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          }
                        }}
                      className="bg-[#67FFD4] text-black font-bold rounded-lg px-6 py-3 transition-all hover:bg-[#8AFFE4]"
                        style={{ fontFamily: 'Irys2' }}
                      >
                      📥 DOWNLOAD {selectedFile.is_encrypted ? '(DECRYPTED)' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
} 
