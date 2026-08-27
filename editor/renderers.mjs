/**
 * Framework renderers available to the editor.
 *
 * Empty while every section is .astro. A section pack declares what it needs and the
 * build regenerates this file — the list is generated, never hardcoded, so adding a
 * component library is an install rather than a core change.
 *
 * Registration order is load-bearing: React's check() reads Component["$$typeof"] and
 * throws on foreign object components, so object-based frameworks must claim theirs
 * first and React must come last.
 */
export const renderers = [];
