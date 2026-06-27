export {
  isMarkActive,
  type ProseMarkName,
  toggleProseMark,
} from "./commands.js";
export {
  mountProseEditor,
  type ProseEditorHandle,
  type ProseEditorOptions,
} from "./editor.js";
export { type ProseSchema, proseSchema } from "./schema.js";
export { docToMdastInline, mdastInlineToDoc } from "./transform.js";
