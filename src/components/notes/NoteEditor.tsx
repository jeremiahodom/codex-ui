// Simple NoteEditor component
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface NoteEditorProps {
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialContent?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  onSave, 
  onCancel, 
  initialTitle = '', 
  initialContent = '' 
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim(), content.trim());
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder="Note title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Note content..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px]"
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!title.trim()}>
          Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};