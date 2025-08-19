'use client';

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react'; // Assuming lucide-react is used for icons

interface GenreMultiSelectProps {
  genresList: string[];
  selectedGenres: string[];
  onSelectedGenresChange: (genres: string[]) => void;
}

const GenreMultiSelect: React.FC<GenreMultiSelectProps> = ({
  genresList,
  selectedGenres,
  onSelectedGenresChange,
}) => {
  const handleCheckboxChange = (genre: string, checked: boolean) => {
    if (checked) {
      onSelectedGenresChange([...selectedGenres, genre]);
    } else {
      onSelectedGenresChange(selectedGenres.filter((g) => g !== genre));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[180px]">
        <DropdownMenuLabel>Select Genres</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {genresList.map((genre) => (
          <DropdownMenuCheckboxItem
            key={genre}
            checked={selectedGenres.includes(genre)}
            onCheckedChange={(checked) => handleCheckboxChange(genre, checked)}
            className="capitalize"
          >
            {genre}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GenreMultiSelect;
