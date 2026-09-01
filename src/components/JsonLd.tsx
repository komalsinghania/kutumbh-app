/**
 * Renders a schema.org JSON-LD block into the server-rendered HTML.
 *
 * `<` is escaped to its unicode form because JSON.stringify does not sanitise
 * strings for embedding inside a <script> tag — this is the escaping Next.js
 * documents for JSON-LD, and it stops any stray markup in the data from
 * closing the script element.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}
    />
  );
}
