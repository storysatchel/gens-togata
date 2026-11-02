import type { Element } from "@vmprint/engine";

export interface Metadata { title: string; subtitle: string; tagline: string; system: string; legal: string[] }
export interface DocumentData { meta: Metadata; elements: Element[] }
