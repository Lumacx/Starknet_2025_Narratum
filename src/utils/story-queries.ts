export async function getStoryWithContent({ storyId }: { storyId: string }) {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetStoryWithContent($storyId: String!) {
            story(id: $storyId) {
              id
              title
              genre
              description
              coverImageUrl
              status
              createdAt
              storyContent {
                id
                textContent
                pageNumber
              }
              comments {
                id
                content
                author {
                  id
                  displayname
                  avatarUrl
                }
              }
            }
          }
        `,
        variables: { storyId },
      }),
    });
  
    const result = await res.json();
    return result.data?.story;
  }
  