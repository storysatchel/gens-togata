import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Element } from "@vmprint/engine";
import type { DocumentData, Metadata } from "./types";
import { tableError } from "./compositions";
import { bookTheme } from "../templates/styles";

const structuralTypes = ["story", "list", "list-item", "table", "table-row", "table-cell", "text", "image", "strip", "zone-map"];
const semanticGlyphs = ["dice:boost", "dice:setback", "dice:difficulty", "dice:ability", "dice:proficiency", "dice:challenge", "result:advantage", "result:success", "result:triumph", "result:threat", "result:failure", "result:despair"];
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export async function loadDocument(path: string): Promise<DocumentData> {
  const source = await readFile(path, "utf8");
  let data: unknown;
  try { data = parse(source); } catch (error) { throw new Error(`${path}: invalid YAML: ${String(error)}`); }
  const fail = (location: string, message: string): never => { throw new Error(`${path}: ${location}: ${message}`); };
  if (!object(data)) return fail("document", "expected an object with meta and elements");
  if (Object.keys(data).some(key => key !== "meta" && key !== "elements")) fail("document", "only meta and elements are supported");
  const meta = data.meta;
  if (!object(meta)) return fail("meta", "expected an object");
  for (const key of ["title", "subtitle", "tagline", "system"]) if (typeof meta[key] !== "string") fail(`meta.${key}`, "expected a string");
  if (!Array.isArray(meta.legal) || meta.legal.some(value => typeof value !== "string")) fail("meta.legal", "expected an array of strings");
  if (Object.keys(meta).some(key => !["title", "subtitle", "tagline", "system", "legal"].includes(key))) fail("meta", "unknown metadata property");
  if (!Array.isArray(data.elements)) return fail("elements", "expected an array");
  const ids = new Set<string>();
  let chapter = "";
  let audioPart = 0;
  let notes = new Set<number>();
  let references: { number: number; location: string }[] = [];
  const finishChapter = () => {
    for (const ref of references) if (!notes.has(ref.number)) fail(ref.location, `note ${ref.number} does not exist in chapter ${chapter}`);
    notes = new Set(); references = [];
  };
  const visit = (value: unknown, location: string, parent?: string): void => {
    if (!object(value)) return fail(location, "expected an element object");
    const allowed = ["type", "name", "content", "children", "properties", "columns", "gutter", "balance", "columnSpan", "table", "list", "image", "slots", "stripLayout", "zones", "zoneLayout", "placement", "dropCap"];
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(location, `unsupported element property ${key}`);
    if (typeof value.type !== "string" || (!structuralTypes.includes(value.type) && !Object.hasOwn(bookTheme.styles, value.type))) return fail(location, `unsupported element type ${String(value.type)}`);
    const type = value.type;
    if (typeof value.content !== "string") fail(location, "content must be a string");
    if (!object(value.properties)) return fail(location, "properties with sourceId are required");
    const props = value.properties;
    if (typeof props.sourceId !== "string" || !props.sourceId.trim()) return fail(location, "sourceId must be a nonempty string");
    if (props.sourceId.startsWith("toc-")) fail(location, "sourceId prefix toc- is reserved for generated contents");
    if (ids.has(props.sourceId)) fail(location, `duplicate sourceId ${props.sourceId}`);
    ids.add(props.sourceId);
    if (props.style !== undefined && !object(props.style)) fail(location, "properties.style must be an object");
    if (props.semanticRole !== undefined && (typeof props.semanticRole !== "string" || !props.semanticRole.trim())) fail(location, "semanticRole must be a nonempty string");
    const role = props.semanticRole;
    if (role === "chapter") {
      if (parent || type !== "h1") fail(location, "chapter must be a root h1");
      finishChapter(); chapter = props.sourceId;
      const group = props.audioPart;
      if (group !== undefined) {
        if (typeof group !== "number" || !Number.isInteger(group) || group < 1 || group < audioPart || group > audioPart + 1) fail(location, "audioPart must start at 1 and advance sequentially");
        audioPart = group as number;
      }
    }
    if (role === "part" && (parent || type !== "h1" || typeof props.partLabel !== "string" || typeof props.partTitle !== "string" || !props.partTitle)) fail(location, "part must be a root h1 with partLabel and partTitle");
    if (role === "note") {
      if (!chapter || parent !== "list" || type !== "list-item" || typeof props.noteNumber !== "number" || !Number.isInteger(props.noteNumber) || props.noteNumber < 1) fail(location, "note must be a numbered list item in a chapter");
      const number = props.noteNumber as number;
      if (notes.has(number)) fail(location, `duplicate note ${number}`);
      notes.add(number);
    }
    if (role === "note-ref") {
      if (!chapter || type !== "text" || !/^[1-9]\d*$/.test(value.content as string)) fail(location, "note-ref must be a positive number in a chapter");
      references.push({ number: Number(value.content), location });
    }
    if (typeof role === "string" && (role.startsWith("dice:") || role.startsWith("result:")) && (type !== "text" || !semanticGlyphs.includes(role))) fail(location, "invalid dice or result text role");
    if (value.children !== undefined && !Array.isArray(value.children)) fail(location, "children must be an array");
    if (type === "text" && value.children !== undefined) fail(location, "text runs cannot have children");
    if (type === "story") {
      if (!Number.isInteger(value.columns) || (value.columns as number) < 1 || typeof value.gutter !== "number" || value.gutter < 0 || typeof value.balance !== "boolean" || !Array.isArray(value.children)) fail(location, "story requires columns, gutter, balance, and children");
    } else if (value.columns !== undefined || value.gutter !== undefined || value.balance !== undefined) fail(location, "columns, gutter, and balance belong to stories");
    if (value.columnSpan !== undefined && (parent !== "story" || (value.columnSpan !== "all" && (!Number.isInteger(value.columnSpan) || (value.columnSpan as number) < 1)))) fail(location, "columnSpan requires a story child and a positive span or all");
    if (type === "table") {
      if (!object(value.table)) fail(location, "table layout is required");
      const problem = tableError(value as unknown as Element);
      if (problem) fail(location, problem);
    } else if (value.table !== undefined) fail(location, "table layout belongs to a table");
    if (type === "table-row" && parent !== "table") fail(location, "table-row must belong to a table");
    if (type === "table-cell" && parent !== "table-row") fail(location, "table-cell must belong to a table-row");
    if (type === "list") {
      if (!object(value.list) || !["ordered", "unordered"].includes(String(value.list.kind)) || !Array.isArray(value.children) || value.children.some(child => !object(child) || child.type !== "list-item")) fail(location, "list requires a kind and list-item children");
    } else if (value.list !== undefined) fail(location, "list layout belongs to a list");
    if (type === "list-item" && parent !== "list") fail(location, "list-item must belong to a list");
    if (value.placement !== undefined && (parent !== "story" || !object(value.placement) || !["float", "story-absolute"].includes(String(value.placement.mode)))) fail(location, "placement requires a story child and a valid mode");
    if (value.dropCap !== undefined && !object(value.dropCap)) fail(location, "dropCap must be an object");
    if (type === "image") {
      if (!object(value.image) || typeof value.image.data !== "string" || !value.image.data) fail(location, "image requires embedded data");
    } else if (value.image !== undefined) fail(location, "image payload belongs to an image");
    const regions = (key: "slots" | "zones", layout: "stripLayout" | "zoneLayout", expected: string) => {
      if (type !== expected) {
        if (value[key] !== undefined || value[layout] !== undefined) fail(location, `${key} belongs to ${expected}`);
        return;
      }
      if (value[layout] !== undefined && !object(value[layout])) fail(location, `${layout} must be an object`);
      const entries = value[key];
      if (!Array.isArray(entries) || !entries.length) return fail(location, `${expected} requires nonempty ${key}`);
      entries.forEach((entry, index) => {
        const where = `${location}.${key}[${index}]`;
        if (!object(entry) || !Array.isArray(entry.elements)) return fail(where, "expected a region with elements");
        if (entry.id !== undefined && (typeof entry.id !== "string" || !entry.id)) fail(where, "region id must be a nonempty string");
        if (entry.style !== undefined && !object(entry.style)) fail(where, "region style must be an object");
        entry.elements.forEach((child, childIndex) => visit(child, `${where}.elements[${childIndex}]`, expected));
      });
    };
    regions("slots", "stripLayout", "strip");
    regions("zones", "zoneLayout", "zone-map");
    if (Array.isArray(value.children)) value.children.forEach((child, index) => visit(child, `${location}.children[${index}]`, type));
  };
  data.elements.forEach((element, index) => visit(element, `elements[${index}]`));
  finishChapter();
  return { meta: meta as unknown as Metadata, elements: data.elements as Element[] };
}
