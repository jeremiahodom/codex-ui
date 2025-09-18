// Simple MessageRouter component
import React from 'react';
import type { ChatMessage } from '@/types/chat';

interface MessageRouterProps {
  message: ChatMessage;
  selectedText?: string;
  onApproval?: (approved: boolean, approvalRequest?: any) => void;
}

export const MessageRouter: React.FC<MessageRouterProps> = ({ message }) => {
  return (
    <div className="p-3 rounded-lg">
      <div className="font-medium mb-1 capitalize">{message.role}</div>
      <div className="whitespace-pre-wrap">{message.content}</div>
    </div>
  );
};