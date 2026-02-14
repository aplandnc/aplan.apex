// apps/admin/src/components/TipTapEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import { useEffect, useState, useRef } from "react";

// FontSize 커맨드 타입 선언
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// FontSize Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes: Record<string, string | null>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  saving?: boolean;
  onLoadDefault?: () => void;
  loadingDefault?: boolean;
}

export default function TipTapEditor({ content, onChange, onSave, onLoadDefault, loadingDefault, saving }: TipTapEditorProps) {
  const [currentColor, setCurrentColor] = useState("#000000");
  const articleCounterRef = useRef(1);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        hardBreak: {},
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[500px] focus:outline-none",
        spellcheck: "false",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="p-4 text-gray-400">에디터 로딩 중...</div>;
  }

  const insertArticleText = () => {
    const articleText = `【제 ${articleCounterRef.current}조】 `;
    articleCounterRef.current += 1;
    
    if (editor.isActive("orderedList")) {
      editor.chain().focus().toggleOrderedList().run();
    }
    
    editor
      .chain()
      .focus()
      .insertContent(`<p><strong>${articleText}</strong></p>`)
      .run();
  };

  const setFontSize = (size: string) => {
    editor.chain().focus().setFontSize(size).run();
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-gray-300 transition-colors">
      {/* 툴바 */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* 텍스트 스타일 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md font-bold text-base transition-all ${
                  editor.isActive("bold") ? "bg-blue-500 text-white shadow-md" : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="굵게"
              >B</button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md underline text-base transition-all ${
                  editor.isActive("underline") ? "bg-blue-500 text-white shadow-md" : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="밑줄"
              >U</button>
            </div>

            {/* 글씨 색상 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <input
                type="color"
                onChange={(e) => {
                  const color = e.target.value;
                  setCurrentColor(color);
                  editor.chain().focus().setColor(color).run();
                }}
                value={currentColor}
                className="w-8 h-8 cursor-pointer rounded border-none"
              />
              <button
                onClick={() => {
                  setCurrentColor("#000000");
                  editor.chain().focus().unsetColor().run();
                }}
                className="px-2 h-8 rounded text-xs bg-gray-100 hover:bg-gray-200"
                type="button"
              >초기화</button>
            </div>

            {/* 글씨 크기 */}
            <select
              onChange={(e) => setFontSize(e.target.value)}
              className="h-9 px-2 rounded-lg border border-gray-200 text-sm"
              defaultValue="14px"
            >
              {["12px", "14px", "16px", "18px", "20px", "24px"].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            {/* 정렬 및 목록 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className="p-1.5 hover:bg-gray-100 rounded">←</button>
              <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className="p-1.5 hover:bg-gray-100 rounded">↔</button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-3 h-9 flex items-center justify-center rounded-md text-sm font-semibold transition-all ${
                  editor.isActive("orderedList") ? "bg-blue-500 text-white shadow-md" : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
              >① 목록</button>
              <button
                onClick={insertArticleText}
                className="px-3 h-9 flex items-center justify-center rounded-md text-sm font-semibold border hover:bg-gray-50 text-gray-700"
                type="button"
              >【제 조】</button>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex items-center gap-2">
            {onLoadDefault && (
              <button
                onClick={onLoadDefault}
                disabled={loadingDefault}
                className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-bold text-white hover:bg-gray-600 disabled:opacity-50"
                type="button"
              >
                {loadingDefault ? "로드 중..." : "기본템플릿"}
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                type="button"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 에디터 본문 스타일 (스태프 앱과 일치시킴) */}
      <div className="bg-white">
        <style jsx global>{`
          .ProseMirror {
            padding: 2rem;
            min-height: 500px;
            outline: none;
            line-height: 1.7;
            word-break: keep-all;
          }
          .ProseMirror p {
            margin-bottom: 0.6rem;
            min-height: 1.2em;
          }
          .ProseMirror ol {
            list-style: none !important;
            padding-left: 0.5rem !important;
            counter-reset: item;
          }
          .ProseMirror ol li {
            position: relative;
            padding-left: 1.5rem;
            margin-bottom: 0.4rem;
            counter-increment: item;
          }
          .ProseMirror ol li::before {
            position: absolute;
            left: 0;
            font-weight: 600;
            color: #1f2937;
          }
          .ProseMirror ol li:nth-child(1)::before { content: "①"; }
          .ProseMirror ol li:nth-child(2)::before { content: "②"; }
          .ProseMirror ol li:nth-child(3)::before { content: "③"; }
          .ProseMirror ol li:nth-child(4)::before { content: "④"; }
          .ProseMirror ol li:nth-child(5)::before { content: "⑤"; }
          .ProseMirror ol li:nth-child(6)::before { content: "⑥"; }
          .ProseMirror ol li:nth-child(7)::before { content: "⑦"; }
          .ProseMirror ol li:nth-child(8)::before { content: "⑧"; }
          .ProseMirror ol li:nth-child(9)::before { content: "⑨"; }
          .ProseMirror ol li:nth-child(10)::before { content: "⑩"; }
          
          .ProseMirror ul {
            list-style: disc;
            padding-left: 1.5rem;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}