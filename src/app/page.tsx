import type { ReactElement } from "react";
import { CartographerSigil, ChangelingMask, HeraldSigil, HeroPlate, OracleSigil, WardenSigil, type ArtProps } from "@/components/art";
import { Entry } from "@/components/lobby/Entry";
import { Divider } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import styles from "./page.module.css";

const BEATS: { name: string; Art: (props: ArtProps) => ReactElement; text: string }[] = [
  {
    name: "The deal",
    Art: CartographerSigil,
    text: "The host pastes one LeetCode-style problem. Seats go out in secret. The Cartographer holds the topic tags and must declare exactly as many as the problem carries.",
  },
  {
    name: "The reading",
    Art: OracleSigil,
    text: "Five minutes alone with the statement. The Oracle holds the hints, in order, and gives them up one at a time when the table asks.",
  },
  {
    name: "The building",
    Art: WardenSigil,
    text: "Forty minutes in a shared editor of your choosing. The Warden holds the constraints and declares bounds. Every card played goes on the record.",
  },
  {
    name: "The verdict",
    Art: HeraldSigil,
    text: "The Herald holds the title and the link and is the only one who submits. Four attempts. Accepted ends the round and the crew win. The fourth rejection starts the final vote.",
  },
  {
    name: "The freeze",
    Art: ChangelingMask,
    text: "Anyone may ring the bell once. Ninety seconds of argument, fifteen to vote. Eject the Changeling and the crew win. Eject anyone else and they go quiet. When the clock runs out there is one last vote, with no skip. If the Changeling is still standing, the Changeling wins.",
  },
];

export default function Home(): ReactElement {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="wordmark">
        <div className={styles.plate}>
          <HeroPlate size={960} />
        </div>
        <h1 id="wordmark" className={styles.wordmark}>
          Changeling
        </h1>
        <p className={styles.lede}>Four to eight programmers, one hard problem, forty minutes, and one of you is lying.</p>
      </section>

      <section aria-label="Enter a hall">
        <Entry />
      </section>

      <Divider>How a round works</Divider>

      <ol className={styles.beats}>
        {BEATS.map(({ name, Art, text }, i) => (
          <li key={name} className={styles.beat}>
            <Art size={64} decorative />
            <div>
              <h2 className={styles.beatName}>
                <span className={cx(styles.beatIndex, "tabular")}>{i + 1}</span> {name}
              </h2>
              <p className="muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className={styles.truth} aria-labelledby="truth">
        <h2 id="truth">The truth rule</h2>
        <p>
          Cards are the record, and at the reveal every card is laid next to the truth. The crew fill every card truthfully. Voice is free for
          everyone: speculate, hedge, be wrong. That is the honest players&apos; cover.
        </p>
        <p>
          The Changeling holds a seat like anyone else, sees every panel, and may lie on any card and in any sentence. The one thing never faked is
          the verdict.
        </p>
      </section>
    </main>
  );
}
