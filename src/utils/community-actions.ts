export async function createComment({ storyId, content }: { storyId: string; content: string }) {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation CreateComment($storyId: String!, $content: String!) {
            comment_insert(data: {
              storyId: $storyId,
              authorId: "auth.uid",
              content: $content
            }) {
              id
            }
          }
        `,
        variables: { storyId, content },
      }),
    });
  
    const result = await res.json();
    return result.data;
  }
  
  export async function createReaction({ storyId, reactionType }: { storyId: string; reactionType: string }) {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation CreateReaction($storyId: String!, $reactionType: String!) {
            reaction_insert(data: {
              storyId: $storyId,
              userId: "auth.uid",
              reactionType: $reactionType
            }) {
              id
            }
          }
        `,
        variables: { storyId, reactionType },
      }),
    });
  
    const result = await res.json();
    return result.data;
  }
  