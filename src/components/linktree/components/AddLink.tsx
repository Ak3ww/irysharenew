import React, { useState } from 'react';
import TextInput from './TextInput';
import { useLinktreeStore } from '../context/LinktreeContext';
import { getSocialLogo, getSocialLogoContext, getSocialPlatformName } from '../../../utils/socialDetection';

interface AddLinkProps {
  onClose: () => void;
  className?: string;
  onLinkAdded?: () => void;
}

export default function AddLink({ onClose, className = '', onLinkAdded }: AddLinkProps) {
  const userStore = useLinktreeStore();
  const [linkName, setLinkName] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<any>(null);

  const addLink = async () => {
    try {
      await userStore.addLink(linkName, url);
      await userStore.getAllLinks();
      setTimeout(() => {
        onClose();
        setLinkName('');
        setUrl('');
        if (onLinkAdded) onLinkAdded();
      }, 100);
    } catch (error) {
      console.log(error);
      setErrors(error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLink();
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            ADD NEW LINK
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <TextInput
            label="LINK NAME"
            value={linkName}
            onChange={setLinkName}
            placeholder="Enter link name"
            error={errors && errors.name ? errors.name[0] : ''}
          />

          <TextInput
            label="URL"
            value={url}
            onChange={setUrl}
            placeholder="Enter URL"
            error={errors && errors.url ? errors.url[0] : ''}
          />

          {url && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <img 
                  src={getSocialLogoContext(url, true)} 
                  alt={getSocialPlatformName(url)}
                  className="w-5 h-5"
                />
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Irys2' }}>
                  Detected platform: {getSocialPlatformName(url)}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={addLink}
            disabled={!linkName.trim() || !url.trim()}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              linkName.trim() && url.trim()
                ? 'bg-[#67FFD4] text-black hover:bg-[#8AFFE4]'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Irys1' }}
          >
            ADD LINK
          </button>
        </div>
      </div>
    </div>
  );
}