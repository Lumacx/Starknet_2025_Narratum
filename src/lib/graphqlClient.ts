import { GraphQLClient } from 'graphql-request';

export const graphqlRequestClient = new GraphQLClient('/api/graphql', {
  credentials: 'include',
});
