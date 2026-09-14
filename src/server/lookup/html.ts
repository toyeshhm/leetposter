/**
 * LeetCode's problem HTML -> the plain text the paste parser would have produced.
 * ponytail: a few regexes over one small, known HTML dialect (p, ul/li, pre, code, strong, sup, sub, br), not an HTML parser.
 */

/** Inline conversion: exponents and subscripts first, then every tag gone, then entities (amp last, so "&amp;lt;" stays "&lt;"). */
function inline(html: string): string {
  return html
    .replace(/<sup>([\s\S]*?)<\/sup>/g, "^$1")
    .replace(/<sub>([\s\S]*?)<\/sub>/g, "_$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Flowing HTML (everything outside <pre>): source whitespace collapses, list items and blocks end lines. */
function flow(html: string): string {
  return inline(
    html
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/li>/g, "\n")
      .replace(/<\/(p|ul|ol|div|h[1-6])>/g, "\n\n"),
  )
    .replace(/ *\n */g, "\n")
    .replace(/^ | $/g, "");
}

/** A <pre> block: its line breaks verbatim, only the tags and entities converted. */
function pre(html: string): string {
  return inline(html.replace(/^<pre[^>]*>/, "").replace(/<\/pre>$/, "")).replace(/^\n+|\n+$/g, "");
}

export function htmlToText(html: string): string {
  let out = "";
  for (const [i, part] of html.split(/(<pre[^>]*>[\s\S]*?<\/pre>)/).entries()) {
    // Odd parts are the <pre> blocks: glued to the line above them (an "Example k:" heading), as the parser lays examples out.
    out = i % 2 === 0 ? out + flow(part) : `${out.trimEnd()}\n${pre(part)}\n\n`;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Statement = everything before the "Constraints:" line; constraints = the list right after it (up to the first blank line);
 * whatever follows that list (a Follow-up, a Note) goes back onto the end of the statement.
 * ponytail: a nested list inside the constraints would end them early. None seen on LeetCode.
 */
export function splitContent(text: string): { statement: string; constraints: string } {
  const lines = text.split("\n");
  const at = lines.indexOf("Constraints:");
  if (at < 0) return { statement: text, constraints: "" };
  const after = lines.slice(at + 1).join("\n").trim();
  const end = after.indexOf("\n\n");
  const constraints = end < 0 ? after : after.slice(0, end);
  const tail = end < 0 ? "" : after.slice(end + 2);
  return { statement: `${lines.slice(0, at).join("\n").trim()}\n\n${tail}`.trim(), constraints };
}
