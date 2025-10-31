"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ value = [], onChange, placeholder, className }, ref) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim() !== '') {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (!value.includes(newTag)) {
          onChange([...value, newTag]);
        }
        setInputValue('');
      } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        const newTags = value.slice(0, -1);
        onChange(newTags);
      }
    };

    const removeTag = (tagToRemove: string) => {
      const newTags = value.filter(tag => tag !== tagToRemove);
      onChange(newTags);
    };

    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-sm">
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
        </div>
        <Input
          ref={ref}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder || "Tekan enter untuk menambah tag..."}
        />
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';
