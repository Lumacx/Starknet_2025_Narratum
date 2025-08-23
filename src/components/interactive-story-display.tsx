// src/components/interactive-story-display.tsx
'use client';

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useListPublishedStories } from '@/hooks/useListPublishedStories';

const InteractiveStoryDisplay: FC = () => {
  const { data = [], isLoading } = useListPublishedStories();
  const feature = data[0]; // later: choose by "featured" flag

  if (isLoading) return null;
  if (!feature) return null;

  const summary = feature.description || 'A Narratum tale.';

  return (
    <section aria-labelledby="interactive-story-title" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2
          id="interactive-story-title"
          className="text-3xl md:text-4xl font-titles font-bold text-center mb-8 text-foreground"
        >
          Featured Story
        </h2>
        <Link href={`/story/${feature.id}`}>
          <Card className="w-full max-w-2xl mx-auto shadow-xl overflow-hidden hover:shadow-2xl transition">
            <CardHeader className="p-0">
              <Image
                src={feature.coverImageUrl || 'https://placehold.co/800x400?text=No+Cover'}
                alt={feature.title || 'Untitled'}
                width={800}
                height={400}
                className="w-full h-auto object-cover"
              />
            </CardHeader>
            <CardContent className="p-6">
              <CardTitle className="text-2xl font-titles mb-2">
                {feature.title || 'Untitled'}
              </CardTitle>
              <CardDescription className="text-base mb-4 line-clamp-3">
                {summary}
              </CardDescription>
              <p className="text-muted-foreground text-sm">
                {(feature.genres || []).join(', ')}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
};

export default InteractiveStoryDisplay;
