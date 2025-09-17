import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Settings, FileText } from 'lucide-react';
import { CodexConfig, DEFAULT_CONFIG } from '@/types/codex';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfigDialogProps {
  isOpen: boolean;
  config: CodexConfig;
  onClose: () => void;
  onSave: (config: CodexConfig) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<CodexConfig>({
    ...config,
  });

  const handleSelectCodexExecutable = async () => {
    try {
      const result = await open({
        multiple: false,
        directory: false
      });
      if (result) {
        setLocalConfig(prev => ({ ...prev, codexPath: result }));
      }
    } catch (error) {
      console.error('Failed to select codex executable:', error);
      alert('Failed to select codex executable: ' + error);
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
  };

  const updateConfig = (field: keyof CodexConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Codex Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your Codex settings and preferences
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Codex Executable Path */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Codex Executable Path</label>
            <div className="flex gap-2">
              <Input
                value={localConfig.codexPath || ''}
                onChange={(e) => updateConfig('codexPath', e.target.value || undefined)}
                placeholder="Auto-detect or specify path to codex"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSelectCodexExecutable}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Browse
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Path to codex executable. Leave empty for auto-detection in common locations like ~/.bun/bin/codex
            </p>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Security Settings</h3>
            
            {/* Approval Policy */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Approval Policy</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'untrusted', label: 'Untrusted' },
                  { value: 'on-failure', label: 'On Failure' },
                  { value: 'on-request', label: 'On Request' },
                  { value: 'never', label: 'Never' },
                ].map((policy) => (
                  <Button
                    key={policy.value}
                    variant={localConfig.approvalPolicy === policy.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('approvalPolicy', policy.value)}
                  >
                    {policy.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Arguments */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Arguments (Advanced)</label>
            <Input
              value={localConfig.customArgs?.join(' ') || ''}
              onChange={(e) => updateConfig('customArgs', e.target.value.split(' ').filter(arg => arg.trim()))}
              placeholder="--config foo=bar --profile dev"
            />
            <p className="text-xs text-gray-500">
              Additional command-line arguments for codex
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};