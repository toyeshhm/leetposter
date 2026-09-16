import { notFound } from "next/navigation";
import { createElement, type CSSProperties, type ReactElement } from "react";
import { CARET_COLORS, GUEST_AVATAR, THEME_VARS, TitleLine, cosmeticArt, themeCss } from "@/components/cosmetics";
import "@/components/cosmetics/cosmetics.css";
import { CATALOG, type Item } from "@/economy/catalog";

/*
 * Every cosmetic at the size it is worn and the size it is drawn. Absent from a production build, like /design.
 * The art is chosen by id at render, so it goes through `createElement`: a drawing read out of the registry is a
 * constant, but written as `<Art />` the compiler cannot tell it from a component defined inside the render.
 */

function of(kind: Item["kind"]): readonly Item[] {
  return CATALOG.filter((item) => item.kind === kind);
}

/** One drawing at its two sizes. Missing art is stated, not skipped, so a gap is visible here first. */
function Drawn({ item, small }: { item: Item; small: number }): ReactElement {
  const art = cosmeticArt(item.art);
  return (
    <div className="c-item">
      <div className="c-pair">
        {art === null ? (
          <span className="c-id">no art</span>
        ) : (
          <>
            {createElement(art, { size: 96, title: item.name })}
            {createElement(art, { size: small, title: item.name })}
          </>
        )}
      </div>
      <span className="c-name">{item.name}</span>
      <span className="c-id">{item.art}</span>
    </div>
  );
}

/** A frame as it is actually worn: drawn over a portrait of the same size. */
function Framed({ item }: { item: Item }): ReactElement {
  const art = cosmeticArt(item.art);
  if (art === null) return <div className="c-item">no art</div>;
  return (
    <div className="c-item">
      <div className="c-pair">
        <span className="c-wrap">
          {createElement(art, { size: 96, title: item.name })}
          <GUEST_AVATAR size={70} decorative />
        </span>
        <span className="c-wrap">
          {createElement(art, { size: 32, title: item.name })}
          <GUEST_AVATAR size={23} decorative />
        </span>
      </div>
      <span className="c-name">{item.name}</span>
      <span className="c-id">{item.art}</span>
    </div>
  );
}

export default function CosmeticsGallery(): ReactElement {
  if (process.env.NODE_ENV === "production") notFound();
  const themeRules = (["dark", "light"] as const)
    .flatMap((mode) => Object.keys(THEME_VARS[mode]).map((id) => `.c-theme[data-theme="${id}"][data-mode="${mode}"] { ${themeCss(id, mode)} }`))
    .join("\n");
  return (
    <main className="c-page">
      <style>{themeRules}</style>
      <header className="c-head">
        <h1>Cosmetics</h1>
        <p>
          Every avatar, frame, badge and emote in the catalog, drawn at the size it is worn and the size it is drawn at. Titles are text, carets are a
          colour, themes are a set of tokens.
        </p>
      </header>

      <section className="c-section" aria-labelledby="c-avatars">
        <h2 id="c-avatars">
          Avatars <span>96 and 32, the roster size</span>
        </h2>
        <div className="c-row">
          {of("avatar").map((item) => (
            <Drawn key={item.id} item={item} small={32} />
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-frames">
        <h2 id="c-frames">
          Frames <span>over a portrait, 96 and 32</span>
        </h2>
        <div className="c-row">
          {of("frame").map((item) => (
            <Framed key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-badges">
        <h2 id="c-badges">
          Badges <span>96 and 20, the size beside a name</span>
        </h2>
        <div className="c-row">
          {of("badge").map((item) => (
            <Drawn key={item.id} item={item} small={20} />
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-emotes">
        <h2 id="c-emotes">
          Emotes <span>96 and 48, the size played at the reveal</span>
        </h2>
        <div className="c-row">
          {of("emote").map((item) => (
            <Drawn key={item.id} item={item} small={48} />
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-titles">
        <h2 id="c-titles">
          Titles <span>the line under a name</span>
        </h2>
        <div className="c-titles">
          {of("title").map((item) => (
            <div key={item.id} className="c-title-row">
              <b>Ada</b>
              <TitleLine itemId={item.id} />
              <span className="c-id">{item.id}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-carets">
        <h2 id="c-carets">
          Carets <span>the cursor in the shared editor</span>
        </h2>
        <div className="c-carets">
          {of("caret").map((item) => (
            <div key={item.id} className="c-item">
              <div className="c-caret-demo" style={{ "--caret": CARET_COLORS[item.id] ?? "var(--ink)" } as CSSProperties}>
                <span>while (n</span>
                <span className="caret" data-caret={item.id} />
                <span>)</span>
              </div>
              <span className="c-name">{item.name}</span>
              <span className="c-id">{item.id}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="c-section" aria-labelledby="c-themes">
        <h2 id="c-themes">
          Themes <span>the whole token set, applied</span>
        </h2>
        <div className="c-themes">
          {of("theme").map((item) => (
            <div key={item.id} className="c-theme" data-theme={item.id}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div className="c-chips" aria-hidden>
                <i style={{ "--chip": "var(--bg)" } as CSSProperties} />
                <i style={{ "--chip": "var(--surface)" } as CSSProperties} />
                <i style={{ "--chip": "var(--raised)" } as CSSProperties} />
                <i style={{ "--chip": "var(--line)" } as CSSProperties} />
                <i style={{ "--chip": "var(--ink)" } as CSSProperties} />
                <i style={{ "--chip": "var(--muted)" } as CSSProperties} />
                <i style={{ "--chip": "var(--accent)" } as CSSProperties} />
                <i style={{ "--chip": "var(--accent-deep)" } as CSSProperties} />
              </div>
              <div className="c-theme-ui">
                <b>Play card</b>
                <em>Rejected</em>
                <s>Accepted</s>
                <span className="muted">secondary</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
