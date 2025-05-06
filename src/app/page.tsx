import Header from '@/components/header';
import InteractiveStoryDisplay from '@/components/interactive-story-display';
import TemplateDrivenStoryCreation from '@/components/template-driven-story-creation';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <InteractiveStoryDisplay />
        <div className="container mx-auto px-4">
           <Separator className="my-8 md:my-12 border-accent/30" />
        </div>
        <TemplateDrivenStoryCreation />
      </main>
      <footer className="py-6 px-4 md:px-8 bg-primary text-primary-foreground text-center mt-12">
        <p className="text-sm">&copy; {new Date().getFullYear()} Narrative Nexus. All rights reserved.</p>
      </footer>
    </div>
  );
}
