"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ value = [], onChange, placeholder, className, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim() !== '') {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (!value.includes(newTag)) {
          onChange?.([...value, newTag]);
        }
        setInputValue('');
      } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        const newTags = value.slice(0, -1);
        onChange?.(newTags);
      }
    };

    const removeTag = (tagToRemove: string) => {
      const newTags = value.filter(tag => tag !== tagToRemove);
      onChange?.(newTags);
    };

    return (
      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2 text-sm ring-offset-background',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          className
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-sm">
            {tag}
            <button
              type="button"
              className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
        <Input
          ref={ref}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder || "Tekan enter untuk menambah tag..."}
          className="flex-1 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0"
          {...props}
        />
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';
