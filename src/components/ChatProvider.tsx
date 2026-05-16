"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CarbonChat } from "./CarbonChat";
import { track } from "@/lib/analytics";

type ChatContextValue = {
  open: (initialMessage?: string) => void;
  close: () => void;
  isOpen: boolean;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    // Safe default for server-side accessors and stories.
    return {
      open: () => undefined,
      close: () => undefined,
      isOpen: false,
    };
  }
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initial, setInitial] = useState<string | null>(null);

  const open = useCallback((initialMessage?: string) => {
    setInitial(initialMessage ?? null);
    setIsOpen(true);
    track("cs_chat_opened", { hasInitial: Boolean(initialMessage) });
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ChatContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CarbonChat
        open={isOpen}
        onClose={close}
        initialMessage={initial}
        onClearInitial={() => setInitial(null)}
      />
    </ChatContext.Provider>
  );
}
