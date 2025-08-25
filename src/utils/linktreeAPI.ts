import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('linktree_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('linktree_token');
      localStorage.removeItem('linktree_user');
      // Optionally redirect to login
    }
    return Promise.reject(error);
  }
);

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

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ProfileResponse {
  user: User & { theme: Theme };
  links: Link[];
}

// Auth API
export const authAPI = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/register', { name, email, password });
    
    // Store token and user data
    localStorage.setItem('linktree_token', response.data.token);
    localStorage.setItem('linktree_user', JSON.stringify(response.data.user));
    
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/login', { email, password });
    
    // Store token and user data
    localStorage.setItem('linktree_token', response.data.token);
    localStorage.setItem('linktree_user', JSON.stringify(response.data.user));
    
    return response.data;
  },

  logout() {
    localStorage.removeItem('linktree_token');
    localStorage.removeItem('linktree_user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('linktree_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getStoredToken(): string | null {
    return localStorage.getItem('linktree_token');
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
};

// User API
export const userAPI = {
  async getUser(): Promise<User> {
    const response = await api.get('/users');
    return response.data;
  },

  async updateUser(id: number, data: { name: string; bio?: string }): Promise<{ message: string }> {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  async uploadUserImage(imageFile: File): Promise<{ message: string; image: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post('/user-image', formData, {
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

  async createLink(name: string, url: string): Promise<{ message: string }> {
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
    formData.append('linkId', linkId.toString());
    
    const response = await api.post('/link-image', formData, {
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
    const response = await api.patch('/themes', { theme_id: themeId });
    return response.data;
  }
};

// Public API (no auth required)
export const publicAPI = {
  async getProfile(username: string): Promise<ProfileResponse> {
    const response = await api.get(`/profile/${username}`);
    return response.data;
  },

  async testConnection(): Promise<{ message: string }> {
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
      return `http://localhost:3001${imagePath}`;
    }
    return imagePath;
  }
};

export default api;
