"use client";

import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { Sparkles, MessageSquare, X, Send, Bot, ChefHat, Plus, Check } from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { MENU_ITEMS } from "@/lib/data/menu";
import { formatPKR } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  suggestedItems?: {
    id: string;
    name: string;
    price: number;
    sizeName?: string;
  }[];
}

const QUICK_PROMPTS = [
  "Spicy deal for 3 people?",
  "Tell me about Meltzilla Monster",
  "Budget combo under Rs. 2,000",
  "Best burger with fries?",
];

export default function DChefBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "bot",
      text: "Salam! 👋 Main D-Chef hoon, Pizzeria D Café ka AI assistant. Roman Urdu ya English mein poochhein — main deals aur best combos recommend kar sakta hoon!",
      suggestedItems: [
        { id: "ec-meltzilla-monster", name: "Meltzilla Monster (10\")", price: 2699 },
        { id: "hs-my-crust", name: "My Crust Crown Shape", price: 1299, sizeName: "Medium (10\")" },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/d-chef", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.reply || "Aap hamari menu zaroor explore karein!",
        suggestedItems: data.suggestedItems || [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: "Maaf kijiye ga, network issue aya. Hamara hotline 0308-4382003 bhi 24/7 active hai!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (sItem: { id: string; name: string; price: number; sizeName?: string }) => {
    const found = MENU_ITEMS.find((m) => m.id === sItem.id);
    const variant = found?.variants?.find((v) => v.sizeName.toLowerCase().includes(sItem.sizeName?.toLowerCase() || "medium")) || found?.variants?.[0];

    cartStore.addItem({
      menuItemId: found?.id || sItem.id,
      name: sItem.name,
      variant,
      unitPrice: sItem.price,
      quantity: 1,
    });

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85, x: 0.85 },
        colors: ["#f59e0b", "#ef4444", "#ffffff"],
      });
    } catch {}

    setAddedItemIds((prev) => ({ ...prev, [sItem.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [sItem.id]: false }));
    }, 2000);
  };

  return (
    <>
      {/* Floating launcher trigger with lively pulse */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-red-600 p-3.5 sm:px-5 sm:py-3.5 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group animate-pulse-glow"
          aria-label="Ask D-Chef AI"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 group-hover:rotate-12 transition-transform">
            <ChefHat className="h-4 w-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="hidden sm:inline">Ask D-Chef AI</span>
          <span className="rounded-full bg-black/85 px-2 py-0.5 text-[10px] text-amber-300 font-bold border border-amber-400/30 animate-badge-pop">
            Roman Urdu + EN
          </span>
        </button>
      )}

      {/* Slide-up Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-[540px] w-[92vw] sm:w-[400px] flex-col rounded-3xl border border-slate-700 bg-[#0f1725]/95 shadow-2xl shadow-black/80 backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#141e30] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-black shadow-md">
                <ChefHat className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-white text-sm">D-Chef AI Concierge</h4>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Pizzeria D Café Food Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-[#111827] px-3 py-2 scrollbar-none border-b border-slate-800/80">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:border-amber-400 hover:text-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10"
                      : "bg-[#182337] text-slate-200 border border-slate-800 rounded-tl-none"
                  }`}
                >
                  <p>{m.text}</p>
                </div>

                {/* Suggested Action Cards (Add to Cart) */}
                {m.suggestedItems && m.suggestedItems.length > 0 && (
                  <div className="mt-2 w-full max-w-[90%] space-y-1.5">
                    {m.suggestedItems.map((sItem) => {
                      const isAdded = addedItemIds[sItem.id];
                      return (
                        <div
                          key={sItem.id}
                          className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/90 p-2 text-xs hover:border-amber-500/40 transition-colors"
                        >
                          <div>
                            <div className="font-bold text-white text-[11px]">{sItem.name}</div>
                            <div className="font-mono text-amber-400 text-[11px] font-semibold">
                              {formatPKR(sItem.price)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(sItem)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                              isAdded
                                ? "bg-emerald-500 text-black scale-95"
                                : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-105 active:scale-95"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>Added!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 stroke-[3]" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#182337] p-3 text-slate-400 border border-slate-800 w-fit animate-pulse">
                <ChefHat className="h-4 w-4 animate-bounce text-amber-400" />
                <span className="text-xs">D-Chef is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="border-t border-slate-800 bg-[#121a29] p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in Roman Urdu or English..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
