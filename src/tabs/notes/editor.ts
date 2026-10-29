// TipTap editor factory, loaded on demand so the editor code stays out of the main chunk.
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

export type { Editor };

export function createEditor(element: HTMLElement, content: string, onUpdate: (html: string) => void): Editor {
  return new Editor({
    element,
    content,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
      Placeholder.configure({ placeholder: 'Session notes, NPCs, loot, plans…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editorProps: { attributes: { class: 'notes-prose min-h-[70vh] outline-none', 'aria-label': 'Campaign notes' } },
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
  });
}
