import { type LocaleLink, type LocaleManifest, localeLinks } from "@nocms/core";
import { useEffect, useState } from "preact/hooks";
import { readSiteRuntime } from "../site-runtime";

export interface LanguageSwitcherProps {
  /** Accessible label for the switcher's nav landmark. */
  label?: string;
}

// A runtime consumer of the ② i18n artifact: it fetches `i18n/translations.json` (located via
// the embedded site-runtime config), resolves the current page's other-locale links with
// core's `localeLinks`, and renders them. An island because it reads the live URL and fetches;
// it renders nothing until the manifest places the current route in a translation group.
export function LanguageSwitcher({ label = "Language" }: LanguageSwitcherProps) {
  const [links, setLinks] = useState<LocaleLink[]>([]);

  useEffect(() => {
    const runtime = readSiteRuntime();
    if (!runtime?.translationsUrl) return;
    let cancelled = false;
    fetch(runtime.translationsUrl)
      .then((res) => (res.ok ? (res.json() as Promise<LocaleManifest>) : null))
      .then((manifest) => {
        if (!cancelled && manifest) {
          setLinks(localeLinks(manifest, location.pathname, runtime.base));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (links.length < 2) return null;
  return (
    <nav
      class="language-switcher"
      aria-label={label}
      style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}
    >
      {links.map((link) =>
        link.current ? (
          <span key={link.locale} aria-current="true" style={{ fontWeight: 600 }}>
            {link.locale}
          </span>
        ) : (
          <a key={link.locale} href={link.href} style={{ color: "var(--color-text)" }}>
            {link.locale}
          </a>
        ),
      )}
    </nav>
  );
}
