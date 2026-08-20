'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
  ListOrdered,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Code,
} from 'lucide-react';

const COLORS = ['#0f172a', '#005aaa', '#dc2626', '#16a34a', '#ca8a04'];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 ${
        active ? 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white' : ''
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />;
}

/**
 * A real WYSIWYG editor (Tiptap) for the Package Terms fields — bold,
 * italic, underline, lists, alignment, links, color, undo/redo, plus a raw
 * HTML source toggle. Stores actual HTML rather than the markdown-lite
 * plain text FormattedTextArea uses elsewhere, since these are long-form
 * legal/terms clauses where real formatting fidelity matters more than
 * schema simplicity — the Package Terms columns are already free-text
 * strings, so no schema change was needed to hold HTML instead.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [showSource, setShowSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[120px] rounded-b-lg border border-t-0 border-slate-300 px-3 py-2 text-sm focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:prose-invert',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  function toggleSource() {
    if (!showSource) {
      setSourceDraft(editor!.getHTML());
    } else {
      editor!.commands.setContent(sourceDraft);
      onChange(editor!.getHTML());
    }
    setShowSource(!showSource);
  }

  function setLink() {
    const url = window.prompt('Link URL');
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    editor!.chain().focus().setLink({ href: url }).run();
  }

  const iconClass = 'h-3.5 w-3.5';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-slate-300 bg-slate-50 px-1.5 py-1 dark:border-slate-600 dark:bg-slate-800">
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className={iconClass} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className={iconClass} />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className={iconClass} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className={iconClass} />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className={iconClass} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className={iconClass} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className={iconClass} />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className={iconClass} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className={iconClass} />
        </ToolbarButton>
        <ToolbarDivider />
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={`Text colour ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor(c).run()}
              className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-125"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className={iconClass} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className={iconClass} />
        </ToolbarButton>
        <span className="ml-auto" />
        <ToolbarButton title="View/edit raw HTML" active={showSource} onClick={toggleSource}>
          <Code className={iconClass} />
        </ToolbarButton>
      </div>
      {showSource ? (
        <textarea
          value={sourceDraft}
          onChange={(e) => setSourceDraft(e.target.value)}
          rows={6}
          className="min-h-[120px] w-full rounded-b-lg border border-t-0 border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
        />
      ) : (
        <EditorContent editor={editor} placeholder={placeholder} />
      )}
    </div>
  );
}
