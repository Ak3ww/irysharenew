import { useState, useEffect } from 'react';

interface ApiResponse {
  platform: string;
  description: string;
  stats: {
    totalUsers: number;
    totalFiles: number;
    totalUploads: number;
    totalStorage: string;
    totalStorageBytes: number;
  };
  timestamp: string;
  version: string;
  network: string;
}

export function ApiDocs() {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/public-stats');
      const data = await response.json();
      
      if (response.ok) {
        setApiResponse(data);
      } else {
        setError(data.message || 'API request failed');
      }
    } catch (err) {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div className="min-h-screen bg-[#18191a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            API DOCUMENTATION
          </h1>
          <p className="text-white/60" style={{ fontFamily: 'Irys2' }}>
            Public API for accessing Iryshare platform statistics
          </p>
        </div>

        {/* API Overview */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Irys2' }}>
            🌐 Public Stats API
          </h2>
          <p className="text-white/80 mb-4" style={{ fontFamily: 'Irys2' }}>
            Get real-time platform statistics including user count, file uploads, and storage usage.
          </p>
          
          <div className="bg-black/20 rounded-lg p-4 mb-4">
            <p className="text-[#67FFD4] font-mono text-sm">
              GET /api/public-stats
            </p>
          </div>

          <button
            onClick={testApi}
            disabled={loading}
            className="bg-[#67FFD4] text-black font-bold py-2 px-4 rounded-lg hover:bg-[#8AFFE4] transition-all duration-300 disabled:opacity-50"
            style={{ fontFamily: 'Irys2' }}
          >
            {loading ? '🔄 Testing...' : '🧪 Test API'}
          </button>
        </div>

        {/* Response Example */}
        {apiResponse && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Irys2' }}>
              📊 API Response
            </h3>
            <div className="bg-black/20 rounded-lg p-4 overflow-x-auto">
              <pre className="text-white/90 text-sm font-mono">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-red-400 mb-2" style={{ fontFamily: 'Irys2' }}>
              ❌ Error
            </h3>
            <p className="text-red-300" style={{ fontFamily: 'Irys2' }}>
              {error}
            </p>
          </div>
        )}

        {/* Usage Examples */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Irys2' }}>
            💻 Usage Examples
          </h3>
          
          <div className="space-y-4">
            {/* JavaScript */}
            <div>
              <h4 className="text-white font-semibold mb-2" style={{ fontFamily: 'Irys2' }}>JavaScript</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <pre className="text-white/90 text-sm font-mono">
{`const response = await fetch('https://iryshare.com/api/public-stats');
const data = await response.json();
console.log('Total Users:', data.stats.totalUsers);
console.log('Total Files:', data.stats.totalFiles);`}
                </pre>
              </div>
            </div>

            {/* cURL */}
            <div>
              <h4 className="text-white font-semibold mb-2" style={{ fontFamily: 'Irys2' }}>cURL</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <pre className="text-white/90 text-sm font-mono">
{`curl -X GET https://iryshare.com/api/public-stats`}
                </pre>
              </div>
            </div>

            {/* Python */}
            <div>
              <h4 className="text-white font-semibold mb-2" style={{ fontFamily: 'Irys2' }}>Python</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <pre className="text-white/90 text-sm font-mono">
{`import requests

response = requests.get('https://iryshare.com/api/public-stats')
data = response.json()
print(f"Total Users: {data['stats']['totalUsers']}")
print(f"Total Files: {data['stats']['totalFiles']}")`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Response Schema */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Irys2' }}>
            📋 Response Schema
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[#67FFD4] font-mono text-sm">platform</span>
              <span className="text-white/60 text-sm">string</span>
              <span className="text-white/40 text-sm">Platform name</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#67FFD4] font-mono text-sm">stats.totalUsers</span>
              <span className="text-white/60 text-sm">number</span>
              <span className="text-white/40 text-sm">Total registered users</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#67FFD4] font-mono text-sm">stats.totalFiles</span>
              <span className="text-white/60 text-sm">number</span>
              <span className="text-white/40 text-sm">Total files uploaded</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#67FFD4] font-mono text-sm">stats.totalStorage</span>
              <span className="text-white/60 text-sm">string</span>
              <span className="text-white/40 text-sm">Total storage used (formatted)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#67FFD4] font-mono text-sm">timestamp</span>
              <span className="text-white/60 text-sm">string</span>
              <span className="text-white/40 text-sm">ISO timestamp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 