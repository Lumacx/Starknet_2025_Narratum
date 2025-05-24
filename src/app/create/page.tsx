'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface StoryFormData {
  title: string;
  genre: string;
  setting: string;
  beginning: boolean;
  conflict: boolean;
  climax: boolean;
  ending: boolean;
}

const CreateStoryPage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth(); // Added starknetAddress
  const router = useRouter();
  const isLoggedIn = !!user || !!starknetAddress; // Combined login check

  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    genre: 'Fantasy',
    setting: 'Forest',
    beginning: false,
    conflict: false,
    climax: false,
    ending: false,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !isLoggedIn) { // Use combined isLoggedIn check
      router.push('/login'); 
    }
  }, [isLoggedIn, loading, router]); // Added isLoggedIn to dependencies

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement; 
    const { name, value, type } = target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleCharacterAdd = () => {
    setMessage('Character addition functionality not yet implemented.');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { // Use combined isLoggedIn check
      setMessage('Error: You must be logged in to create a story.');
      return;
    }
    console.log('Story Data Submitted:', formData);
    setMessage('Story data submitted! (Backend functionality not yet implemented)');
  };

  const characterPlaceholders = [
    'https://placehold.co/80x80/C1A98A/FFFFFF?text=Char1',
    'https://placehold.co/80x80/A9834F/FFFFFF?text=Char2',
    'https://placehold.co/80x80/8B6F4E/FFFFFF?text=Char3',
  ];

  if (loading || !isLoggedIn) { // Use combined isLoggedIn check
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-semibold">{loading ? 'Loading user...' : 'Redirecting to login...'}</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#4A3B31] font-sans">
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>
      <div className="w-full max-w-5xl bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-2xl shadow-xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <i className="fas fa-feather-alt absolute top-4 right-4 text-6xl text-[#A9834F] opacity-30 rotate-12 -z-0 hidden md:block"></i>
        <div className="md:col-span-2 text-center md:text-left">
          <h1 className="font-['Merriweather'] text-5xl md:text-6xl font-extrabold text-[#5D4037] mb-8 uppercase tracking-wide">SUMMON YOUR<br />STORY</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-xl font-bold text-[#4A3B31] mb-2">Title</label>
              <input
                type="text" id="title" name="title" value={formData.title} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
                placeholder="Enter your story title" required
              />
            </div>
            <div>
              <label htmlFor="genre" className="block text-xl font-bold text-[#4A3B31] mb-2">Genre</label>
              <select
                id="genre" name="genre" value={formData.genre} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
              >
                <option>Fantasy</option><option>Science Fiction</option><option>Mystery</option><option>Romance</option><option>Thriller</option><option>Historical</option>
              </select>
            </div>
            <div>
              <label className="block text-xl font-bold text-[#4A3B31] mb-2">Characters</label>
              <div className="flex items-center gap-4 flex-wrap">
                {characterPlaceholders.map((src, index) => (
                  <div key={index} className="w-20 h-20 rounded-full border-2 border-[#A9834F] overflow-hidden flex-shrink-0">
                    <img src={src} alt={`Character ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                <button
                  type="button" onClick={handleCharacterAdd}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-[#C1A98A] text-[#A9834F] text-4xl flex items-center justify-center bg-[#FDFBF5] hover:bg-[#F0E6D2] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#A9834F]"
                  title="Add Character"
                ><i className="fas fa-plus"></i></button>
              </div>
            </div>
            <div>
              <label htmlFor="setting" className="block text-xl font-bold text-[#4A3B31] mb-2">Setting</label>
              <select
                id="setting" name="setting" value={formData.setting} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
              >
                <option>Forest</option><option>City</option><option>Space</option><option>Underwater</option><option>Desert</option>
              </select>
            </div>
            <div>
              <label className="block text-xl font-bold text-[#4A3B31] mb-2">Story Structure</label>
              <div className="grid grid-cols-2 gap-4 text-left">
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="beginning" checked={formData.beginning} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Beginning</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="conflict" checked={formData.conflict} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Conflict</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="climax" checked={formData.climax} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Climax</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="ending" checked={formData.ending} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Ending</span>
                </label>
              </div>
            </div>
            {message && (<div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{message}</div>)}
            <button type="submit" className="w-full py-3 px-6 bg-[#A9834F] text-white font-bold rounded-lg shadow-md hover:bg-[#8B6F4E] transition duration-300 focus:outline-none focus:ring-4 focus:ring-[#A9834F]">
              SUMMON STORY
            </button>
          </form>
        </div>
        <div className="md:col-span-1 space-y-6 md:space-y-8 mt-8 md:mt-0">
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Start with an intriguing hook to capture attention.</p>
          </div>
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Focus on vivid, sensory details to bring scenes to life.</p>
          </div>
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Develop well-rounded characters with clear motivations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryPage;
