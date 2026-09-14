import type { Metadata } from "next";
import type { ReactElement } from "react";
import { RoomScreen } from "@/components/game/RoomScreen";

export async function generateMetadata({ params }: PageProps<"/room/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Hall ${code.toUpperCase()}, Leetposter` };
}

/** The whole game lives in the client screen; this page only unwraps the hall code. */
export default async function RoomPage({ params }: PageProps<"/room/[code]">): Promise<ReactElement> {
  const { code } = await params;
  return <RoomScreen code={code.toUpperCase()} />;
}
