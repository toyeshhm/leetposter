# Leetposter

A social-deduction party game for programmers. Four to eight friends on a voice call try to solve one hard algorithm problem together in 40 minutes. Each seat holds one channel of information about the problem. One of them is the Changeling, and lies.

The traitor role is still called the Changeling in-game. Never put "LeetCode" (the registered mark) in the product name; "Leet"-prefixed names are tolerated in practice but not guaranteed.

## The game

**Players.** 1 to 8; four or more for a real game. Under four (for testing) the four seats are shared round the table, so a solo host holds every seat. Everyone sees the problem statement, examples included. Everyone types in the hall's shared editor, one file with live carets and a language picker (any external editor the group already uses still works alongside it). Exactly one player is the Changeling.

**Seats.** Dealt secretly at start. Everyone sees the statement; a seat adds one extra channel of information on top of it. Every player, including the Changeling, holds a seat. Seats are public (everyone knows who holds what); only the panel contents are private, and who is the Changeling is secret.

| Seat | In-world name | Sees | Plays |
|---|---|---|---|
| tagger | the Cartographer | the problem's topic tags | one "Declare tags" card: exactly N tags (N is public) |
| oracle | the Oracle | the hints, in order | "Reveal hint k" cards, in order, on request. The card carries the text the Oracle typed (prefilled with the true hint) and is checked against the true hint at the reveal |
| bounds | the Warden | the constraints block (input sizes, value ranges, time/memory limits) | "Declare bound" cards, any number |
| runner | the Herald | the problem title and URL; the only one who submits to the judge | "Submit": records Accepted or Rejected. Rejected requires a report card: error category + failing case |

Players 5 to 8 get duplicate seats in this order: second Oracle, second Cartographer, second Warden, third Oracle. Two holders of the same seat who disagree tell the crew one of them is lying.

**The Changeling** holds a normal seat and sees only that seat's panel, like any crew member. They may lie on any card and on voice: a Changeling seated as Oracle can reveal a hint that reads nothing like the true one, since a hint card carries whatever text the Oracle typed and is only checked against the true hint at the reveal. The one thing never faked is the Accepted/Rejected verdict. Balance knob: if the Changeling loses far more than 60% of calibrated rounds, consider giving them the full problem.

**Truth rule.** Cards are the official record and are shown next to the truth at the reveal. Crew must fill every card truthfully. Voice is free for everyone: speculate, hedge, be wrong. That is the honest players' cover.

**Timeline.**
1. Lobby: host fetches or pastes the problem (title, URL, statement with its examples, tags, hints, constraints) and starts.
2. Reading (5 min): everyone reads the statement alone and sees their own panel.
3. Building (40 min, pauses during freezes): shared editor, cards, submissions. Cap of 4 submissions. Accepted ends the round: crew win. The 4th rejection starts the final vote.
4. Freeze: any un-ejected player, once per round, between minute 3 and 90 seconds before the end. The in-app editor locks (an external editor: hands off keyboards). 90 s discussion, 15 s vote. Plurality strictly above every other option including Skip ejects; ties go to Skip. Ejected Changeling: crew win. Ejected crewmate: read-only, no further votes; if they were the Herald, the Herald seat passes to a random un-ejected player.
5. Final vote: when the build clock hits zero or the 4th rejection lands. 60 s discussion, 15 s vote, no Skip. Plurality is ejected. Changeling ejected: crew win. Anything else including a tie: Changeling wins.
6. Reveal: the Changeling, the final editor state, read-only, every seat's true panel next to every card they played, the vote history.

**Win conditions.** Crew: an Accepted submission, or the Changeling is ejected. Changeling: no Accepted submission and still standing after the final vote.

## Getting a problem in

The host does not fill the form by hand. One box, "Problem", takes either a whole-page paste or just a title, number or leetcode.com link; "Sort it out" sends it to `POST /api/parse`.

**A short text** ("1147", "Two Sum", "longest chunked palindrome", a link) is a lookup: `src/server/lookup/leetcode.ts` asks LeetCode's GraphQL endpoint for the matching question (exact number, else exact title, else the first hit whose title carries every word typed), fetches it, and turns its HTML into plain text (`src/server/lookup/html.ts`: `10<sup>4</sup>` becomes `10^4`, `nums<sub>1</sub>` becomes `nums_1`, the Example blocks keep their lines). Nothing matching is a 404 ("LeetCode has no problem called X."); a paywalled problem comes back without content and is reported the same way.

**A whole page** (on LeetCode: open Topics and every Hint, select all, copy, paste) goes through the deterministic line parser first (`src/server/parse/leetcode.ts`: title, link, statement with the Example blocks and the follow-up, tags, hints, constraints, with the exponents that copying flattens restored, `104` to `10^4`). Its title is then looked up on LeetCode; when that answers, LeetCode's fields win and the parser fills whatever LeetCode left empty ("Checked against LeetCode."). When it does not, the parser's result stands ("LeetCode did not answer; used the pasted text."), and if the parser could not find the title, statement or constraints and `GROQ_API_KEY` is set, the same text goes to Groq (`src/server/parse/groq.ts`, currently `openai/gpt-oss-120b`) and the model's answer fills whatever the parser left empty. "Sort with the model" forces the Groq path; without a key that button is hidden.

The honest caveat: the lookup uses LeetCode's undocumented, unauthenticated GraphQL endpoint, which is LeetCode's to change. It may stop working, or Cloudflare may block the server's network. A short text then answers 502 ("LeetCode did not answer. Paste the page instead."), and a pasted page still works through the parser. Either way every field stays editable before "Set the problem".

## Architecture

Next.js 16 (App Router, TypeScript strict) on Vercel. Supabase Postgres holds one row per room: `rooms(code, state jsonb, version, doc text)`; `doc` is the shared editor's last saved Yjs state. All game logic is a pure reducer over `RoomState`. Route handlers load the row, apply the action, save with optimistic concurrency on `version`. Clients poll their personalized view every 1.5 s (`ponytail:` upgrade to Realtime if it ever matters). The shared editor is a Yjs document: edits and carets travel peer to peer over one Supabase Realtime broadcast channel per hall, and the full state is saved to the row 2 s after the last local edit so a reload or a late joiner starts from it.

```
src/game/types.ts      the contract: RoomState, Action, PlayerView, Settings. Read this first.
src/game/reducer.ts    apply(state, action, ctx) -> RoomState. Pure. Throws GameError.
src/game/deal.ts       seat + imposter assignment with injected RNG.
src/game/view.ts       personalize(state, playerId, now) -> PlayerView. Hides secrets.
src/game/errors.ts     GameError with typed codes.
src/server/supabase.ts server-only Supabase client from SUPABASE_URL / SUPABASE_KEY.
src/server/store.ts    loadRoom / createRoom / withRoom(code, fn) with version retry.
src/server/validate.ts zod schemas for every request body (Problem, Action, names, codes).
src/server/auth.ts         bearerToken / requireUser / optionalUser: verify a Supabase access token, load the profile.
src/server/profiles.ts     profiles table: username rules, findProfile, createProfile.
src/server/results.ts      recordResults at the reveal (one game_results row per account holder), loadResults for the ledger.
src/server/achievements.ts pure achievement rules over game_results rows; never stored.
src/server/friends.ts      friendships table: list, request, accept, remove; FriendsPage with friends' recent halls.
src/server/elo.ts          pure Elo (K = 32, guests at 1200): rateHall(players, winner) -> new ratings per account and ladder.
src/server/ratings.ts      ratings table: loadRatings, upsertRatings, leaderboard(board, me) for the five boards.
src/server/parse/leetcode.ts  deterministic line parser for a pasted LeetCode page -> Problem + warnings.
src/server/parse/groq.ts      Groq fallback that fills whatever the parser left empty.
src/server/parse/schema.ts    zod schemas for the request body and the model's answer.
src/server/parse/types.ts     ParsedProblem / ParseResponse: {problem, confidence, warnings, source (parser | llm | leetcode), llmAvailable}.
src/server/lookup/leetcode.ts lookupLeetCode(query): search + detail against LeetCode's GraphQL endpoint -> ParsedProblem.
src/server/lookup/html.ts     the small deterministic HTML -> text converter and the statement/constraints split.
src/app/api/parse/route.ts                POST {text, mode} -> ParseResponse (a short text: 404 not found, 502 when LeetCode does not answer)
src/app/api/rooms/route.ts                POST {name} -> {code, playerId, token}
src/app/api/rooms/[code]/join/route.ts    POST {name} -> {code, playerId, token}
src/app/api/rooms/[code]/route.ts         GET, Authorization: Bearer <token> -> PlayerView (ticks first)
src/app/api/rooms/[code]/act/route.ts     POST {token, action} -> PlayerView
src/app/api/rooms/[code]/doc/route.ts     GET (bearer) -> {doc}; POST {doc} saves it, refused while the editor is locked
src/app/api/account/route.ts              POST {username} claims a name after sign-up; GET -> {id, username, email}
src/app/api/account/history/route.ts      GET -> {games}: the caller's recorded games, newest first
src/app/api/account/achievements/route.ts GET -> {achievements}: earned + progress, computed on read
src/app/api/friends/route.ts              GET -> FriendsPage; POST {username} sends a request
src/app/api/friends/[username]/route.ts   DELETE: remove a friend or decline a request
src/app/api/friends/[username]/accept/route.ts  POST: accept a request
src/app/api/leaderboard/route.ts          GET ?board=overall|crew|changeling|solves|changeling-wins (optional bearer) -> {board, rows, me, ratings}
src/client/api.ts      fetch wrappers (ApiError) + localStorage credentials, keyed by hall code.
src/client/useRoom.ts  polling hook: { view, error, clockOffset, send, busy }.
src/client/docSync.ts     connectDoc: Yjs updates + y-protocols awareness over a Realtime broadcast channel.
src/client/docPersist.ts  persistDoc: load the saved state, save 2 s after the last local edit and on unload.
src/client/supabaseBrowser.ts browser Supabase client (publishable key): Realtime and Auth.
src/client/session.ts     useSession: { status, userId, username, accessToken, error, signOut } from Supabase Auth.
src/app/page.tsx                 landing: create or join.
src/app/room/[code]/page.tsx     the whole game: lobby, reading, building, freeze, final vote, reveal.
src/app/error.tsx                last-resort error boundary for the client screens.
src/app/account/page.tsx         sign in / sign up / your seat.
src/app/me/page.tsx              the ledger: your recorded games and the achievements grid.
src/app/friends/page.tsx         friends, requests, and their recent halls.
src/app/leaderboard/page.tsx     the five boards, for anyone to read.
src/components/editor/*  SharedEditor (CodeMirror + yCollab), the client-only Editor wrapper, languages, theme.
src/components/lobby/*   the lobby: PasteBox (whole page or title/number -> /api/parse), ProblemForm, SettingsForm, Roster.
src/components/site/*    SiteHeader and SessionNav (signed-out link or @username + sign out).
src/components/history/* HistoryScreen (game rows) and Marks (the achievements grid).
src/components/friends/* FriendsScreen: friends list, incoming and outgoing requests, add by username.
src/components/leaderboard/* LeaderboardScreen: the board switcher and the ranked table.
src/components/ui/*    primitives (Button, Field, Frame, Timer, ...).
src/components/art/*   original SVG artwork as React components (sigils, mask, borders, hero).
tests/unit/*.test.ts        vitest, 100% statements+branches on src/game, src/server and src/app/api (incl. achievements rules).
tests/integration/*.test.ts vitest against the real Supabase (rooms, doc, auth, history, friends, ratings), Groq in .env.local, and leetcode.com (lookup). No mocks.
e2e/*.spec.ts               Playwright: the 4-player game, the shared editor across two tabs, the problem box (lookup and paste), sign-up + account seat, history, friends, leaderboard.
```

**Errors.** Route handlers map `GameError` to `{code, message}` with 400/401/404/502; anything else is 500 and logged through `src/server/log.ts` (one structured logger, `console.error` only there). No silently swallowed exceptions.

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

## Accounts (optional)

Nobody needs an account to play. Signing up (email + password through Supabase Auth, then a username on the "Choose your name" step) lets the app remember your games. A signed-in account with no name yet (a sign-up that never reached that step) is sent back to it by the header, plays as a guest until then, and gets 404 `not-found` from `GET /api/account` where every other account route answers 401. When a hall you joined while signed in reaches the reveal, the server writes one `game_results` row for you (seats, whether you were the Changeling, won, why, cards played and how many were altered). Achievements are computed from those rows, never stored. Friends are `friendships` rows (request, accept); your friends page shows their recent halls. All four tables have RLS with no policies: only the server reads and writes them, after verifying the caller's Supabase access token.

**Ladders.** The same reveal rates the hall: one match, the Changeling against the crew as a body, Elo with K = 32. Everyone starts at 1200 and a guest always weighs 1200. Each crew member rates against the Changeling's overall rating; the Changeling rates against the mean of the crew's overall ratings. Three `ratings` rows per account, one per ladder: overall (every hall), crew (halls as crew), changeling (halls in the mask), each with its games and wins. A hall is rated once: if its `game_results` rows already exist the ratings stand. `/leaderboard` shows five boards: the three ladders, plus two counts folded from `game_results`, solves (crew wins on an accepted submission) and changeling wins. Ranks are competition ranks (1, 2, 2, 4); the top fifty are listed and a signed-in player sees their own line wherever they stand. `/me` opens with the three ratings.

Routes: `POST /api/account` (choose the name after sign-up), `GET /api/account` (me; 404 `not-found` until the name is chosen), `GET /api/account/history`, `GET /api/account/achievements`, `GET|POST /api/friends`, `POST /api/friends/[username]/accept`, `DELETE /api/friends/[username]`, `GET /api/leaderboard?board=<board>` (bearer optional; `me` and `ratings` are null for a guest). Pages: `/account`, `/me`, `/friends`, `/leaderboard`.
