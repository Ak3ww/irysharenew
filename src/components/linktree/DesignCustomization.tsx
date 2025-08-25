import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '../../hooks/use-toast';
import { 
  loadLinktreeData, 
  updateLinktreeData, 
  type LinktreeData 
} from '../../utils/linktreeStorage';
import MobilePreview from './MobilePreview';

// Exact theme colors from original Linktree clone
const THEME_COLORS = [
  { id: 1, color: 'bg-gradient-to-b from-sky-100 via-blue-50 to-white', text: 'text-gray-800', name: 'Air Blue' },
  { id: 2, color: 'bg-gray-800', text: 'text-white', name: 'Lake Black' },
  { id: 3, color: 'bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500', text: 'text-white', name: 'Purple Pie' },
  { id: 4, color: 'bg-gradient-to-t from-gray-500 via-blue-500 to-green-500', text: 'text-white', name: 'Green Grass' },
  { id: 5, color: 'bg-gradient-to-t from-orange-500 via-green-500 to-red-500', text: 'text-white', name: 'Traffic Lights' },
  { id: 6, color: 'bg-gradient-to-b from-blue-800 via-blue-500 to-green-500', text: 'text-white', name: 'Blue Sky' },
  { id: 7, color: 'bg-gradient-to-t from-lime-500 via-indigo-700 to-amber-500', text: 'text-white', name: 'Soft Horizon' },
  { id: 8, color: 'bg-gradient-to-t from-gray-800 to-emerald-500', text: 'text-white', name: 'Tinted Lake' },
];

export default function DesignCustomization() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const [currentData, setCurrentData] = useState<LinktreeData | null>(null);
  const [errors, setErrors] = useState<{name?: string[]} | null>(null);
  const [isBioFocused, setIsBioFocused] = useState(false);
  
  // Profile state - exact from original
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [themeId, setThemeId] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState(THEME_COLORS[0]);

  // Update selected theme when themeId changes
  useEffect(() => {
    const theme = THEME_COLORS.find(t => t.id === themeId) || THEME_COLORS[0];
    setSelectedTheme(theme);
  }, [themeId]);

  // Load existing data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!address) return;
      
      try {
        const data = await loadLinktreeData(address);
        if (data) {
          setCurrentData(data);
          setName(data.name || '');
          setBio(data.bio || '');
          setThemeId(data.theme_id || 1);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isConnected && address) {
      loadData();
    }
  }, [isConnected, address]);



  const updateTheme = async (newThemeId: number) => {
    try {
      setThemeId(newThemeId);
      await updateUserDetails();
    } catch (error) {
      console.log(error);
    }
  };

  const updateUserDetails = async () => {
    if (!address || !isConnected) {
      toast({
        title: "Error",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedData: LinktreeData = {
        ...currentData,
        name: name,
        bio: bio,
        theme_id: themeId,
        links: currentData?.links || []
      };

      await updateLinktreeData(address, updatedData);
      setCurrentData(updatedData);
      
      toast({
        title: "Success",
        description: "Your profile has been updated!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
      setErrors({ name: [error instanceof Error ? error.message : 'Unknown error'] });
    }
  };

  const bioLengthComputed = () => {
    return !bio ? 0 : bio.length;
  };

  // Auto-save when name or bio changes (with debounce)
  useEffect(() => {
    const saveData = async () => {
      if (!address || !isConnected) return;

      try {
        const updatedData: LinktreeData = {
          ...currentData,
          name: name,
          bio: bio,
          theme_id: themeId,
          links: currentData?.links || []
        };

        await updateLinktreeData(address, updatedData);
        setCurrentData(updatedData);
      } catch (error) {
        console.error('Error updating profile:', error);
        setErrors({ name: [error instanceof Error ? error.message : 'Unknown error'] });
      }
    };

    if (name || bio) {
      const timeoutId = setTimeout(() => {
        saveData();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [name, bio, address, isConnected, currentData, themeId]);

  return (
    <div className="flex h-[calc(100%-50px)] pb-4">
      <div className="lg:w-[calc(100%-500px)] md:w-[calc(100%-330px)] w-full md:pt-20 pt-14">
        <div className="max-w-[750px] mx-auto pb-24">
          
          {/* Profile Section - Exact copy from original */}
          <div id="ProfileSection">
            <div className="font-semibold pb-4 mt-8 md:mt-8 text-xl text-white">
              Profile
            </div>
            
            <div className="w-full bg-white rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <img 
                  className="rounded-full w-[90px]"
                  src="/default-avatar.png"
                  alt="Profile"
                />

                <div className="w-full">
                  <button className="flex items-center justify-center w-full py-3 rounded-full text-white font-semibold bg-[#8228D9] hover:bg-[#6c21b3] mb-2">
                    Pick image
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Profile Title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  className="w-full bg-[#EFF0EB] text-gray-800 border-2 text-sm border-[#EFF0EB] rounded-xl py-3.5 px-3 placeholder-gray-500 focus:outline-none focus:border-gray-900"
                />
                {errors?.name && (
                  <div className="text-red-500 text-sm mt-1">{errors.name[0]}</div>
                )}
              </div>

              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={80}
                placeholder="Bio"
                onFocus={() => setIsBioFocused(true)}
                onBlur={() => setIsBioFocused(false)}
                className={`w-full mt-4 bg-[#EFF0EB] text-gray-800 border-2 text-sm ${
                  isBioFocused ? 'border-gray-900' : 'border-[#EFF0EB]'
                } rounded-xl py-3.5 px-3 placeholder-gray-500 resize-none focus:outline-none`}
              />
              <div className="flex items-center justify-end text-[#676B5F] text-[13px]">
                {bioLengthComputed()}/80
              </div>
            </div>
          </div>

          {/* Theme Section - Exact copy from original */}
          <div id="ThemeSection">
            <div className="font-semibold pb-4 mt-8 md:mt-8 text-xl text-white">
              Themes
            </div>
            
            <div className="w-full bg-white rounded-3xl p-6">
              <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-4">
                {THEME_COLORS.map((item) => (
                  <div key={item.id}>
                    <div 
                      className={`border-2 border-gray-500 rounded-lg aspect-[2/3] border-dashed cursor-pointer ${
                        themeId === item.id 
                          ? 'transition-all duration-150 ease-in p-2' 
                          : 'transition-all duration-150 ease-out p-0'
                      }`}
                    >
                      <div 
                        onClick={() => updateTheme(item.id)}
                        className="relative rounded-xl h-full mx-auto"
                      >
                        <div 
                          className={`absolute left-0 top-0 h-full w-full z-0 ${item.color}`}
                        />
                        <div className="relative z-10 pt-9">
                          <div className="rounded-full mx-auto w-12 h-12 bg-[#EFF0EA] bg-opacity-70" />

                          <div className="w-[calc(100%-20px)] mx-auto rounded-full h-6 mt-4 bg-[#EFF0EA] bg-opacity-70"/>
                          <div className="w-[calc(100%-20px)] mx-auto rounded-full h-6 mt-1 bg-[#EFF0EA] bg-opacity-70"/>
                          <div className="w-[calc(100%-20px)] mx-auto rounded-full h-6 mt-1 bg-[#EFF0EA] bg-opacity-70"/>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview - Exact position and styling from original */}
      <MobilePreview 
        profile={{
          name: name || 'demo',
          bio: bio || '',
          image: undefined
        }}
        theme={selectedTheme}
        links={(currentData?.links || []).map(link => ({
          ...link,
          id: link.id.toString()
        }))}
      />
    </div>
  );
}
