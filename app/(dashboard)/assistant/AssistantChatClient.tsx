"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  clearAssistantConversation,
  getAssistantMessages,
  sendAssistantMessage,
  type AssistantMessage,
} from "@/app/actions/assistant";

function Bubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end mr-2" : "justify-start ml-2"}`}>
      <div
        className={`relative w-fit max-w-[80%] p-3 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap text-sm ${
          isUser ? "bg-primary! text-primary-foreground" : "bg-secondary"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function AssistantChatClient() {
  const [messages, setMessages] = useState<AssistantMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getAssistantMessages()
      .then(result => {
        if (active) setMessages(result);
      })
      .catch(err => {
        console.error("getAssistantMessages failed:", err);
        if (active) setMessages([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const optimisticUser: AssistantMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...(prev ?? []), optimisticUser]);
    setInput("");
    setSending(true);

    try {
      const reply = await sendAssistantMessage(trimmed);
      setMessages(prev => [...(prev ?? []), reply]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get a response");
      setMessages(prev => (prev ?? []).filter(m => m.id !== optimisticUser.id));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear this conversation? This can't be undone.")) return;
    const previous = messages;
    setMessages([]);
    try {
      await clearAssistantConversation();
    } catch (err) {
      setMessages(previous);
      toast.error(err instanceof Error ? err.message : "Failed to clear conversation");
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <h1 className="font-semibold">AI Assistant</h1>
        </div>
        {messages && messages.length > 0 && (
          <Button size="icon" variant="ghost" className="size-8" title="Clear conversation" onClick={handleClear}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 py-4">
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
            <Sparkles className="size-8" />
            <p className="text-sm">Ask me anything — I don&apos;t have access to your posts or messages.</p>
          </div>
        ) : (
          messages.map(message => <Bubble key={message.id} message={message} />)
        )}
        {sending && (
          <div className="flex justify-start ml-2">
            <div className="flex w-fit items-center gap-1 rounded-2xl bg-secondary p-3 shadow-sm">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message the assistant…"
          className="max-h-32 min-h-9 resize-none"
          disabled={sending}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              void handleSend();
            }
          }}
        />
        <Button size="icon" onClick={() => void handleSend()} disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
