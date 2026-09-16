import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { z } from "zod";
import { useEconomy } from "@/client/theme";
import { supabaseBrowser } from "@/client/supabaseBrowser";
import { ChangelingMask, CrewEmblem, SEAT_TITLES } from "@/components/art";
import { Editor } from "@/components/editor/Editor";
import { BadgeMark, ItemFace, Portrait, TitleLine } from "@/components/store/Cosmetic";
import { Badge, Divider, Frame, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { CATALOG, type Item } from "@/economy/catalog";
import type { PlayerView, PublicPlayer, Seat } from "@/game/types";
import { outcomeWords } from "./copy";
import { SeatTruth } from "./RevealSeat";
import { lookOf } from "./Roster";
import { playerName } from "./select";
import "./reveal.css";

/** Unmasking: the outcome, the Changeling, every card against the truth, and how the votes fell. */
export function RevealScreen({ view }: { view: PlayerView }): ReactElement {
  const { page } = useEconomy();
  const mine = page?.loadout ?? null;
  const { reveal, outcome } = view;
  const { played, play } = useEmotes(view.code, view.me.id);
  if (reveal === null || outcome === null) return <Notice>The reveal is on its way.</Notice>;
  const crew = outcome.winner === "crew";
  const words = outcomeWords(outcome);
  const changelings = view.players.filter((p) => reveal.imposterIds.includes(p.id));
  return (
    <div className="reveal">
      <Frame className={cx("reveal-banner", !crew && "reveal-banner-bare")}>
        {crew ? <CrewEmblem size={96} title="The Crew" /> : null}
        <div>
          <h2 className="reveal-title">{words.title}</h2>
          <p className="reveal-reason">{words.reason}</p>
        </div>
      </Frame>

      <Divider>Unmasked</Divider>
      <section className="reveal-mask-body" aria-label="The Changeling">
        <ChangelingMask size={160} decorative />
        <div>
          {changelings.map((p) => (
            <div key={p.id}>
              <h2 className="reveal-title">{p.name}</h2>
              <TitleLine look={lookOf(view, p, mine)} />
              <p className="reveal-reason">
                was the Changeling{seatsHeld(view, p).length === 0 ? "" : `, seated as ${seatsHeld(view, p).map((s) => SEAT_TITLES[s]).join(" and ")}`}.
                {p.ejected ? " Cast out." : " Never cast out."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <EmoteBar owned={page?.owned ?? []} onPlay={play} />

      <Divider>The record, against the truth</Divider>
      <section className="reveal-seats" aria-label="Every seat, every card">
        {view.players.map((p) => {
          const isChangeling = reveal.imposterIds.includes(p.id);
          const cards = view.cards.filter((c) => c.playerId === p.id).sort((a, b) => a.at - b.at);
          const seats = seatsHeld(view, p);
          const look = lookOf(view, p, mine);
          const mark = played.get(p.id);
          return (
            <Frame key={p.id} title={p.name} className="reveal-player">
              <p className="reveal-player-head">
                <Portrait look={look} size={32} />
                {isChangeling ? <ChangelingMask size={24} decorative /> : null}
                <TitleLine look={look} />
                <BadgeMark look={look} size={20} />
                {seats.map((seat) => (
                  <Badge key={seat} seat={seat} />
                ))}
                <span className={cx("reveal-word", isChangeling ? "reveal-lie" : "reveal-true")}>{isChangeling ? "the Changeling" : "crew"}</span>
                {p.ejected ? <span className="muted">cast out</span> : null}
                {mark === undefined ? null : (
                  <span className="reveal-mark">
                    <ItemFace item={mark} size={28} />
                    <span className="sr-only">played {mark.name}</span>
                  </span>
                )}
              </p>
              {seats.length === 0 ? <p className="muted">Held no seat.</p> : null}
              {seats.map((seat) => (
                <SeatTruth key={seat} seat={seat} problem={reveal.problem} cards={cards.filter((c) => c.seat === seat)} />
              ))}
            </Frame>
          );
        })}
      </section>

      <Divider>The final code</Divider>
      <Editor view={view} />

      <Divider>The votes</Divider>
      <VoteHistory view={view} />

      <p className="reveal-again">
        <Link href="/" className="btn btn-primary">
          Play again
        </Link>
      </p>
    </div>
  );
}

/** Seats a player held at any point: their seats now, plus any seat they played a card from (the Herald seat moves on ejection). */
function seatsHeld(view: PlayerView, player: PublicPlayer): Seat[] {
  const truth = view.reveal?.players.find((p) => p.id === player.id)?.seats ?? [];
  const played = view.cards.filter((c) => c.playerId === player.id).map((c) => c.seat);
  return [...new Set([...truth, ...played])];
}

const emoteMessage = z.object({ playerId: z.string(), itemId: z.string() });

/** How long a played mark stands beside a name. Long enough to be seen on a shared screen, short enough to clear. */
const EMOTE_MS = 8000;

/**
 * Marks played at the unmasking, over one Supabase Realtime channel per hall, the same transport the
 * shared editor's carets use. Nothing is recorded: a mark is seen by whoever is on the reveal screen
 * and then it is gone. A channel that never joins simply means no marks travel.
 */
function useEmotes(code: string, meId: string): { played: ReadonlyMap<string, Item>; play: (item: Item) => void } {
  const [played, setPlayed] = useState<ReadonlyMap<string, Item>>(new Map());
  // A ref, not state: the channel is never rendered, and setting it in the effect would cascade a render.
  const channel = useRef<RealtimeChannel | null>(null);

  const show = useCallback((playerId: string, item: Item): void => {
    setPlayed((was) => new Map(was).set(playerId, item));
    setTimeout(() => {
      setPlayed((was) => {
        // Still the same mark: a second mark from the same player carries its own timer.
        if (was.get(playerId) !== item) return was;
        const next = new Map(was);
        next.delete(playerId);
        return next;
      });
    }, EMOTE_MS);
  }, []);

  useEffect(() => {
    const live = supabaseBrowser
      .channel(`emotes:${code}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "emote" }, ({ payload }) => {
        const message = emoteMessage.safeParse(payload);
        if (!message.success) return;
        const item = CATALOG.find((i) => i.kind === "emote" && i.id === message.data.itemId);
        if (item !== undefined) show(message.data.playerId, item);
      })
      .subscribe();
    channel.current = live;
    return () => {
      channel.current = null;
      void supabaseBrowser.removeChannel(live);
    };
  }, [code, show]);

  const play = (item: Item): void => {
    show(meId, item);
    const live = channel.current;
    if (live !== null) void live.send({ type: "broadcast", event: "emote", payload: { playerId: meId, itemId: item.id } });
  };
  return { played, play };
}

/** The marks you own, to play at the table. Owning none says where they come from rather than showing an empty row. */
function EmoteBar({ owned, onPlay }: { owned: string[]; onPlay: (item: Item) => void }): ReactElement {
  const mine = CATALOG.filter((item) => item.kind === "emote" && owned.includes(item.id));
  return (
    <section className="reveal-emotes" aria-labelledby="emotes-title">
      <h3 id="emotes-title" className="section-title">
        Play a mark
      </h3>
      {mine.length === 0 ? (
        <p className="muted">You hold no marks. The pass hands them out, one a season.</p>
      ) : (
        <ul className="reveal-emote-row">
          {mine.map((item) => (
            <li key={item.id}>
              <button type="button" className="emote-play" onClick={() => {
                  onPlay(item);
                }}>
                <ItemFace item={item} size={40} />
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VoteHistory({ view }: { view: PlayerView }): ReactElement {
  if (view.votes.length === 0) return <p className="muted">No tribunal was called, and the Reckoning never came.</p>;
  const numbered = view.votes.map((round, i) => ({ round, n: view.votes.slice(0, i + 1).filter((r) => r.kind === "freeze").length }));
  return (
    <ol className="reveal-votes">
      {numbered.map(({ round, n }) => {
        const title = round.kind === "final" ? "The Reckoning" : `Tribunal ${String(n)}, called by ${playerName(view, round.calledBy)}`;
        const result =
          round.result === null ? "Never resolved." : round.result.ejectedId === null ? "No one was cast out." : `${playerName(view, round.result.ejectedId)} was cast out.`;
        return (
          <li key={round.startedAt} className="reveal-vote">
            <h3 className="section-title">{title}</h3>
            <p>{result}</p>
            <ul className="reveal-ballots">
              {(round.votes ?? []).map((v) => (
                <li key={v.voterId}>
                  <span>{playerName(view, v.voterId)}</span>
                  <span className="muted">voted</span>
                  <span>{v.targetId === null ? "Skip" : playerName(view, v.targetId)}</span>
                </li>
              ))}
              {round.votes !== null && round.votes.length === 0 ? (
                <li>
                  <span className="muted">No ballots were cast.</span>
                </li>
              ) : null}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
