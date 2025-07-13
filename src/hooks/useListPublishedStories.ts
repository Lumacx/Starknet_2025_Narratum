import { useGetAllStories } from '@firebasegen/default-connector/react';
import { Story } from '@/lib/types';

type AllStoriesData = {
  stories?: Story[];
};

export const useListPublishedStories = () => {
  return useGetAllStories({
    select: (data: AllStoriesData) => {
      const stories: Story[] = data?.stories ?? [];
      return stories.filter(story => story.status === 'published');
    }
  });
};
