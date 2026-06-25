// The minimal public API of @nocms/router. The route model is pure and DOM-free;
// the navigation surface is the only piece that touches History/DOM.

export {
  contentPathToRoute,
  href,
  type LocaleLink,
  type LocaleManifest,
  localeLinks,
  normalizeRoutePath,
  type RoutePath,
  routeToContentPath,
} from "@nocms/core";
export { breadcrumbs, type Crumb, isActiveRoute } from "./links";
export {
  type Navigation,
  type NavigationOptions,
  startNavigation,
} from "./navigation";
export {
  createRouteTable,
  matchRoute,
  type RouteDef,
  type RouteMatch,
  type RouteTable,
  routeTableFromEntries,
  routeTableFromPaths,
} from "./table";
