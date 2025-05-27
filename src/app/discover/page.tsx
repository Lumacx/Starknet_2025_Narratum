'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Story {
  title: string;
  image: string;
}

const allStories: Story[] = [
  { title: 'The Enchanted Forest', image: 'https://picsum.photos/seed/forest/300/200' },
  { title: 'Space Adventure', image: 'https://picsum.photos/seed/space/300/200' },
  { title: "Wizard's Spell", image: 'https://picsum.photos/seed/wizard/300/200' },
  { title: 'The Flying Bananas', image: 'https://placehold.co/300x200/BFA071/1A2533?text=Flying+Bananas' },
  { title: 'Mystery Manor', image: 'https://picsum.photos/seed/manor/300/200' },
  { title: 'Moon Journey', image: 'https://picsum.photos/seed/moon/300/200' },
  { title: "Hero's Journey", image: 'https://picsum.photos/seed/hero/300/200' },
  { title: 'The Lost City', image: 'https://picsum.photos/seed/city/300/200' },
  { title: "Dragon's Hoard", image: 'https://picsum.photos/seed/dragon/300/200' },
  { title: 'Ancient Prophecy', image: 'https://picsum.photos/seed/prophecy/300/200' },
  { title: 'Cyberpunk City', image: 'https://picsum.photos/seed/cyberpunk/300/200' },
];

const CatalogPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedStories, setDisplayedStories] = useState<Story[]>(allStories);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  useEffect(() => {
    if (activeFilter === 'all') {
      setDisplayedStories(allStories);
      setSearchMessage('');
    } else {
      setDisplayedStories(allStories); 
      setSearchMessage(`Filter set to: ${activeFilter}. (Actual filtering logic not implemented)`);
    }
  }, [activeFilter]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    setSearchQuery(''); 
  };

  const handleReadClick = (storyTitle: string) => {
    setSearchMessage(`Reading "${storyTitle}" (Navigation not implemented)`);
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMessage('Please enter a search query.');
      setDisplayedStories(allStories);
      return;
    }

    setIsLoading(true);
    setSearchMessage('Searching for stories...');
    setDisplayedStories([]);

    try {
      const storyTitles = allStories.map(story => story.title);
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, storyTitles }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      const { matchedTitles } = result;

      if (Array.isArray(matchedTitles) && matchedTitles.length > 0) {
        const filtered = allStories.filter(story => matchedTitles.includes(story.title));
        setDisplayedStories(filtered);
        setSearchMessage(`Found ${filtered.length} matching stories.`);
      } else {
        setDisplayedStories([]);
        setSearchMessage('No semantically related stories found from your titles.');
      }
    } catch (error: any) {
      console.error("Semantic search error:", error);
      setSearchMessage(`Error during search: ${error.message}. Please try again.`);
      setDisplayedStories(allStories); // Show all stories again on error, or an empty list
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center p-5 md:p-10 bg-[#1A2533] text-[#E0C9A0] font-sans box-border">
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>
      <div className="catalog-container w-full max-w-6xl text-center pt-16">
        <header className="page-header mb-8">
          <h1 className="font-['Cinzel_Decorative'] text-5xl md:text-6xl font-bold text-[#E0C9A0] m-0 tracking-wide">NARRATUM</h1>
          <h2 className="font-['Lato'] text-xl md:text-2xl font-bold uppercase tracking-wider text-[#BFA071] m-0">CATALOG OF STORIES</h2>
        </header>
        <nav className="filter-nav flex justify-center gap-6 md:gap-8 mb-6 flex-wrap">
          <button onClick={() => handleFilterClick('all')} className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none ${activeFilter === 'all' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}>All stories</button>
          <button onClick={() => handleFilterClick('popular')} className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none ${activeFilter === 'popular' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}>Popular</button>
          <button onClick={() => handleFilterClick('recent')} className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none ${activeFilter === 'recent' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}>Recent</button>
          <button onClick={() => handleFilterClick('theme')} className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none ${activeFilter === 'theme' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}>Theme</button>
        </nav>
        <div className="flex justify-center items-center gap-3 mb-8 w-full max-w-md mx-auto">
          <input type="text" placeholder="Search stories semantically..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-grow p-3 rounded-lg border-2 border-[#4A5C6E] bg-[#233446] text-[#E0C9A0] placeholder-[#8FA0AF] focus:outline-none focus:border-[#BFA071]"/>
          <button onClick={handleSemanticSearch} disabled={isLoading} className="bg-[#BFA071] text-[#1A2533] py-3 px-6 rounded-lg font-bold text-sm uppercase tracking-wide transition-colors duration-300 hover:bg-[#E0C9A0] disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchMessage && (<div className="mb-6 p-3 rounded-lg text-sm bg-blue-900 text-blue-200 border border-blue-700">{searchMessage}</div>)}
        <main className="story-grid flex flex-wrap justify-center gap-8">
          {displayedStories.length > 0 ? (
            displayedStories.map((story, index) => (
              <div key={index} className="story-card bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg w-64 text-[#E0C9A0] shadow-xl relative transition-all duration-300 ease-in-out hover:translate-y-[-5px] hover:shadow-2xl">
                <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>
                <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <div className="card-art-container w-full h-40 mb-4 rounded-sm overflow-hidden relative z-20">
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover block" />
                </div>
                <h3 className="font-['Merriweather'] text-xl font-bold mb-4 leading-tight min-h-[3.25rem] z-20 relative">{story.title}</h3>
                <button onClick={() => handleReadClick(story.title)} className="font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2.5 px-6 rounded-md text-base font-bold uppercase tracking-wide inline-block mb-1.5 transition-colors duration-300 hover:bg-[#E0C9A0] z-20 relative">
                  READ
                </button>
              </div>
            ))
          ) : (
            !isLoading && <p className="text-lg text-gray-400">No stories to display.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default CatalogPage;
