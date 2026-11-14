"use client";

import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Newspaper,
  Pilcrow,
  Quote,
  Redo2,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import type { FormatState } from "./helpers";

interface ToolButtonProps {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}

function ToolButton({ label, children, onClick, active }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active
          ? "bg-emerald-100 text-emerald-800"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" aria-hidden />;
}

interface BlogEditorToolbarProps {
  formatState: FormatState;
  applyCommand: (command: string, value?: string) => void;
  onAddImage: () => void;
  onAddEmbed: () => void;
  onAddLink: () => void;
  onAddLinkCard: () => void;
}

export default function BlogEditorToolbar({
  formatState,
  applyCommand,
  onAddImage,
  onAddEmbed,
  onAddLink,
  onAddLinkCard,
}: BlogEditorToolbarProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-y border-gray-200 bg-white/95 px-2 py-2 backdrop-blur sm:px-3">
      <ToolButton
        label="Bold"
        active={formatState.bold}
        onClick={() => applyCommand("bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={formatState.italic}
        onClick={() => applyCommand("italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={formatState.underline}
        onClick={() => applyCommand("underline")}
      >
        <Underline className="h-4 w-4" />
      </ToolButton>

      <ToolbarDivider />

      <ToolButton
        label="Paragraph"
        active={!formatState.block || formatState.block === "p"}
        onClick={() => applyCommand("formatBlock", "p")}
      >
        <Pilcrow className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Heading 2"
        active={formatState.block === "h2"}
        onClick={() => applyCommand("formatBlock", "h2")}
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Heading 3"
        active={formatState.block === "h3"}
        onClick={() => applyCommand("formatBlock", "h3")}
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <ToolbarDivider />

      <ToolButton
        label="Bulleted list"
        active={formatState.bulletList}
        onClick={() => applyCommand("insertUnorderedList")}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={formatState.orderedList}
        onClick={() => applyCommand("insertOrderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Quote"
        active={formatState.quote}
        onClick={() => applyCommand("formatBlock", "blockquote")}
      >
        <Quote className="h-4 w-4" />
      </ToolButton>

      <ToolbarDivider />

      <ToolButton
        label="Align left"
        active={formatState.left}
        onClick={() => applyCommand("justifyLeft")}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Align centre"
        active={formatState.center}
        onClick={() => applyCommand("justifyCenter")}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Align right"
        active={formatState.right}
        onClick={() => applyCommand("justifyRight")}
      >
        <AlignRight className="h-4 w-4" />
      </ToolButton>

      <ToolbarDivider />

      <ToolButton label="Add link" onClick={onAddLink}>
        <Link2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Undo" onClick={() => applyCommand("undo")}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo" onClick={() => applyCommand("redo")}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <ToolbarDivider />

      <ToolButton label="Add image" onClick={onAddImage}>
        <ImagePlus className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Embed social post" onClick={onAddEmbed}>
        <Video className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Add link card" onClick={onAddLinkCard}>
        <Newspaper className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}
