// src/components/GenreMultiSelect.tsx
'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

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
  const { t } = useLocale();

  const handleCheckboxChange = (genre: string, checked: boolean) => {
    if (checked) {
      onSelectedGenresChange([...selectedGenres, genre]);
    } else {
      onSelectedGenresChange(selectedGenres.filter((g) => g !== genre));
    }
  };

  const buttonLabel =
    selectedGenres.length > 0
      ? t('genreMulti.genresWithCount').replace('{count}', String(selectedGenres.length))
      : t('genreMulti.genres');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {buttonLabel}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[180px] bg-white text-[#3A4B5C] dark:bg-[#233446] dark:text-[#E0C9A0] border border-[#D4E1EE] dark:border-[#4A5C6E]"
      >
        <DropdownMenuLabel>{t('genreMulti.selectGenres')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {genresList.map((genre) => (
          <DropdownMenuCheckboxItem
            key={genre}
            checked={selectedGenres.includes(genre)}
            onCheckedChange={(checked) => handleCheckboxChange(genre, !!checked)}
            className="capitalize 
              data-[state=checked]:bg-[#E97451] data-[state=checked]:text-white 
              dark:data-[state=checked]:bg-[#BFA071] dark:data-[state=checked]:text-[#1A2533] 
              focus:bg-gray-100 dark:focus:bg-[#4A5C6E] 
              hover:bg-gray-100 dark:hover:bg-[#4A5C6E] 
              focus:text-[#3A4B5C] dark:focus:text-[#E0C9A0] 
              hover:text-[#3A4B5C] dark:hover:text-[#E0C9A0] 
              cursor-pointer
            "
          >
            {genre}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GenreMultiSelect;
