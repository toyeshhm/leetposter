import type { ReactElement } from "react";
import type { Loadout } from "@/client/api";
import { useEconomy } from "@/client/theme";
import { BadgeMark, Portrait, TitleLine } from "@/components/store/Cosmetic";
import { Badge } from "@/components/ui";
import type { EquippedLook, PlayerView, PublicPlayer } from "@/game/types";

/**
 * What a player wears in this hall. Everyone else wears what they sat down in, which is what the
 * view carries; your own row wears what you have equipped now, so changing it on /me shows here
 * without taking a new seat.
 */
export function lookOf(view: PlayerView, player: PublicPlayer, mine: Loadout | null): EquippedLook | null {
  if (player.id !== view.me.id || mine === null) return player.look;
  return { avatar: mine.avatar, frame: mine.frame, title: mine.title, badge: mine.badge };
}

/** Who sits where, and what they wear. States are words, never colors. */
export function Roster({ view }: { view: PlayerView }): ReactElement {
  const voted = new Set(view.activeVote?.votedIds ?? []);
  const mine = useEconomy().page?.loadout ?? null;
  return (
    <section className="roster" aria-labelledby="roster-title">
      <h2 id="roster-title" className="section-title">
        At the table
      </h2>
      <ul className="roster-list">
        {view.players.map((p) => {
          const look = lookOf(view, p, mine);
          return (
            <li key={p.id} className="roster-row" data-ejected={p.ejected}>
              <Portrait look={look} size={32} />
              <span className="roster-who">
                <span className="roster-name">{p.name}</span>
                <TitleLine look={look} />
              </span>
              <BadgeMark look={look} size={20} />
              {p.username === null ? null : <span className="roster-note">as @{p.username}</span>}
              {p.id === view.me.id ? <span className="roster-note">you</span> : null}
              {p.isHost ? <span className="roster-note">host</span> : null}
              {p.seats.map((seat) => (
                <Badge key={seat} seat={seat} />
              ))}
              {p.isImposter === true ? <span className="roster-word">Changeling</span> : null}
              {p.ejected ? <span className="roster-note">cast out</span> : null}
              {!p.ejected && p.freezeUsed ? <span className="roster-note">bell rung</span> : null}
              {voted.has(p.id) ? <span className="roster-note">voted</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
