// Redirect old gasless-upload API to new approve-user system
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Redirect to new API or return error
  return res.status(410).json({ 
    error: "This API endpoint has been deprecated. Please use the new upload system.",
    message: "The gasless-upload API has been replaced with the approve-user system."
  });
} 