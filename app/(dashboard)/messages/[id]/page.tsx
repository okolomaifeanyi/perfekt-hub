import MessagePage from "@/components/inbox/MessagePage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MessagePage conversationId={id} />;
}
