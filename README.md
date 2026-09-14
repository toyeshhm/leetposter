# Leetposter

A social-deduction party game for programmers. Four to eight friends on a voice call try to solve one hard algorithm problem together in 40 minutes. Each seat holds one channel of information about the problem. One of them is the Changeling, and lies.

The traitor role is still called the Changeling in-game. Never put "LeetCode" (the registered mark) in the product name; "Leet"-prefixed names are tolerated in practice but not guaranteed.

## The game

**Players.** 4 to 8. Everyone sees the problem statement and examples. Everyone types in a shared editor (external for now: any shared doc or editor the group already uses). Exactly one player is the Changeling.

**Seats.** Dealt secretly at start. Every player, including the Changeling, holds a seat. Seats are public (everyone knows who holds what); only the panel contents are private.

| Seat | In-world name | Sees | Plays |
|---|---|---|---|
| tagger | the Cartographer | the problem's topic tags | one "Declare tags" card: exactly N tags (N is public) |
| oracle | the Oracle | the hints, in order | "Reveal hint k" cards, in order, on request. The card carries the text the Oracle typed (prefilled with the true hint) and is checked against the true hint at the reveal |
| bounds | the Warden | the constraints block (input sizes, value ranges, time/memory limits) | "Declare bound" cards, any number |
| runner | the Herald | the problem title and URL; the only one who submits to the judge | "Submit": records Accepted or Rejected. Rejected requires a report card: error category + failing case |

Players 5 to 8 get duplicate seats in this order: second Oracle, second Cartographer, second Warden, third Oracle. Two holders of the same seat who disagree tell the crew one of them is lying.

**The Changeling** holds a normal seat and additionally sees every panel. They may lie on any card and on voice: a Changeling seated as Oracle can reveal a hint that reads nothing like the true one, since a hint card carries whatever text the Oracle typed and is only checked against the true hint at the reveal. The one thing never faked is the Accepted/Rejected verdict.

**Truth rule.** Cards are the official record and are shown next to the truth at the reveal. Crew must fill every card truthfully. Voice is free for everyone: speculate, hedge, be wrong. That is the honest players' cover.

**Timeline.**
1. Lobby: host pastes the problem (title, URL, statement, examples, tags, hints, constraints) and starts.
2. Reading (5 min): everyone reads the statement alone and sees their own panel.
3. Building (40 min, pauses during freezes): shared editor, cards, submissions. Cap of 4 submissions. Accepted ends the round: crew win. The 4th rejection starts the final vote.
4. Freeze: any un-ejected player, once per round, between minute 3 and 90 seconds before the end. Editor should lock (external editor: hands off keyboards). 90 s discussion, 15 s vote. Plurality strictly above every other option including Skip ejects; ties go to Skip. Ejected Changeling: crew win. Ejected crewmate: read-only, no further votes; if they were the Herald, the Herald seat passes to a random un-ejected player.
5. Final vote: when the build clock hits zero or the 4th rejection lands. 60 s discussion, 15 s vote, no Skip. Plurality is ejected. Changeling ejected: crew win. Anything else including a tie: Changeling wins.
6. Reveal: the Changeling, the final editor state (external), every seat's true panel next to every card they played, the vote history.

**Win conditions.** Crew: an Accepted submission, or the Changeling is ejected. Changeling: no Accepted submission and still standing after the final vote.

## Architecture

Next.js 16 (App Router, TypeScript strict) on Vercel. Supabase Postgres holds one row per room: `rooms(code, state jsonb, version)`. All game logic is a pure reducer over `RoomState`. Route handlers load the row, apply the action, save with optimistic concurrency on `version`. Clients poll their personalized view every 1.5 s (`ponytail:` upgrade to Realtime if it ever matters).

```
src/game/types.ts      the contract: RoomState, Action, PlayerView, Settings. Read this first.
src/game/reducer.ts    apply(state, action, ctx) -> RoomState. Pure. Throws GameError.
src/game/deal.ts       seat + imposter assignment with injected RNG.
src/game/view.ts       personalize(state, playerId, now) -> PlayerView. Hides secrets.
src/game/errors.ts     GameError with typed codes.
src/server/supabase.ts server-only Supabase client from SUPABASE_URL / SUPABASE_KEY.
src/server/store.ts    loadRoom / createRoom / withRoom(code, fn) with version retry.
src/server/validate.ts zod schemas for every request body (Problem, Action, names, codes).
src/app/api/rooms/route.ts                POST {name} -> {code, playerId, token}
src/app/api/rooms/[code]/join/route.ts    POST {name} -> {code, playerId, token}
src/app/api/rooms/[code]/route.ts         GET, Authorization: Bearer <token> -> PlayerView (ticks first)
src/app/api/rooms/[code]/act/route.ts     POST {token, action} -> PlayerView
src/client/api.ts      fetch wrappers (ApiError) + localStorage credentials, keyed by hall code.
src/client/useRoom.ts  polling hook: { view, error, clockOffset, send, busy }.
src/app/page.tsx                 landing: create or join.
src/app/room/[code]/page.tsx     the whole game: lobby, reading, building, freeze, final vote, reveal.
src/app/error.tsx                last-resort error boundary for the client screens.
src/components/ui/*    primitives (Button, Field, Frame, Timer, ...).
src/components/art/*   original SVG artwork as React components (sigils, mask, borders, hero).
tests/unit/*.test.ts        vitest, 100% statements+branches on src/game and src/server.
tests/integration/*.test.ts vitest against the real Supabase in .env.local. No mocks.
e2e/*.spec.ts               Playwright, multi-context 4-player game.
```

**Errors.** Route handlers map `GameError` to `{code, message}` with 400/401/404; anything else is 500 and logged through `src/server/log.ts` (one structured logger, `console.error` only there). No silently swallowed exceptions.

**Secrets.** `SUPABASE_URL` and `SUPABASE_KEY` are server-only (no `NEXT_PUBLIC_`). Player tokens are 32 hex chars from `crypto.randomUUID()`-grade randomness and never appear in any view except the join response.

**Ids.** Room codes: 5 uppercase letters from `ABCDEFGHJKLMNPQRSTUVWXYZ` (no I or O). Player and card ids: `crypto.randomUUID()`.

## Commands

| Purpose | Command |
|---|---|
| dev server | `make dev` (http://127.0.0.1:3000) |
| lint (max strictness, zero warnings) | `make lint` |
| typecheck | `make typecheck` |
| unit + integration with coverage gate | `make test-unit` |
| Playwright e2e | `make test-e2e` |
| everything | `make check` |

Local database for tests: `supabase start` (Docker), then point `.env.local` at the printed URL and key.

## Art direction

Indie dark fantasy, medieval, hand-inked. Think a candlelit stone hall where a company of scribes argues over a manuscript. Woodcut and linocut linework, heavy black ink, one warm spot color. No parchment or cream page backgrounds. Every image, icon and ornament in this repo is original SVG drawn for this game. Details in `DESIGN.md` once the design pass lands.
