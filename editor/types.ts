/** The surface the chrome uses. Kept narrow on purpose: the chrome should not reach
 *  into editor internals, only the operations the interface actually offers. */
export interface ComponentDef {
  id: string;
  schema?: { shape: Record<string, unknown> };
  meta: { name: string; category?: string; description?: string; role?: string };
}

export interface EditorApi {
  state: {
    pagePath: string;
    pages: { path: string; route: string }[];
    selected: number[] | null;
    storage: { mode: "local" | "github"; describeTarget(): string };
  };
  listComponents(): ComponentDef[];
  componentFor(tag: string): ComponentDef | null;
  nodeAt(path: number[]): { name: string; props: Record<string, PropValue> } | null;
  setProp(path: number[], name: string, value: unknown): Promise<boolean>;
  addComponent(id: string, at?: number | null): Promise<void>;
  moveSection(path: number[], delta: number): Promise<void>;
  removeSection(path: number[]): Promise<void>;
  addImage(
    file: File,
  ): Promise<{ src: string; width: number; height: number; bytes: number }>;
  openPage(path: string): Promise<{ ok?: boolean; blocked?: boolean; error?: string }>;
  createPage(route: string): Promise<{ ok?: boolean; route?: string; error?: string }>;
  themeTokens(): { name: string; value: string; kind: string }[];
  setToken(name: string, value: string): void;
  changes(): string[];
  canUndo(): boolean;
  undoPublish(): Promise<{ ok?: boolean; error?: string }>;
  save(message?: string): Promise<string>;
}

export interface PropValue {
  kind: "text" | "data" | "code" | "raw";
  value?: unknown;
  source?: string;
}
