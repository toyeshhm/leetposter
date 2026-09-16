import type { Metadata } from "next";
import type { ReactElement } from "react";
import { WatchScreen } from "@/components/spectate/WatchScreen";

export async function generateMetadata({ params }: PageProps<"/room/[code]/watch">): Promise<Metadata> {
  const { code } = await params;
  const hall = code.toUpperCase();
  return { title: `Watching hall ${hall}`, description: `Hall ${hall}, every seat at once. Watch, do not act.` };
}

/** The spectator's chair; the client screen polls the spectate route. */
export default async function WatchPage({ params }: PageProps<"/room/[code]/watch">): Promise<ReactElement> {
  const { code } = await params;
  return <WatchScreen code={code.toUpperCase()} />;
}
