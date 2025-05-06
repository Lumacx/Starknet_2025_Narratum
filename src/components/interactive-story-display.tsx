import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

const InteractiveStoryDisplay: FC = () => {
  return (
    <section aria-labelledby="interactive-story-title" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2 id="interactive-story-title" className="text-3xl md:text-4xl font-titles font-bold text-center mb-8 text-foreground">
          Featured Story
        </h2>
        <Card className="w-full max-w-2xl mx-auto shadow-xl overflow-hidden">
          <CardHeader className="p-0">
             <Image 
              src="https://picsum.photos/800/400" 
              alt="Fantasy landscape" 
              width={800} 
              height={400} 
              className="w-full h-auto object-cover"
              data-ai-hint="fantasy landscape"
            />
          </CardHeader>
          <CardContent className="p-6">
            <CardTitle className="text-2xl font-titles mb-2">The Lost Amulet of Eldoria</CardTitle>
            <CardDescription className="text-base mb-4">
              Embark on a perilous journey through enchanted forests and treacherous mountains to find the legendary Lost Amulet. Your choices will shape your destiny.
            </CardDescription>
            <p className="text-muted-foreground text-sm">
              This is a placeholder for the interactive story display. Actual story content and navigation controls will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InteractiveStoryDisplay;
