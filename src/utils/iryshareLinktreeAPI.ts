import axios from 'axios';
import { useAccount } from 'wagmi';

const API_BASE_URL = 'http://localhost:3002/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add wallet address to requests
api.interceptors.request.use((config) => {
  const walletAddress = localStorage.getItem('wallet_address');
  if (walletAddress) {
    config.headers['wallet-address'] = walletAddress;
  }
  return config;
});

export interface User {
  id: number;
  name: string;
  email: string;
  bio?: string;
  image?: string;
  theme_id: number;
}

export interface Link {
  id: number;
  user_id: number;
  name: string;
  url: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface Theme {
  id: number;
  name: string;
  background_color: string;
  text_color: string;
  accent_color: string;
}

export interface ProfileResponse {
  user: User & { theme: Theme };
  links: Link[];
}

// Set wallet address for API calls
export const setWalletAddress = (address: string) => {
  localStorage.setItem('wallet_address', address);
};

// Clear wallet address
export const clearWalletAddress = () => {
  localStorage.removeItem('wallet_address');
};

// User API
export const userAPI = {
  async getUser(): Promise<User> {
    const response = await api.get('/user');
    return response.data;
  },

  async updateUser(data: { name: string; bio?: string }): Promise<{ message: string }> {
    const response = await api.patch('/user', data);
    return response.data;
  },

  async uploadUserImage(imageFile: File): Promise<{ message: string; image: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post('/user/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Links API
export const linksAPI = {
  async getLinks(): Promise<Link[]> {
    const response = await api.get('/links');
    return response.data;
  },

  async createLink(name: string, url: string): Promise<{ message: string; id: number }> {
    const response = await api.post('/links', { name, url });
    return response.data;
  },

  async updateLink(id: number, name: string, url: string): Promise<{ message: string }> {
    const response = await api.patch(`/links/${id}`, { name, url });
    return response.data;
  },

  async deleteLink(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/links/${id}`);
    return response.data;
  },

  async uploadLinkImage(linkId: number, imageFile: File): Promise<{ message: string; image: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post(`/links/${linkId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Themes API
export const themesAPI = {
  async getThemes(): Promise<Theme[]> {
    const response = await api.get('/themes');
    return response.data;
  },

  async updateUserTheme(themeId: number): Promise<{ message: string }> {
    const response = await api.patch('/user/theme', { theme_id: themeId });
    return response.data;
  }
};

// Public API (no auth required)
export const publicAPI = {
  async getProfile(walletOrUsername: string): Promise<ProfileResponse> {
    const response = await api.get(`/profile/${walletOrUsername}`);
    return response.data;
  },

  async testConnection(): Promise<{ message: string; timestamp: string }> {
    const response = await api.get('/test');
    return response.data;
  }
};

// Utility functions
export const apiUtils = {
  // Convert base64 to File for upload
  base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  },

  // Get full image URL
  getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:3002${imagePath}`;
    }
    return imagePath;
  }
};

export default api;
