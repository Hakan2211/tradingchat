/**
 * Just enough XML for the news adapters.
 *
 * The feeds we ingest are machine-generated RSS 2.0 and Atom from long-lived
 * publishers — flat, predictable, and never more than a few hundred KB. A real
 * parser would be a new production dependency for that, so these helpers do the
 * job instead. They are deliberately dumb: no namespace resolution, no
 * validation. Namespaced tags (`ndaq:HaltDate`) are matched by their literal
 * prefixed name, which is what every feed we read actually emits.
 *
 * If a future source needs real XML — nested repeated structures, attributes
 * that carry meaning, mixed content — reach for a parser rather than growing
 * this file.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Resolve XML/HTML character references, named and numeric. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Unwrap `<![CDATA[...]]>`, which several wires use for every field. */
function stripCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : value;
}

const escapeForRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * The inner XML of every `<tag>…</tag>` in the document, in document order.
 * Self-closing tags are skipped — they have no content to return.
 */
export function blocks(xml: string, tag: string): string[] {
  const name = escapeForRegex(tag);
  const pattern = new RegExp(
    String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`,
    'g'
  );
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

/**
 * Text of the first `<tag>` in a block, CDATA unwrapped and entities decoded.
 *
 * A self-closing tag and an absent one both return '' — the halt feed emits
 * `<ndaq:ResumptionDate />` for a halt that has not resumed yet, and callers
 * want "no value" for both cases rather than having to tell them apart.
 */
export function tagText(block: string, tag: string): string {
  const name = escapeForRegex(tag);
  const paired = block.match(
    new RegExp(String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`)
  );
  return paired ? decodeEntities(stripCdata(paired[1])).trim() : '';
}

/** Value of an attribute on the first matching tag, or ''. */
export function tagAttr(block: string, tag: string, attribute: string): string {
  const name = escapeForRegex(tag);
  const key = escapeForRegex(attribute);
  const match = block.match(
    new RegExp(String.raw`<${name}\b[^>]*\b${key}="([^"]*)"`)
  );
  return match ? decodeEntities(match[1]).trim() : '';
}

/** Collapse HTML in a summary down to plain text, then clamp it. */
export function plainText(value: string, maxLength = 300): string {
  const text = decodeEntities(stripCdata(value))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
