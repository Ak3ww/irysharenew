import { getIrysUploader } from './irys';
import { Buffer } from 'buffer';

export interface LinktreeMetadata {
  id: string;
  randomLink: string;
  ownerAddress: string;
  name: string;
  username: string;
  bio: string;
  image: string;
  links: Array<{
    id: number;
    name: string;
    url: string;
    image?: string;
  }>;
  theme: {
    id: number;
    color: string;
    text: string;
    name: string;
  };
  theme_id: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShareableLinktree {
  randomLink: string;
  irysId: string;
  shareUrl: string;
}

// Upload Linktree data to Irys Network
export async function uploadLinktreeToIrys(
  address: string,
  linktreeData: Omit<LinktreeMetadata, 'randomLink' | 'ownerAddress' | 'createdAt' | 'updatedAt'>
): Promise<ShareableLinktree> {
  try {
    // Check if user already has a random link
    let randomLink = getUserLinktreeLink(address);
    
    // If no existing link, generate a new one
    if (!randomLink) {
      const { generateUniqueLink } = await import('./randomLinkGenerator');
      randomLink = await generateUniqueLink();
      console.log('Generated new random link for user:', randomLink);
    } else {
      console.log('Using existing random link for user:', randomLink);
    }
    
    // Prepare metadata for Irys
    const metadata: LinktreeMetadata = {
      ...linktreeData,
      randomLink,
      ownerAddress: address.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Initialize Irys uploader
    const irysUploader = await getIrysUploader();
    
    // Prepare data and tags for upload
    const dataToUpload = Buffer.from(JSON.stringify(metadata));
    const tags = [
      { name: "Content-Type", value: "application/json" },
      { name: "App-Name", value: "IryShare-Linktree" },
      { name: "Linktree-ID", value: randomLink },
      { name: "Owner", value: address.toLowerCase() },
      { name: "Type", value: "linktree-page" }
    ];
    
    // Upload to Irys
    const receipt = await irysUploader.upload(dataToUpload, { tags });
    
    if (!receipt || !receipt.id) {
      throw new Error('Failed to upload to Irys Network');
    }
    
    console.log('Linktree uploaded to Irys:', receipt.id);
    
    // Verify the upload by fetching the data back from Irys
    try {
      console.log('Verifying upload by fetching from Irys...');
      const verificationResponse = await fetch(`https://gateway.irys.xyz/${receipt.id}`);
      
      if (verificationResponse.ok) {
        const fetchedData = await verificationResponse.json();
        console.log('✅ Upload verified! Data successfully stored on Irys:', fetchedData);
      } else {
        console.warn('⚠️ Could not immediately verify upload, but this is normal due to propagation delay');
      }
    } catch (verificationError) {
      console.warn('⚠️ Upload verification failed (normal due to propagation delay):', verificationError);
    }
    
    // Store the mapping locally for quick access
    const linkMapping = {
      randomLink,
      irysId: receipt.id,
      ownerAddress: address.toLowerCase(),
      createdAt: metadata.createdAt
    };
    
    // Save to localStorage for quick retrieval
    const existingMappings = JSON.parse(localStorage.getItem('iryshare_linktree_mappings') || '[]');
    const updatedMappings = [...existingMappings.filter((m: any) => m.ownerAddress !== address.toLowerCase()), linkMapping];
    localStorage.setItem('iryshare_linktree_mappings', JSON.stringify(updatedMappings));
    
    return {
      randomLink,
      irysId: receipt.id,
      shareUrl: `${window.location.origin}/u/${randomLink}`
    };
    
  } catch (error) {
    console.error('Error uploading linktree to Irys:', error);
    throw new Error('Failed to save Linktree to Irys Network');
  }
}

// Retrieve Linktree data from Irys by random link with retry logic
export async function getLinktreeFromIrys(randomLink: string): Promise<LinktreeMetadata | null> {
  try {
    // First check localStorage for quick lookup
    const mappings = JSON.parse(localStorage.getItem('iryshare_linktree_mappings') || '[]');
    const mapping = mappings.find((m: any) => m.randomLink === randomLink);
    
    if (!mapping) {
      console.log('No mapping found for random link:', randomLink);
      return null;
    }
    
    console.log('Fetching Linktree data from Irys ID:', mapping.irysId);
    
    // Fetch from Irys with retry logic for propagation delays
    let retries = 3;
    let delay = 1000; // Start with 1 second delay
    
    while (retries > 0) {
      try {
        const response = await fetch(`https://gateway.irys.xyz/${mapping.irysId}`);
        
        if (response.ok) {
          const metadata: LinktreeMetadata = await response.json();
          console.log('✅ Successfully fetched Linktree data from Irys:', metadata);
          return metadata;
        } else if (response.status === 404 && retries > 1) {
          console.log(`⏳ Data not yet available on Irys, retrying in ${delay}ms... (${retries - 1} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          retries--;
          continue;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        if (retries > 1) {
          console.log(`⚠️ Fetch failed, retrying in ${delay}ms...`, fetchError);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          retries--;
        } else {
          throw fetchError;
        }
      }
    }
    
    throw new Error('Failed to fetch from Irys after all retries');
    
  } catch (error) {
    console.error('Error fetching linktree from Irys:', error);
    return null;
  }
}

// Get user's current Linktree link (if exists)
export function getUserLinktreeLink(address: string): string | null {
  try {
    const mappings = JSON.parse(localStorage.getItem('iryshare_linktree_mappings') || '[]');
    const mapping = mappings.find((m: any) => m.ownerAddress === address.toLowerCase());
    return mapping ? mapping.randomLink : null;
  } catch {
    return null;
  }
}
