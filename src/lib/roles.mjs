/**
 * Roles: the smallest vocabulary that answers "what can go where".
 *
 * Components are the unit. A page is components composed into components; what we used
 * to call a "section" is just a component that happens to stand alone on a page. Rather
 * than per-component allow-lists — which would need editing every time a library is
 * added — each component declares a role, and each slot declares which roles it takes.
 */
export const ROLES = ["block", "inline", "container"];

/** A component with no descriptor is `inline`: droppable into things, never assumed
 *  to stand alone. Safe by default, and still explicitly placeable from the library. */
export const DEFAULT_ROLE = "inline";

const ACCEPTS = {
  // A page holds things that stand alone, and containers that arrange them.
  page: ["block", "container"],
  // A container arranges anything, including other containers.
  container: ["block", "inline", "container"],
  // Blocks and inlines may still nest — a Card holding a Button, say.
  block: ["inline", "container"],
  inline: ["inline"],
};

export function roleOf(component) {
  const role = component?.meta?.role;
  return ROLES.includes(role) ? role : DEFAULT_ROLE;
}

/**
 * @param hostRole  role of the component owning the slot, or "page" at the top level
 * @param slotAccepts optional explicit override declared by the host
 */
export function accepts(hostRole, movedRole, slotAccepts) {
  const allowed = slotAccepts ?? ACCEPTS[hostRole] ?? ACCEPTS.container;
  return allowed.includes(movedRole);
}

/** Can this component be dropped straight onto a page? */
export function standsAlone(component) {
  return accepts("page", roleOf(component));
}
