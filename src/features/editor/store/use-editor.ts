import { create } from "zustand";
import type { Annotation, FormValue, Tool } from "../types";
type Snapshot = { annotations: Annotation[]; forms: Record<string, FormValue> };
type State = {
  file: File | null;
  bytes: Uint8Array | null;
  pageCount: number;
  currentPage: number;
  tool: Tool;
  selectedId: string | null;
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
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  add: (a: Annotation) => void;
  update: (id: string, patch: Partial<Annotation>) => void;
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
      signature: null,
    }),
  setTool: (tool) => set({ tool, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
  setPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(2, zoom)) }),
  add: (a) =>
    set((s) =>
      record(s, {
        annotations: [...s.annotations, a],
        selectedId: a.id,
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
      });
    }),
  remove: (id) =>
    set((s) =>
      record(s, {
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: null,
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
        selectedId: null,
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
        selectedId: null,
      };
    }),
  setExporting: (exporting) => set({ exporting }),
  setSignature: (signature) => set({ signature }),
  setError: (error) => set({ error }),
}));
