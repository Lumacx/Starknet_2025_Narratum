import type { FC } from 'react';
import { BookHeart } from 'lucide-react';

const Header: FC = () => {
  return (
    <header className="py-6 px-4 md:px-8 bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookHeart className="h-10 w-10 text-accent" />
          <h1 className="text-4xl font-bold font-titles">Narrative Nexus</h1>
        </div>
        {/* Navigation can be added here later */}
      </div>
    </header>
  );
};

export default Header;
