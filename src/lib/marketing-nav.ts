// The marketing pages (features / how-it-works / pricing / mummy-mode) ship their
// nav + footer as pre-generated static HTML. Rather than regenerate those files to
// add the later "About" page, we splice an About link into the nav and footer at
// render time — right after the "Mummy Mode" link in each.
// The static marketing HTML ships with its own <nav> baked in. The site now
// renders a single shared <SiteHeader/> on every page, so strip that leading
// nav block out before injecting the rest of the markup.
export function stripNav(html: string): string {
  return html.replace(/^\s*<nav[\s\S]*?<\/nav>\s*/i, '');
}

// The static marketing HTML also ships with its own stripped-down <footer> baked
// in at the end. The site now renders a single shared <SiteFooter/> on every
// page, so strip that trailing footer block out before injecting the markup.
export function stripFooter(html: string): string {
  return html.replace(/\s*<footer[\s\S]*?<\/footer>\s*$/i, '');
}

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
