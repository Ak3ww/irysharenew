// Types for our storage
export interface UserData {
    username: string;
    address: string;
    lastUpdated: number;
  }
  
  // Storage keys
  const STORAGE_KEYS = {
    USER_DATA: 'iryshare_user_data',
  } as const;
  
  // Storage utilities
  export const storage = {
    saveUserData: (data: UserData) => {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    },
    
    getUserData: (): UserData | null => {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    },
  };