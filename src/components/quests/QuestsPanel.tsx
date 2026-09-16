"use client";

import { useEffect, useState, type ReactElement } from "react";
import { claimQuest, errorMessage, fetchQuests, type QuestProgress, type QuestsPage } from "@/client/api";
import { economyChanged } from "@/client/theme";
import { Candles } from "@/components/store/CandleMark";
import { Button, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { QUEST_POOL, type Quest } from "@/economy/quests";
import "./quests.css";

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: QuestsPage };

/** Today's three and this week's three, with what each has counted so far. */
export function QuestsPanel({ token }: { token: string }): ReactElement {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchQuests(token)
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

  if (loaded.status === "loading") return <p className="muted">Reading the quests.</p>;
  if (loaded.status === "error") return <Notice kind="error">{loaded.message}</Notice>;

  const claim = (questId: string): void => {
    setBusy(questId);
    setFailed(null);
    void claimQuest(token, questId)
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

  return (
    <div className="quests">
      {failed === null ? null : <Notice kind="error">{failed}</Notice>}
      <Cadence name="Today" rows={loaded.page.daily} busy={busy} onClaim={claim} />
      <Cadence name="This week" rows={loaded.page.weekly} busy={busy} onClaim={claim} />
    </div>
  );
}

interface CadenceProps {
  name: string;
  rows: QuestProgress[];
  busy: string | null;
  onClaim: (questId: string) => void;
}

function Cadence({ name, rows, busy, onClaim }: CadenceProps): ReactElement {
  // A quest id the pool no longer holds is a dropped quest, not an error: it leaves the list quietly.
  const quests = rows.flatMap((row) => {
    const quest = QUEST_POOL.find((q) => q.id === row.id);
    return quest === undefined ? [] : [{ row, quest }];
  });
  return (
    <section className="quest-set" aria-labelledby={`quests-${name.replace(/\s/g, "-")}`}>
      <h3 id={`quests-${name.replace(/\s/g, "-")}`} className="quest-head">
        {name}
      </h3>
      {quests.length === 0 ? (
        <p className="muted">Nothing drawn. The board is written fresh each day.</p>
      ) : (
        <ul className="quest-list" aria-label={`${name}, quests`}>
          {quests.map(({ row, quest }) => (
            <QuestRow key={quest.id} quest={quest} row={row} busy={busy === quest.id} onClaim={() => { onClaim(quest.id); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

interface QuestRowProps {
  quest: Quest;
  row: QuestProgress;
  busy: boolean;
  onClaim: () => void;
}

function QuestRow({ quest, row, busy, onClaim }: QuestRowProps): ReactElement {
  const have = Math.min(row.progress, quest.goal);
  const full = row.progress >= quest.goal;
  return (
    <li className={cx("quest", row.claimed && "quest-claimed")}>
      <div className="quest-words">
        <h4 className="quest-name">{quest.name}</h4>
        <p className="muted">{quest.description}</p>
      </div>
      <p className="quest-pay">
        {String(quest.xp)} XP
        <Candles n={quest.candles} />
      </p>
      <div className="quest-bar">
        <progress className="bar" value={have} max={quest.goal} aria-label={`${quest.name}, progress`}>
          {String(have)} of {String(quest.goal)}
        </progress>
        <p className="quest-count tabular muted">
          {String(have)} of {String(quest.goal)}
        </p>
      </div>
      <div className="quest-act">
        {row.claimed ? (
          <p className="quest-word">Claimed</p>
        ) : full ? (
          <Button variant="primary" loading={busy} onClick={onClaim}>
            Claim
          </Button>
        ) : (
          <p className="quest-word muted">Not yet</p>
        )}
      </div>
    </li>
  );
}
