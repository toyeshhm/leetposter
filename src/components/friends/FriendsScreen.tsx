"use client";
import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import {
  acceptFriend,
  errorMessage,
  fetchFriends,
  removeFriend,
  requestFriend,
} from "@/client/api";
import { useSession } from "@/client/session";
import { Button, Field, Frame, Notice } from "@/components/ui";
import type { FriendHall, FriendsPage } from "@/server/friends";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const DAY_MS = 86_400_000;
const days = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "today", "yesterday", "3 days ago": whole days, which is as fine as a ledger needs. */
function whenPlayed(iso: string, now: number): string {
  return days.format(-Math.floor((now - Date.parse(iso)) / DAY_MS), "day");
}

function hallLine(hall: FriendHall, now: number): string {
  return `${hall.username} played hall ${hall.code} ${whenPlayed(hall.playedAt, now)}, ${hall.wasImposter ? "the Changeling" : "crew"}, ${hall.won ? "won" : "lost"}.`;
}

/** One friend row: the name and a two-step Remove that never leaves the line. */
function FriendRow({
  username,
  busy,
  onRemove,
}: {
  username: string;
  busy: boolean;
  onRemove: () => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="friends-row">
      <span className="friends-name">@{username}</span>
      {confirming ? (
        <span className="friends-confirm">
          <span>Remove?</span>
          <Button variant="secondary" onClick={onRemove} loading={busy}>
            Yes, remove
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirming(false);
            }}
            disabled={busy}
          >
            Keep
          </Button>
        </span>
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            setConfirming(true);
          }}
          disabled={busy}
        >
          Remove
        </Button>
      )}
    </li>
  );
}

function Lists({
  token,
  initial,
}: {
  token: string;
  initial: FriendsPage;
}): ReactElement {
  const [page, setPage] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fixed at mount: the list arrives after hydration, and a day's granularity does not drift while the page is open.
  const [now] = useState(() => Date.now());

  /** Run one call and replace the page with its answer; the failure text stays until the next call. */
  const run = (work: () => Promise<FriendsPage>): void => {
    setBusy(true);
    setError(null);
    work()
      .then(setPage)
      .catch((failure: unknown) => {
        setError(errorMessage(failure));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <>
      <Frame title="Add a friend">
        <form
          className="friends-add"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const next = await requestFriend(token, name);
              setName("");
              return next;
            });
          }}
        >
          <Field
            label="Their username"
            name="username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            value={name}
            onChange={(e) => {
              setName(e.target.value.toLowerCase());
            }}
            disabled={busy}
          />
          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!USERNAME_RE.test(name)}
          >
            Send the request
          </Button>
        </form>
        {error === null ? null : <Notice kind="error">{error}</Notice>}
      </Frame>

      {page.incoming.length === 0 && page.outgoing.length === 0 ? null : (
        <Frame title="Requests">
          {page.incoming.length === 0 ? null : (
            <ul className="friends-list" aria-label="Requests waiting on you">
              {page.incoming.map((r) => (
                <li key={r.username} className="friends-row">
                  <span className="friends-name">
                    @{r.username} asks to be your friend.
                  </span>
                  <span className="friends-confirm">
                    <Button
                      variant="primary"
                      loading={busy}
                      onClick={() => {
                        run(() => acceptFriend(token, r.username));
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        run(() => removeFriend(token, r.username));
                      }}
                    >
                      Decline
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {page.outgoing.length === 0 ? null : (
            <ul className="friends-list" aria-label="Requests you sent">
              {page.outgoing.map((r) => (
                <li key={r.username} className="friends-row">
                  <span className="friends-name muted">
                    @{r.username} has not answered yet.
                  </span>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      run(() => removeFriend(token, r.username));
                    }}
                  >
                    Withdraw
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Frame>
      )}

      <Frame title="Friends">
        {page.friends.length === 0 ? (
          <p className="muted">No one yet. Ask by username above.</p>
        ) : (
          <ul className="friends-list" aria-label="Your friends">
            {page.friends.map((f) => (
              <FriendRow
                key={f.username}
                username={f.username}
                busy={busy}
                onRemove={() => {
                  run(() => removeFriend(token, f.username));
                }}
              />
            ))}
          </ul>
        )}
      </Frame>

      <Frame title="Recent halls">
        {page.recent.length === 0 ? (
          <p className="muted">
            Nothing on the record yet. When a friend finishes a hall while
            signed in, it shows here.
          </p>
        ) : (
          <ul className="friends-list" aria-label="Recent halls">
            {page.recent.map((hall) => (
              <li key={`${hall.username}-${hall.code}`}>
                {hallLine(hall, now)}
              </li>
            ))}
          </ul>
        )}
      </Frame>
    </>
  );
}

/** /friends: requests, the list, and what your friends have been playing. Needs a signed-in session. */
export function FriendsScreen(): ReactElement {
  const session = useSession();
  const token = session.accessToken;
  const [initial, setInitial] = useState<FriendsPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token === null) return;
    let live = true;
    fetchFriends(token)
      .then((page) => {
        if (live) setInitial(page);
      })
      .catch((failure: unknown) => {
        if (live) setError(errorMessage(failure));
      });
    return () => {
      live = false;
    };
  }, [token]);

  if (session.status === "loading")
    return <p className="muted">Looking for your seat…</p>;
  if (token === null || session.username === null) {
    return (
      <Notice>
        Friends are kept on your account.{" "}
        <Link href="/account">Sign in or sign up</Link> to ask someone.
      </Notice>
    );
  }
  if (error !== null) return <Notice kind="error">{error}</Notice>;
  if (initial === null) return <p className="muted">Fetching the list…</p>;
  return <Lists token={token} initial={initial} />;
}
