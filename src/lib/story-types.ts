export type ScenePage = {
    pageNumber: number;
    text: string;              // user-editable story text
    imagePrompt: string;       // user-editable img prompt
    imageUrl?: string | null;  // dataURL or https URL
    narrationText?: string;    // user-editable TTS text (defaults to text)
    audioUrl?: string | null;  // https URL (or blob URL during editing)
  };
  
  export type StoryWorkspace = {
    storyId: string;           // e.g., nanoid or firestore id later
    title: string;
    genres: string[];
    synopsis: string;
    pages: number;
    coverUrl: string;
    characters?: { name: string; imageUrl?: string }[];
    locations?:  { name: string; imageUrl?: string }[];
    pagesData: ScenePage[];
  };
  