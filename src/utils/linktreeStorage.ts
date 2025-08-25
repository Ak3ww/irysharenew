import { WebUploader } from '@irys/web-upload';
import { ethers } from 'ethers';

// Simplified structure matching the Laravel API
export interface LinktreeData {
  // User Profile (matching Laravel User model)
  name?: string;
  bio?: string;
  image?: string;
  theme_id?: number;
  template_id?: number; // New field for appearance templates
  
  // Links (matching Laravel Link model)
  links: Link[];
}

export interface Link {
  id: number;
  name: string;
  url: string;
  image?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

// Theme presets (matching Laravel themes)
export const THEME_PRESETS = [
  {
    id: 1,
    name: 'Default',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#67FFD4'
  },
  {
    id: 2,
    name: 'Dark',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    accentColor: '#3b82f6'
  },
  {
    id: 3,
    name: 'Light',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    accentColor: '#10b981'
  },
  {
    id: 4,
    name: 'Gradient',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
    accentColor: '#fbbf24'
  },
  {
    id: 5,
    name: 'Minimal',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    accentColor: '#64748b'
  }
];

// Initialize Irys uploader for Linktree
const getIrysUploader = async () => {
  if (typeof window === 'undefined') return null;
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return new (WebUploader as any)({
    url: "https://devnet.irys.xyz",
    token: "ethereum",
    key: signer,
  });
};

// Save Linktree data to Irys
export const saveLinktreeData = async (
  address: string, 
  data: LinktreeData
): Promise<string> => {
  try {
    const uploader = await getIrysUploader();
    if (!uploader) throw new Error('Failed to initialize Irys uploader');

    // Convert data to JSON string
    const jsonData = JSON.stringify(data);
    
    // Upload with Linktree-specific tags
    const receipt = await uploader.upload(jsonData, {
      tags: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'Iryshare' },
        { name: 'Type', value: 'linktree' },
        { name: 'Username', value: address.toLowerCase() },
        { name: 'Root-TX', value: 'true' }, // For mutable references
        { name: 'Version', value: Date.now().toString() }
      ]
    });

    return receipt.id;
  } catch (error) {
    // Error handled silently
    throw error;
  }
};

// Load Linktree data from Irys
export const loadLinktreeData = async (address: string): Promise<LinktreeData | null> => {
  try {
    // First try to get from localStorage cache
    const cached = localStorage.getItem(`linktree_${address.toLowerCase()}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is less than 5 minutes old
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data;
      }
    }

    // Query Irys for the latest Linktree data
    const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["Iryshare"] }
            { name: "Type", values: ["linktree"] }
            { name: "Username", values: ["${address.toLowerCase()}"] }
            { name: "Root-TX", values: ["true"] }
          ]
          first: 1
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    
    if (result.data?.transactions?.edges?.length > 0) {
      const txId = result.data.transactions.edges[0].node.id;
      
      // Fetch the actual data
      const dataResponse = await fetch(`https://arweave.net/${txId}`);
      const data = await dataResponse.json();
      
      // Cache the result
      localStorage.setItem(`linktree_${address.toLowerCase()}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    }
    
    return null;
  } catch (error) {
    // Error handled silently
    return null;
  }
};

// Update Linktree data (creates new version with mutable reference)
export const updateLinktreeData = async (
  address: string, 
  data: LinktreeData
): Promise<string> => {
  try {
    // Get the current data to maintain mutable reference
    const currentData = await loadLinktreeData(address);
    
    const uploader = await getIrysUploader();
    if (!uploader) throw new Error('Failed to initialize Irys uploader');

    const jsonData = JSON.stringify(data);
    
    // Upload new version with Root-TX tag for mutable reference
    const receipt = await uploader.upload(jsonData, {
      tags: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'Iryshare' },
        { name: 'Type', value: 'linktree' },
        { name: 'Username', value: address.toLowerCase() },
        { name: 'Root-TX', value: 'true' },
        { name: 'Version', value: Date.now().toString() }
      ]
    });

    // Clear cache to force fresh load
    localStorage.removeItem(`linktree_${address.toLowerCase()}`);
    
    return receipt.id;
  } catch (error) {
    // Error handled silently
    throw error;
  }
};

// Delete Linktree data (marks as inactive)
export const deleteLinktreeData = async (address: string): Promise<void> => {
  try {
    const currentData = await loadLinktreeData(address);
    if (!currentData) return;

    // Mark as inactive by setting all links to inactive
    const inactiveData: LinktreeData = {
      ...currentData,
      links: currentData.links.map(link => ({ ...link, active: false }))
    };

    await updateLinktreeData(address, inactiveData);
    
    // Clear cache
    localStorage.removeItem(`linktree_${address.toLowerCase()}`);
    
    } catch (error) {
      // Error handled silently
      throw error;
    }
};

// Get public Linktree data by username/slug
export const getPublicLinktreeData = async (username: string): Promise<LinktreeData | null> => {
  try {
    const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["Iryshare"] }
            { name: "Type", values: ["linktree"] }
            { name: "Username", values: ["${username.toLowerCase()}"] }
            { name: "Root-TX", values: ["true"] }
          ]
          first: 1
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    
    if (result.data?.transactions?.edges?.length > 0) {
      const txId = result.data.transactions.edges[0].node.id;
      
      const dataResponse = await fetch(`https://arweave.net/${txId}`);
      const data = await dataResponse.json();
      
      // Filter out inactive links
      return {
        ...data,
        links: data.links || []
      };
    }
    
    return null;
  } catch (error) {
    // Error handled silently
    return null;
  }
};
