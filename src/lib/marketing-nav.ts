// The marketing pages (features / how-it-works / pricing / mummy-mode) ship their
// nav + footer as pre-generated static HTML. Rather than regenerate those files to
// add the later "About" page, we splice an About link into the nav and footer at
// render time — right after the "Mummy Mode" link in each.
export function withAboutLink(html: string): string {
  return html
    .replace(
      'hide-m">Mummy Mode</a>',
      'hide-m">Mummy Mode</a><a href="/about" class="hide-m">About</a>'
    )
    .replace(
      '<a href="/mummy-mode">Mummy Mode</a>',
      '<a href="/mummy-mode">Mummy Mode</a><a href="/about">About</a>'
    );
}
