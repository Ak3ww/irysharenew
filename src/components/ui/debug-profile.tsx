import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
export function DebugProfile() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const runDebugQueries = async () => {
    setLoading(true);
    try {
      // Test 1: Check usernames table structure
      const { data: usernames, error: usernamesError } = await supabase
        .from('usernames')
        .select('*')
        .limit(3);
      // Test 2: Check files table structure
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .limit(3);
      // Test 3: Check if any files are public and profile_visible
      const { data: publicFiles, error: publicFilesError } = await supabase
        .from('files')
        .select('*')
        .eq('is_public', true)
        .eq('profile_visible', true)
        .limit(5);
      setDebugInfo({
        usernames: { data: usernames, error: usernamesError },
        files: { data: files, error: filesError },
        publicFiles: { data: publicFiles, error: publicFilesError }
      });
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6 bg-black/80 border border-white/10 rounded-lg">
      <h3 className="text-[#67FFD4] font-bold text-lg mb-4">Debug Profile System</h3>
      <button
        onClick={runDebugQueries}
        disabled={loading}
        className="bg-[#67FFD4] text-black px-4 py-2 rounded-lg font-bold mb-4"
      >
        {loading ? 'Running...' : 'Run Debug Queries'}
      </button>
      {debugInfo && (
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-bold mb-2">Usernames Table:</h4>
            <pre className="bg-gray-800 p-3 rounded text-xs text-green-400 overflow-auto">
              {JSON.stringify(debugInfo.usernames, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-white font-bold mb-2">Files Table:</h4>
            <pre className="bg-gray-800 p-3 rounded text-xs text-green-400 overflow-auto">
              {JSON.stringify(debugInfo.files, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-white font-bold mb-2">Public Files:</h4>
            <pre className="bg-gray-800 p-3 rounded text-xs text-green-400 overflow-auto">
              {JSON.stringify(debugInfo.publicFiles, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 
