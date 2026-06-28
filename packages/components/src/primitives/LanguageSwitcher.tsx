import { type LocaleLink, type LocaleManifest, localeLinks } from "@nocms/core";
import { useEffect, useState } from "preact/hooks";
import * as v from "valibot";
import { cx } from "../cx";
import { readSiteRuntime } from "../site-runtime";

export const LanguageSwitcherSchema = v.object({
  label: v.optional(v.string(), "Language"),
});

export type LanguageSwitcherProps = v.InferInput<typeof LanguageSwitcherSchema> & {
  class?: string;
  className?: string;
};

// An island because it reads the live URL and fetches the ② i18n artifact at view time; it
// renders nothing until the manifest places the current route in a translation group.
export function LanguageSwitcher({
  label = "Language",
  class: cls,
  className,
}: LanguageSwitcherProps) {
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
      class={cx("inline-flex gap-2 items-center", className, cls)}
      aria-label={label}
    >
      {links.map((link) =>
        link.current ? (
          <span key={link.locale} aria-current="true" class="font-semibold">
            {link.locale}
          </span>
        ) : (
          <a key={link.locale} href={link.href} class="text-text">
            {link.locale}
          </a>
        ),
      )}
    </nav>
  );
}
