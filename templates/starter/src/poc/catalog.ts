import catalog from "virtual:tw-catalog";
import { createCatalogApi } from "@nocms/style-controls";

export type {
  Catalog,
  ColorFamily,
  ColorShade,
  Control,
  Feature,
  FeatureOption,
} from "@nocms/style-controls";
// Bind the build-time catalog (the virtual module the Vite plugin emits) to the runtime control
// API. Everything else — the class algebra, capability map, modes — flows from @nocms/style-controls.
export {
  composeColor,
  parseColorClass,
  preferNamed,
  widgetFor,
} from "@nocms/style-controls";

const api = createCatalogApi(catalog);
export const {
  CATALOG,
  COLORS,
  FEATURE,
  applyClass,
  colorFeatureId,
  currentClass,
  featureIdOf,
  flattenForPreview,
  scaleKeys,
  searchFeatures,
} = api;
