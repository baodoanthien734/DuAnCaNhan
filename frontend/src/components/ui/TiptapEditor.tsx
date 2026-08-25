'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useTranslations } from 'next-intl';

type TiptapEditorProps = {
  content: string;
  onImageAdded: (file: File) => void | Promise<void>;
  onContentChange?: (html: string) => void;
};

const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-filename': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-filename'),
        renderHTML: (attributes) => {
          const filename = attributes['data-filename'];

          if (!filename) {
            return {};
          }

          return {
            'data-filename': filename,
          };
        },
      },
    };
  },
});

const toolbarButtonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file as base64 string'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read image file'));
    };

    reader.readAsDataURL(file);
  });
}

function stripBase64FromHtml(htmlString: string): string {
  if (!htmlString || !htmlString.includes('data:image/')) {
    return htmlString; // Tối ưu: Nếu không có base64 thì trả về luôn cho lẹ
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;

  const images = tempDiv.getElementsByTagName('img');
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (img.src && img.src.startsWith('data:image/')) {
      img.setAttribute('src', ''); // Bóc vỏ base64, để lại src rỗng
    }
  }

  return tempDiv.innerHTML;
}

export default function TiptapEditor({ content, onImageAdded, onContentChange }: TiptapEditorProps) {
  const t = useTranslations('editor');
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(!content || content === '<p></p>');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      EditorImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'my-4 h-auto max-w-full rounded-xl border border-slate-200',
        },
      }),
    ],
    content,
    onCreate: ({ editor }) => {
      setIsEditorEmpty(editor.isEmpty);
      const cleanHtml = stripBase64FromHtml(editor.getHTML());
      onContentChange?.(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      setIsEditorEmpty(editor.isEmpty);
      const cleanHtml = stripBase64FromHtml(editor.getHTML());
      onContentChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'tiptap-editor-content min-h-[280px] rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none',
      },
      handleDrop: (_view, event) => {
        const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile);

        if (imageFiles.length === 0) {
          return false;
        }

        event.preventDefault();
        void insertImages(imageFiles);
        return true;
      },
      handlePaste: (_view, event) => {
        const imageFiles = Array.from(event.clipboardData?.files ?? []).filter(isImageFile);

        if (imageFiles.length === 0) {
          return false;
        }

        event.preventDefault();
        void insertImages(imageFiles);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>', { emitUpdate: false });
      setIsEditorEmpty(editor.isEmpty);
      onContentChange?.(editor.getHTML());
    }
  }, [content, editor, onContentChange]);

  async function insertImages(files: File[]) {
    if (!editor) {
      return;
    }

    for (const file of files) {
      if (!isImageFile(file)) {
        continue;
      }

      // Convert the image file to a base64 string
      const base64String = await readFileAsBase64(file);

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: {
            src: base64String, // Use the base64 string as the image source and show the image immediately
            alt: file.name,
            title: file.name,
            'data-filename': file.name,
          },
        })
        .run();
      
      await onImageAdded(file); // put the image file into the form data so that it can be uploaded to the server later
    }
  }

  function handleToolbarUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    await insertImages(selectedFiles);
    event.target.value = '';
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-100 px-3 py-3">
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-pressed={editor.isActive('heading', { level: 2 })}
        >
          {t('heading_2')}
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-pressed={editor.isActive('heading', { level: 3 })}
        >
          {t('heading_3')}
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive('bold')}
        >
          {t('bold')}
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive('italic')}
        >
          {t('italic')}
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-pressed={editor.isActive('bulletList')}
        >
          {t('bullet_list')}
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={handleToolbarUploadClick}
        >
          {t('upload_image')}
        </button>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label={t('upload_image')}
        onChange={handleFileInputChange}
      />

      <div className="relative">
        {isEditorEmpty ? (
          <div className="pointer-events-none absolute left-4 top-3 z-10 text-sm text-slate-400">
            {t('placeholder')}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}