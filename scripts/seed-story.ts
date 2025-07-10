
import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFile } from 'fs/promises';
import { join } from 'path';
import { context } from '../src/context/context';

// Interfaces para tipado fuerte
interface StoryPage {
  pageNumber: number;
  textContent: string;
  imageUrl: string;
  audioUrl: string;
}

interface Comment {
  authorId: string;
  content: string;
}

// Datos del cuento
const storyId = "story-1";
const authorId = "user-1";
const readerId = "user-2";
const title = "The Lost Treasure of the Lost Abyss";
const description = "A thrilling adventure to uncover a legendary treasure.";
const genre = "Adventure";
const coverImageUrl = "/Integrations/Story_Reader/images/cover.png";
const status = "published";

async function main() {
  const storyContent: StoryPage[] = [];
  for (let i = 0; i <= 11; i++) {
    const textContent = await readFile(join('Integrations/Story_Reader/notes', `Note_${i}.txt`), 'utf-8');
    storyContent.push({
      pageNumber: i,
      textContent,
      imageUrl: `/Integrations/Story_Reader/images/page${i}.png`,
      audioUrl: `/Integrations/Story_Reader/audio/narration_${i}.mp3`,
    });
  }

  const comments: Comment[] = [
    {
      authorId: readerId,
      content: "This is a great story! I can't wait to see what happens next.",
    },
    {
      authorId: authorId,
      content: "Thanks! I'm glad you're enjoying it.",
    },
  ];

  try {
    const storyRef = context.db.collection('stories').doc(storyId);

    // Crear documento principal del cuento
    await storyRef.set({
      authorId,
      title,
      description,
      genre,
      coverImageUrl,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Subcolección: storyContent
    const storyContentCollection = storyRef.collection('storyContent');
    for (const content of storyContent) {
      await storyContentCollection.add(content);
    }

    // Subcolección: comments
    const commentsCollection = storyRef.collection('comments');
    for (const comment of comments) {
      await commentsCollection.add(comment);
    }

    console.log("✅ Story created successfully.");
  } catch (error) {
    console.error("❌ Error creating story:", error);
  }
}

main();