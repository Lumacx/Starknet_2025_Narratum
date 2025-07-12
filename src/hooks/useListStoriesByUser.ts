import { useQuery } from '@tanstack/react-query';
import { graphqlRequestClient } from '@/lib/graphqlClient';
import { gql } from 'graphql-request';

type Story = {
  id: string;
  title: string;
  genre: string;
  status: string;
  updatedAt: string;
};

type ListStoriesByUserResponse = {
  stories: Story[];
};

const LIST_STORIES_BY_USER = gql`
  query ListStoriesByUser($userId: String!) {
    stories(where: { authorId: { _eq: $userId } }) {
      id
      title
      genre
      status
      updatedAt
    }
  }
`;

export const useListStoriesByUser = (userId: string) => {
  return useQuery({
    queryKey: ['stories-by-user', userId],
    queryFn: async () => {
      const data = await graphqlRequestClient.request<ListStoriesByUserResponse>(
        LIST_STORIES_BY_USER,
        { userId }
      );
      return data.stories;
    },
    enabled: !!userId,
  });
};
