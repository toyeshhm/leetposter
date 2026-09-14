"use client";
import { notFound } from "next/navigation";
import { Fragment, type CSSProperties, type ReactElement } from "react";
import {
  AcceptedMark,
  BallotIcon,
  CORNERS,
  CartographerSigil,
  ChangelingMask,
  CrewEmblem,
  FrameCorner,
  FreezeBell,
  HeraldSigil,
  HeroPlate,
  HourglassIcon,
  OracleSigil,
  RejectedSeal,
  RuleOrnament,
  WardenSigil,
} from "@/components/art";
import { Badge, Button, Divider, Field, Frame, Notice, TextareaField, Timer } from "@/components/ui";
import { SEATS } from "@/game/types";
import "./gallery.css";

const TOKENS = [
  ["--bg", "page, 15.7:1 under ink"],
  ["--surface", "frames and fields"],
  ["--raised", "hover, 6.1:1 under muted"],
  ["--ink", "text and linework"],
  ["--muted", "secondary text, 7.5:1"],
  ["--accent", "candle amber, 9.8:1"],
  ["--accent-deep", "primary hover, 6.1:1"],
  ["--danger", "oxblood fill, ink on it 6.6:1"],
  ["--danger-ink", "error text, 7.5:1"],
  ["--success", "Accepted fill"],
  ["--success-ink", "success text, 8.5:1"],
] as const;

const PLATES = [
  ["Cartographer", CartographerSigil],
  ["Oracle", OracleSigil],
  ["Warden", WardenSigil],
  ["Herald", HeraldSigil],
  ["Changeling", ChangelingMask],
  ["Crew", CrewEmblem],
  ["Freeze", FreezeBell],
  ["Ballot", BallotIcon],
  ["Hourglass", HourglassIcon],
] as const;

const VARIANTS = ["primary", "secondary", "danger", "ghost"] as const;
/* Module load time: the demo timers count from when the gallery opened. */
const NOW = Date.now();
const STATES = ["default", "hover", "focus", "active"] as const;

function Plates(): ReactElement {
  return (
    <div className="g-row">
      {PLATES.map(([name, Art]) => (
        <div key={name} className="g-item">
          <div className="g-pair">
            <Art size={96} />
            <Art size={24} />
          </div>
          {name}
        </div>
      ))}
      <div className="g-item g-accepted">
        <div className="g-pair">
          <AcceptedMark size={96} />
          <AcceptedMark size={24} />
        </div>
        Accepted
      </div>
      <div className="g-item g-rejected">
        <div className="g-pair">
          <RejectedSeal size={96} />
          <RejectedSeal size={24} />
        </div>
        Rejected
      </div>
    </div>
  );
}

function Buttons(): ReactElement {
  return (
    <div className="g-states">
      <span />
      {STATES.map((s) => (
        <span key={s}>{s}</span>
      ))}
      <span>disabled</span>
      <span>loading</span>
      {VARIANTS.map((v) => (
        <Fragment key={v}>
          <span>{v}</span>
          {STATES.map((s) => (
            <span key={`${v}-${s}`}>
              <Button variant={v} data-state={s === "default" ? undefined : s}>
                Play card
              </Button>
            </span>
          ))}
          <span>
            <Button variant={v} disabled>
              Play card
            </Button>
          </span>
          <span>
            <Button variant={v} loading>
              Submitting
            </Button>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export default function DesignPage(): ReactElement {
  // A working gallery for the design pass, not a page of the game: absent from a production build.
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="g-page">
      <header className="g-head">
        <h1>Leetposter</h1>
        <p>Every plate, token and primitive in the game, in every state. White-line woodcut on stone; one candle.</p>
      </header>

      <section className="g-section" aria-labelledby="g-hero">
        <h2 id="g-hero">Hero plate</h2>
        <div className="g-hero">
          <HeroPlate size={960} />
        </div>
      </section>

      <section className="g-section" aria-labelledby="g-plates">
        <h2 id="g-plates">Plates at 96 and 24</h2>
        <Plates />
      </section>

      <section className="g-section" aria-labelledby="g-orn">
        <h2 id="g-orn">Ornament</h2>
        <div className="g-row">
          {CORNERS.map((c) => (
            <div key={c} className="g-item">
              <FrameCorner corner={c} size={48} title={`corner ${c}`} />
              {c}
            </div>
          ))}
          <div className="g-item">
            <RuleOrnament size={240} title="rule ornament" />
            rule
          </div>
        </div>
        <Divider />
        <Divider>The reveal</Divider>
      </section>

      <section className="g-section" aria-labelledby="g-color">
        <h2 id="g-color">Color</h2>
        <div className="g-swatches">
          {TOKENS.map(([token, role]) => (
            <div key={token} className="g-swatch" style={{ "--sw": `var(${token})` } as CSSProperties}>
              <i />
              <code>{token}</code>
              <span>{role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="g-section" aria-labelledby="g-type">
        <h2 id="g-type">Type</h2>
        <div className="g-type prose">
          <h1>The Warden declares a bound</h1>
          <h2>Four rejections and the candle is out</h2>
          <h3>Reading, five minutes</h3>
          <h4>Cards on the record</h4>
          <p>
            Everyone sees the problem statement, examples included. Each seat holds one channel of information about the problem. One of you is the
            Changeling, holds a seat like anyone else, and lies on any card. Voice is free for everyone: speculate, hedge, be wrong. That is the honest
            players&apos; cover.
          </p>
          <p className="muted">Secondary text at 7.5:1. Cards are the official record and are shown next to the truth at the reveal.</p>
          <p className="tabular">
            Tabular: 00:59 11:11 40:00 <span className="timer">04:13</span> <span className="timer timer-urgent">00:41</span>
          </p>
        </div>
      </section>

      <section className="g-section" aria-labelledby="g-btn">
        <h2 id="g-btn">Buttons</h2>
        <Buttons />
      </section>

      <section className="g-section" aria-labelledby="g-fields">
        <h2 id="g-fields">Fields</h2>
        <div className="g-grid">
          <Field label="Your name" placeholder="Ada" autoComplete="off" />
          <Field label="Room code" defaultValue="KQXZM" hint="Five letters, no I or O." maxLength={5} />
          <Field label="Room code" defaultValue="HELLO" error="That room does not exist." />
          <Field label="Disabled" defaultValue="Locked" disabled />
          <TextareaField label="Failing case" hint="Paste the smallest input that broke." placeholder="n = 3, nums = [1, 1, 1]" />
          <TextareaField label="Failing case" defaultValue="n = 3" error="Give the input, not the error text." />
        </div>
      </section>

      <section className="g-section" aria-labelledby="g-frames">
        <h2 id="g-frames">Frames, timer, badges, notices</h2>
        <div className="g-grid">
          <Frame title="Your panel">
            <p>Hints, in order. Reveal them on request.</p>
            <div className="g-inline" style={{ marginTop: "var(--space-4)" }}>
              <Button variant="primary">Reveal hint 1</Button>
              <Button variant="ghost">Skip</Button>
            </div>
          </Frame>
          <Frame>
            <div className="g-inline">
              <Timer targetAt={NOW + 40 * 60_000} clockOffset={0} />
              <Timer targetAt={NOW + 45_000} clockOffset={0} />
              <Timer targetAt={NOW - 1} clockOffset={0} />
            </div>
            <p className="muted" style={{ marginTop: "var(--space-3)" }}>
              Build clock, freeze window, and out of time.
            </p>
            <Frame title="Nested frames flatten">
              <p>This inner Frame renders as a plain block.</p>
            </Frame>
          </Frame>
          <div className="g-inline">
            {SEATS.map((seat) => (
              <Badge key={seat} seat={seat} />
            ))}
            <Badge seat="runner">you</Badge>
            <Badge seat="oracle">ejected</Badge>
          </div>
          <div className="g-section">
            <Notice>The build clock pauses during a freeze. Hands off the editor.</Notice>
            <Notice kind="error">Rejected: wrong answer on case 3. Three submissions left.</Notice>
          </div>
          <div className="g-verdicts">
            <span className="g-accepted">
              <AcceptedMark size={64} />
            </span>
            <span className="g-rejected">
              <RejectedSeal size={64} />
            </span>
            <span>
              <ChangelingMask size={64} />
            </span>
            <span>
              <CrewEmblem size={64} />
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
