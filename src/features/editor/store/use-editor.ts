import { create } from "zustand";
import type { Annotation, FormValue, Tool } from "../types";
import type { TextFormatting } from "../types";
import { defaultTextFormatting, resolveTextFormatting } from "@/features/fonts/registry";
type Snapshot = { annotations: Annotation[]; forms: Record<string, FormValue> };
type State = {
  file: File | null;
  bytes: Uint8Array | null;
  pageCount: number;
  currentPage: number;
  tool: Tool;
  selectedId: string | null;
  editingId: string | null;
  textPreferences: TextFormatting;
  zoom: number;
  annotations: Annotation[];
  forms: Record<string, FormValue>;
  past: Snapshot[];
  future: Snapshot[];
  exporting: boolean;
  signature: string | null;
  error: string | null;
  setDocument: (file: File, bytes: Uint8Array, pageCount: number) => void;
  clearDocument: () => void;
  setTool: (tool: Tool) => void;
  select: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  add: (a: Annotation) => void;
  update: (id: string, patch: Partial<Annotation>) => void;
  setTextPreferences: (patch: Partial<TextFormatting>) => void;
  remove: (id: string) => void;
  setForm: (key: string, value: FormValue) => void;
  undo: () => void;
  redo: () => void;
  setExporting: (v: boolean) => void;
  setSignature: (v: string) => void;
  setError: (v: string | null) => void;
};
const snapshot = (s: State): Snapshot => ({
  annotations: s.annotations,
  forms: s.forms,
});
const record = (s: State, changed: Partial<State>) => ({
  ...changed,
  past: [...s.past.slice(-49), snapshot(s)],
  future: [],
});
export const useEditor = create<State>((set) => ({
  file: null,
  bytes: null,
  pageCount: 0,
  currentPage: 1,
  tool: "select",
  selectedId: null,
  editingId: null,
  textPreferences: defaultTextFormatting,
  zoom: 1,
  annotations: [],
  forms: {},
  past: [],
  future: [],
  exporting: false,
  signature: null,
  error: null,
  setDocument: (file, bytes, pageCount) =>
    set({
      file,
      bytes,
      pageCount,
      currentPage: 1,
      annotations: [],
      forms: {},
      past: [],
      future: [],
      selectedId: null,
      editingId: null,
      signature: null,
      error: null,
      zoom: 1,
    }),
  clearDocument: () =>
    set({
      file: null,
      bytes: null,
      pageCount: 0,
      annotations: [],
      forms: {},
      past: [],
      future: [],
      selectedId: null,
      editingId: null,
      signature: null,
    }),
  setTool: (tool) => set({ tool, selectedId: null, editingId: null }),
  select: (selectedId) =>
    set((s) => ({
      selectedId,
      editingId: selectedId === s.selectedId ? s.editingId : null,
    })),
  setEditing: (editingId) =>
    set((s) => ({ editingId, selectedId: editingId ?? s.selectedId })),
  setPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom: Math.round(Math.max(0.5, Math.min(2, zoom)) * 100) / 100 }),
  add: (a) =>
    set((s) =>
      record(s, {
        annotations: [...s.annotations, a],
        selectedId: a.id,
        editingId: a.kind === "text" ? a.id : null,
        textPreferences:
          a.kind === "text" ? resolveTextFormatting(a) : s.textPreferences,
        tool: "select",
      }),
    ),
  update: (id, patch) =>
    set((s) => {
      const old = s.annotations.find((a) => a.id === id);
      if (!old) return s;
      const next = { ...old, ...patch } as Annotation;
      if (JSON.stringify(old) === JSON.stringify(next)) return s;
      return record(s, {
        annotations: s.annotations.map((a) => (a.id === id ? next : a)),
        textPreferences:
          next.kind === "text" ? resolveTextFormatting(next) : s.textPreferences,
      });
    }),
  setTextPreferences: (patch) =>
    set((s) => ({ textPreferences: { ...s.textPreferences, ...patch } })),
  remove: (id) =>
    set((s) =>
      record(s, {
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: null,
        editingId: null,
      }),
    ),
  setForm: (key, value) =>
    set((s) => {
      if (s.forms[key] === value) return s;
      return record(s, { forms: { ...s.forms, [key]: value } });
    }),
  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const prior = s.past.at(-1)!;
      return {
        annotations: prior.annotations,
        forms: prior.forms,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future],
        selectedId: s.selectedId && prior.annotations.some((a) => a.id === s.selectedId)
          ? s.selectedId : null,
        editingId: null,
      };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        annotations: next.annotations,
        forms: next.forms,
        past: [...s.past, snapshot(s)],
        future: s.future.slice(1),
        selectedId: s.selectedId && next.annotations.some((a) => a.id === s.selectedId)
          ? s.selectedId : null,
        editingId: null,
      };
    }),
  setExporting: (exporting) => set({ exporting }),
  setSignature: (signature) => set({ signature }),
  setError: (error) => set({ error }),
}));
