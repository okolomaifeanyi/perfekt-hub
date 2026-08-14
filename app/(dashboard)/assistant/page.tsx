import type { Metadata } from "next";
import { AssistantChatClient } from "./AssistantChatClient";

export const metadata: Metadata = {
  title: "Nwanne - Perfekthub",
};

export default function AssistantPage() {
  return <AssistantChatClient />;
}
