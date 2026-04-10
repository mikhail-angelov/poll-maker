import { useEffect, useRef } from 'preact/hooks';

interface MarkdownEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ label, value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-moss focus-within:border-transparent">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        className="w-full px-4 py-3 min-h-[200px] resize-none focus:outline-none"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  );
}