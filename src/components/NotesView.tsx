import React from "react";
import { NoteEditor } from "./notes/NoteEditor";

export const NotesView: React.FC = () => {
  const handleSave = (title: string, content: string) => {
    console.log('Saving note:', title, content);
  };

  const handleCancel = () => {
    console.log('Cancelled note editing');
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-h-0 h-full min-w-0">
        <NoteEditor onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  );
};
