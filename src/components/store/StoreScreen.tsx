"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { buyItem, equipItem, errorMessage, fetchStore, LOADOUT_SLOTS, type StorePage } from "@/client/api";
import { useSession } from "@/client/session";
import { economyChanged } from "@/client/theme";
import { Button, Divider, Notice } from "@/components/ui";
import { CATALOG, type Item } from "@/economy/catalog";
import type { ItemKind } from "@/server/supabase";
import { Candles } from "./CandleMark";
import { ItemFace } from "./Cosmetic";
import "./store.css";

/** The shelves, in the order the store lays them out. In-world names: nobody at the table says "emote". */
const KINDS: readonly { kind: ItemKind; name: string }[] = [
  { kind: "avatar", name: "Faces" },
  { kind: "frame", name: "Frames" },
  { kind: "title", name: "Titles" },
  { kind: "theme", name: "Themes" },
  { kind: "caret", name: "Carets" },
  { kind: "badge", name: "Badges" },
  { kind: "emote", name: "Marks" },
];

const SLOTS: readonly string[] = LOADOUT_SLOTS;

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: StorePage };

/** Everything for sale, everything you own, and one button per item. */
export function StoreScreen(): ReactElement {
  const session = useSession();
  const token = session.accessToken;
  const signedIn = session.status === "in";
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [only, setOnly] = useState<ItemKind | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "loading") return;
    let live = true;
    fetchStore(token)
      .then((page) => {
        if (live) setLoaded({ status: "ready", page });
      })
      .catch((error: unknown) => {
        if (live) setLoaded({ status: "error", message: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [token, session.status]);

  if (loaded.status === "loading") return <p className="muted">Opening the store.</p>;
  if (loaded.status === "error") return <Notice kind="error">{loaded.message}</Notice>;

  const { page } = loaded;
  const owned = new Set(page.owned);
  const equipped = new Set(page.loadout === null ? [] : Object.values(page.loadout).filter((id): id is string => id !== null));

  // A guest's token is null, so nothing below can be reached without one; the act functions take a string.
  const run = (id: string, work: (auth: string) => Promise<StorePage>): void => {
    if (token === null) return;
    setBusy(id);
    setFailed(null);
    void work(token)
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

  const shelves = KINDS.filter(({ kind }) => only === null || only === kind).map(({ kind, name }) => ({
    kind,
    name,
    // Everything with a price, plus anything you already hold: pass and achievement items land on the shelf too.
    items: CATALOG.filter((item) => item.kind === kind && (item.price !== null || owned.has(item.id))),
  }));
  const shown = shelves.filter((shelf) => shelf.items.length > 0);

  return (
    <div className="store">
      <h1>The store</h1>
      {page.candles === null ? (
        <Notice>
          The shelf is open to anyone; the wallet is not. <Link href="/account">Sign in or sign up</Link> to hold candles and buy what is on it.
        </Notice>
      ) : (
        <p className="store-wallet">
          You hold <Candles n={page.candles} />. Candles come from quests and the pass.
        </p>
      )}
      {failed === null ? null : <Notice kind="error">{failed}</Notice>}

      <div className="store-filters" role="group" aria-label="Filter by kind">
        <Button variant={only === null ? "primary" : "secondary"} aria-pressed={only === null} onClick={() => { setOnly(null); }}>
          Everything
        </Button>
        {KINDS.map(({ kind, name }) => (
          <Button key={kind} variant={only === kind ? "primary" : "secondary"} aria-pressed={only === kind} onClick={() => { setOnly(kind); }}>
            {name}
          </Button>
        ))}
      </div>

      {shown.length === 0 ? <p className="muted">Nothing on that shelf yet.</p> : null}
      {shown.map((shelf) => (
        <section key={shelf.kind} aria-labelledby={`shelf-${shelf.kind}`}>
          <Divider>
            <span id={`shelf-${shelf.kind}`}>{shelf.name}</span>
          </Divider>
          <ul className="store-grid" aria-label={shelf.name}>
            {shelf.items.map((item) => (
              <li key={item.id} className="store-item">
                <ItemFace item={item} size={64} />
                <h3 className="store-name">{item.name}</h3>
                <p className="store-rarity">{item.rarity}</p>
                <p className="store-text muted">{item.description}</p>
                {item.price === null ? null : (
                  <p className="store-price">
                    <Candles n={item.price} />
                  </p>
                )}
                <Action
                  item={item}
                  candles={page.candles}
                  owned={owned.has(item.id)}
                  equipped={equipped.has(item.id)}
                  signedIn={signedIn}
                  busy={busy === item.id}
                  onBuy={() => { run(item.id, (auth) => buyItem(auth, item.id)); }}
                  onEquip={() => { run(item.id, (auth) => equipItem(auth, slotFor(item.kind), item.id).then((loadout) => ({ ...page, loadout }))); }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Loadout slot names match item kinds one for one; `emote` has no slot, so it is never equipped. */
function slotFor(kind: ItemKind): (typeof LOADOUT_SLOTS)[number] {
  const slot = LOADOUT_SLOTS.find((s) => s === kind);
  if (slot === undefined) throw new Error(`no loadout slot for ${kind}`);
  return slot;
}

interface ActionProps {
  item: Item;
  candles: number | null;
  owned: boolean;
  equipped: boolean;
  signedIn: boolean;
  busy: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

/** One button, or one word. Buy, Owned, Equip, Equipped, or the reason you cannot. */
function Action({ item, candles, owned, equipped, signedIn, busy, onBuy, onEquip }: ActionProps): ReactElement | null {
  if (!signedIn) return null;
  if (equipped) return <p className="store-state">Equipped</p>;
  if (owned) {
    if (!SLOTS.includes(item.kind)) return <p className="store-state">Owned</p>;
    return (
      <Button loading={busy} onClick={onEquip}>
        Equip
      </Button>
    );
  }
  if (item.price === null) return <p className="store-state muted">Not for sale</p>;
  const short = candles === null || candles < item.price;
  return (
    <>
      <Button variant="primary" loading={busy} disabled={short} onClick={onBuy}>
        Buy
      </Button>
      {short ? <p className="store-state muted">Not enough candles.</p> : null}
    </>
  );
}
