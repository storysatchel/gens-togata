export type InlineBlockType = "h2" | "h3" | "h4" | "scenario" | "p" | "readaloud" | "synopsis" | "example" | "sidebar" | "procedure" | "list" | "table" | "statblock" | "endnotes";

export interface TextBlock { type: "h2" | "h3" | "h4" | "scenario" | "p" | "readaloud" | "synopsis" | "example"; text: string; style?: string }
export interface SidebarBlock { type: "sidebar"; title: string; body?: string[] }
export interface ProcedureBlock { type: "procedure"; title: string; steps: string[] }
export interface ListBlock { type: "list"; items: string[] }
export interface TableBlock { type: "table"; columns: string[]; rows: string[][]; style?: string }
export interface StatBlock { type: "statblock"; name?: string; kind?: string; desc?: string; chars?: Record<string, string | number>; derived?: Record<string, string | number>; fields?: { label?: string; text?: string }[] }
export interface EndnotesBlock { type: "endnotes"; title?: string; items: string[] }
export type ContentBlock = TextBlock | SidebarBlock | ProcedureBlock | ListBlock | TableBlock | StatBlock | EndnotesBlock;
export interface Chapter { title: string; blocks: ContentBlock[] }
export interface Metadata { title: string; subtitle: string; tagline: string; system: string; legal: string[] }
export interface DocumentData { meta: Metadata; chapters: Chapter[] }
