"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";

export const MAX_QUESTION_LENGTH = 4000;

export function ChatComposer({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = "Ask anything about this repository…",
}: {
  onSend: (question: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tooLong = value.length > MAX_QUESTION_LENGTH;
  const canSend = !streaming && !disabled && value.trim().length > 0 && !tooLong;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <InputGroup className="rounded-xl bg-background shadow-xs">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Your question"
          aria-invalid={tooLong || undefined}
          rows={1}
          className="max-h-48 min-h-11 px-3.5 py-3"
          autoFocus
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <span className={tooLong ? "text-[11px] text-destructive" : "text-[11px] text-muted-foreground"}>
            {tooLong
              ? `${value.length} / ${MAX_QUESTION_LENGTH} characters`
              : "Enter to send · Shift+Enter for a new line"}
          </span>
          {streaming ? (
            <InputGroupButton
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onStop}
              aria-label="Stop generating"
              className="rounded-full"
            >
              <Square className="size-3 fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              disabled={!canSend}
              aria-label="Send question"
              className="rounded-full"
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
