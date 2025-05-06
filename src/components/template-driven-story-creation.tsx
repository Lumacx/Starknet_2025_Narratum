import type { FC } from 'react';
import AiWritingPrompts from './ai-writing-prompts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wand2 } from 'lucide-react'; // Fantasy-inspired icon

const TemplateDrivenStoryCreation: FC = () => {
  return (
    <section aria-labelledby="story-creation-title" className="py-8 md:py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <Wand2 className="h-12 w-12 text-accent mx-auto mb-4" />
          <h2 id="story-creation-title" className="text-3xl md:text-4xl font-titles font-bold text-foreground">
            Craft Your Narrative
          </h2>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Bring your stories to life with our guided templates and AI-powered writing assistance.
          </p>
        </div>
        
        {/* Placeholder for Template Selection and Editor */}
        <Card className="w-full max-w-3xl mx-auto mb-12 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-titles">Story Editor</CardTitle>
            <CardDescription>
              This is where you'll select a template and write your story. Content fields for text, images, and choices will appear based on the chosen template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Story Editor Interface Placeholder</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Writing Prompts Component */}
        <AiWritingPrompts />
      </div>
    </section>
  );
};

export default TemplateDrivenStoryCreation;
