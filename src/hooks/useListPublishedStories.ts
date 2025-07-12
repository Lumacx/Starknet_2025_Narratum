import { useQuery } from '@tanstack/react-query';
import { graphqlRequestClient } from '@/lib/graphqlClient';
import { gql } from 'graphql-request';
import { Story } from '@/lib/types'; // para tipado correcto opcional

type ListPublishedStoriesResponse = {
  stories: Story[];
};

const LIST_PUBLISHED_STORIES = gql`
  query ListPublishedStories {
    stories(where: { status: { _eq: "published" } }) {
      id
      title
      genre
      status
      coverImageUrl
      createdAt
      updatedAt
      authorID
      creator {
        displayname
      }
    }
  }
`;

export const useListPublishedStories = () =>
  useQuery<Story[], Error>({
    queryKey: ['published-stories'],
    queryFn: async () => {
      const data = await graphqlRequestClient.request<ListPublishedStoriesResponse>(
        LIST_PUBLISHED_STORIES
      );
      return data.stories;
    },
  });