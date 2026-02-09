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

// FontSize Extension 직접 생성
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
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
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
    } as any;
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

export default function TipTapEditor({ content, onChange, onSave, saving, onLoadDefault, loadingDefault }: TipTapEditorProps) {
  const [currentColor, setCurrentColor] = useState("#000000");
  const articleCounterRef = useRef(1);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
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
        class: "prose max-w-none min-h-[500px] p-4 focus:outline-none",
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
    
    editor.chain().focus().toggleBold().run();
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
                  editor.isActive("bold")
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="굵게"
              >
                B
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md italic text-base transition-all ${
                  editor.isActive("italic")
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="기울임"
              >
                I
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md underline text-base transition-all ${
                  editor.isActive("underline")
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="밑줄"
              >
                U
              </button>
            </div>

            {/* 글씨 색상 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <label 
                className="w-9 h-9 rounded-lg cursor-pointer border-2 border-gray-300 overflow-hidden block"
                title="글씨 색상"
              >
                <input
                  type="color"
                  onChange={(e) => {
                    const color = e.target.value;
                    setCurrentColor(color);
                    editor.chain().focus().setColor(color).run();
                  }}
                  value={currentColor}
                  className="w-full h-full cursor-pointer block"
                  style={{ 
                    border: "none", 
                    padding: 0, 
                    margin: 0,
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none"
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setCurrentColor("#000000");
                  editor.chain().focus().unsetColor().run();
                }}
                className="px-2 h-9 rounded-md text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                type="button"
                title="색상 초기화"
              >
                초기화
              </button>
            </div>

            {/* 글씨 크기 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <select
                onChange={(e) => setFontSize(e.target.value)}
                className="h-9 px-2 rounded-md text-xs font-semibold bg-white hover:bg-gray-50 border border-gray-300 cursor-pointer"
                defaultValue="12px"
              >
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="22px">22px</option>
                <option value="24px">24px</option>
              </select>
            </div>

            {/* 정렬 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all ${
                  editor.isActive({ textAlign: "left" })
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="왼쪽 정렬"
              >
                ←
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all ${
                  editor.isActive({ textAlign: "center" })
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="가운데 정렬"
              >
                ↔
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className={`w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all ${
                  editor.isActive({ textAlign: "right" })
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="오른쪽 정렬"
              >
                →
              </button>
            </div>

            {/* 목록 */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={insertArticleText}
                className="px-3 h-9 flex items-center justify-center rounded-md text-sm font-semibold hover:bg-gray-100 text-gray-700 transition-all"
                type="button"
                title="조항 삽입"
              >
                【제 조】
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-3 h-9 flex items-center justify-center rounded-md text-sm font-semibold transition-all ${
                  editor.isActive("orderedList")
                    ? "bg-blue-500 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                type="button"
                title="원문자 목록"
              >
                ① 목록
              </button>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex items-center gap-2">
            {onLoadDefault && (
              <button
                onClick={onLoadDefault}
                disabled={loadingDefault}
                className="rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {loadingDefault ? "불러오는 중..." : "기본템플릿 불러오기"}
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 에디터 */}
      <div className="bg-white">
        <style jsx global>{`
          .ProseMirror {
            padding: 1.5rem;
            min-height: 500px;
            outline: none;
            font-size: 15px;
            line-height: 1.0;
          }
          .ProseMirror p {
            margin: 0.3rem 0;
          }
          .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 0.3rem 0;
            list-style: none;
            counter-reset: item;
          }
          .ProseMirror ol li {
            margin: 0.15rem 0;
            padding-left: 0.1rem;
            counter-increment: item;
            position: relative;
          }
          .ProseMirror ol li::before {
            content: "①";
            font-weight: 600;
            color: #1f2937;
            position: absolute;
            left: -1.1rem;
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
          
          /* 색상 피커 스타일 강제 적용 */
          input[type="color"] {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            width: 100%;
            height: 100%;
            border: none;
            padding: 0;
            margin: 0;
            cursor: pointer;
          }
          input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
          }
          input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 4px;
          }
          input[type="color"]::-moz-color-swatch {
            border: none;
            border-radius: 4px;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}