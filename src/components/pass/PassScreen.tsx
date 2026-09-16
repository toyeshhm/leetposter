"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { claimTier, errorMessage, fetchPass, passCheckout, type PassPage } from "@/client/api";
import { useSession } from "@/client/session";
import { economyChanged } from "@/client/theme";
import { QuestsPanel } from "@/components/quests/QuestsPanel";
import { Candles } from "@/components/store/CandleMark";
import { findItem, ItemFace } from "@/components/store/Cosmetic";
import { Button, Divider, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { SEASONS, type Reward, type Season } from "@/economy/seasons";
import "./pass.css";

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: PassPage };

const day = (iso: string): string => new Date(iso).toLocaleDateString([], { month: "long", day: "numeric" });

/** The season, both tracks, and what is claimable. */
export function PassScreen(): ReactElement {
  const session = useSession();
  const token = session.accessToken;
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [busy, setBusy] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (token === null) return;
    let live = true;
    fetchPass(token)
      .then((page) => {
        if (live) setLoaded({ status: "ready", page });
      })
      .catch((error: unknown) => {
        if (live) setLoaded({ status: "error", message: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [token]);

  if (session.status === "loading") return <p className="muted">Reading the season.</p>;
  if (session.status !== "in" || token === null) {
    return (
      <Notice>
        The pass is kept for those who sign in and choose a name. <Link href="/account">Sign in or sign up</Link> and the season counts your work.
      </Notice>
    );
  }
  if (loaded.status === "loading") return <p className="muted">Reading the season.</p>;
  if (loaded.status === "error") return <Notice kind="error">{loaded.message}</Notice>;

  const { page } = loaded;
  const running = SEASONS.find((s) => s.id === page.seasonId) ?? null;
  // Between seasons the next one is still worth showing: the track is the same, nothing is claimable yet.
  const season = running ?? SEASONS.find((s) => s.startsAt > new Date().toISOString()) ?? null;
  const claimed = new Set(page.claimed);

  const claim = (tier: number): void => {
    setBusy(tier);
    setFailed(null);
    void claimTier(token, tier)
      .then((next) => {
        setLoaded({ status: "ready", page: next });
        economyChanged();
      })
      .catch((error: unknown) => {
        setFailed(errorMessage(error));
      })
      .finally(() => {
        setBusy(null);
      });
  };

  const checkout = (): void => {
    setBuying(true);
    setFailed(null);
    void passCheckout(token)
      .then(({ url }) => {
        window.location.assign(url);
      })
      .catch((error: unknown) => {
        setFailed(errorMessage(error));
        setBuying(false);
      });
  };

  return (
    <div className="pass">
      <h1>{season === null ? "The pass" : season.name}</h1>
      {season === null ? (
        <p className="muted">No season is seeded past this one. The quests below still run.</p>
      ) : (
        <p className="pass-dates">
          {day(season.startsAt)} to {day(new Date(Date.parse(season.endsAt) - 1).toISOString())}
          {running === null ? ". Not open yet." : "."}
        </p>
      )}
      {failed === null ? null : <Notice kind="error">{failed}</Notice>}

      {season === null ? null : (
        <>
          <Progress season={season} xp={page.xp} />
          <p className="pass-legend muted">
            Free track above the rule, paid track below. {page.paid ? "The paid track is yours." : "The paid track is sealed until the pass is bought."}
          </p>
          {page.paid ? null : (
            <p className="pass-buy">
              <Button variant="primary" loading={buying} onClick={checkout}>
                Get the paid pass
              </Button>
            </p>
          )}
          <Track season={season} page={page} claimed={claimed} live={running !== null} busy={busy} onClaim={claim} />
        </>
      )}

      <Divider>Quests</Divider>
      <QuestsPanel token={token} />
    </div>
  );
}

/** How far into the season you are: the XP held, the tier reached, and what the next one costs. */
function Progress({ season, xp }: { season: Season; xp: number }): ReactElement {
  const reached = season.tiers.filter((t) => xp >= t.xp).length;
  const next = season.tiers.find((t) => xp < t.xp) ?? null;
  const floor = season.tiers[reached - 1]?.xp ?? 0;
  const span = next === null ? 1 : next.xp - floor;
  return (
    <div className="pass-progress">
      <p className="pass-xp-line tabular">
        <strong>
          Tier {String(reached)} of {String(season.tiers.length)}
        </strong>
        <span className="muted">
          {String(xp)} XP{next === null ? ". The season is walked to its end." : `, ${String(next.xp - xp)} to tier ${String(next.tier)}.`}
        </span>
      </p>
      <progress className="bar" value={xp - floor} max={span}>
        {String(xp)} XP
      </progress>
    </div>
  );
}

interface TrackProps {
  season: Season;
  page: PassPage;
  claimed: Set<number>;
  live: boolean;
  busy: number | null;
  onClaim: (tier: number) => void;
}

/** Thirty tiers, scrolled sideways. Free above the rule, paid below, the claimable ones lit. */
function Track({ season, page, claimed, live, busy, onClaim }: TrackProps): ReactElement {
  return (
    <div className="pass-scroll" tabIndex={0} role="group" aria-label="The tier track">
      <ol className="pass-track">
        {season.tiers.map((tier) => {
          const done = claimed.has(tier.tier);
          const open = live && page.xp >= tier.xp && !done;
          return (
            <li key={tier.tier} className={cx("pass-tier", open && "pass-tier-open", done && "pass-tier-done")}>
              <Slot reward={tier.free} track="Free" locked={false} />
              <p className="pass-n tabular">
                <span className="sr-only">Tier </span>
                {String(tier.tier)}
              </p>
              <p className="pass-cost tabular muted">{String(tier.xp)} XP</p>
              <Slot reward={tier.paid} track="Paid" locked={!page.paid} />
              <div className="pass-claim">
                {done ? (
                  <p className="pass-word">Claimed</p>
                ) : open ? (
                  <Button variant="primary" loading={busy === tier.tier} onClick={() => { onClaim(tier.tier); }}>
                    Claim
                  </Button>
                ) : (
                  <p className="pass-word muted">Locked</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One reward on one track: an item with its drawing, or candles. */
function Slot({ reward, track, locked }: { reward: Reward; track: string; locked: boolean }): ReactElement {
  return (
    <div className={cx("pass-slot", locked && "pass-slot-locked")}>
      <span className="sr-only">{locked ? `${track}, sealed: ` : `${track}: `}</span>
      <RewardBody reward={reward} />
    </div>
  );
}

function RewardBody({ reward }: { reward: Reward }): ReactElement {
  if (reward === null) return <span className="muted">nothing</span>;
  if ("candles" in reward) return <Candles n={reward.candles} />;
  const item = findItem(reward.item);
  // An id the catalog has dropped still names itself rather than leaving a hole in the track.
  if (item === undefined) return <span className="muted">{reward.item}</span>;
  return (
    <>
      <ItemFace item={item} size={40} />
      <span className="pass-item">{item.name}</span>
    </>
  );
}
