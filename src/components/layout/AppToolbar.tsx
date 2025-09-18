// Simple AppToolbar component
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface AppToolbarProps {
  onOpenConfig: () => void;
  currentTab: string;
  onSwitchToTab: (tab: string) => void;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({ onOpenConfig }) => {
  return (
    <div className="border-b bg-background p-2 flex items-center justify-between">
      <h1 className="text-lg font-semibold">Codex Chat</h1>
      <Button variant="ghost" size="sm" onClick={onOpenConfig}>
        <Settings size={16} />
      </Button>
    </div>
  );
};