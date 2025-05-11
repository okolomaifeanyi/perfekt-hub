import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EmojiData {
  // Define the structure of the emoji data here
  [key: string]: string | number | boolean | null | undefined; // Replace with specific types as needed
}

let emojiDataPromise: Promise<EmojiData> | null = null;

export function loadEmojiData() {
  if (!emojiDataPromise) {
    emojiDataPromise = fetch(
      "https://cdn.jsdelivr.net/npm/@emoji-mart/data"
    ).then(res => res.json());
  }
  return emojiDataPromise;
}
