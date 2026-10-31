---
name: corroborate
description: >-
  Corroborate claims, passages, changes, or answers against the user's compiled Obsidian wiki and its underlying source corpus. Use when asked to substantiate, fact-check, verify historical or research claims, or fill a wiki query's evidentiary gaps before resorting to the web. Use wiki-query first, then search indexed sources and ingest genuinely new source-grounded findings when needed; report support, contradictions, and gaps per claim. Do not use for code correctness or mere proofreading.
---

# Corroborate

Distinguish finding a relevant page from establishing that a claim is true. The aim is traceable evidence, including qualifications and disagreements, not a confident answer at any cost.

## 1. Define claims and scope

Read the requested text or changes in context. Break substantive factual claims into independently checkable propositions, retaining dates, populations, places, legal conditions, and quoted wording. Separate editorial preferences and implementation checks from factual claims. Resolve the user's vault, including any `@name` override, by the `llm-wiki` configuration protocol. Honor explicit no-web, read-only, visibility, source, and time constraints throughout.

## 2. Query the compiled wiki first

Read and follow `wiki-query` for each related cluster of claims: its configuration, graph/index retrieval, trust and lifecycle annotations, filters, citations, and query log. A relevant title or summary is a discovery aid, not corroboration: inspect relevant page sections and their source references before rating a claim. A wiki page may support an answer without independently corroborating its own underlying source. Preserve disagreements and historical scope.

`wiki-query` itself is read-only apart from its permitted log append. Complete that phase before any ingest; do not treat this skill as permission to override an explicitly read-only request or a visibility filter.

## 3. Fill evidence gaps from local sources before the web

For a miss, ambiguous or unsupported assertion, or request for independent corroboration, search the resolved vault's existing indexed source corpus. Check vault-specific source-search documentation and configured backends; when Antfly is available, follow `antfly-cli` and any vault-specific source-search instructions. Discover the actual table, indexes and locator fields rather than assuming a Rome-specific setup. Search distinct terms, dates, and counterevidence; inspect hits and adjacent original passages in context. Identify the work, author, edition or translation, and page, section, or other stable locator. A search snippet, retrieval score, or generated answer alone is not evidence. Do not count multiple chunks or editions of one work as independent sources.

For direct quotations, check the exact wording, translator, date and license or public-domain status required by the target project. If inaccessible, say unverified rather than reconstructing it.

If the source corpus or backend is unavailable, try documented alternatives for existing local sources. Only after local discovery fails to resolve a material gap, and only if the user has not prohibited external access, consult appropriate web sources. Identify web evidence separately, with links. Do not invent a source, claim absence from a corpus after an incomplete search, or silently substitute a source.

## 4. Enrich the wiki on a material gap

When source passages provide new material, switch explicitly from the completed `wiki-query` phase to `wiki-ingest`; read and follow its configuration, staging, provenance, linking, manifest and logging rules. Invoking corroborate authorizes ingestion of findings needed to fill a wiki evidence gap unless the user or higher-priority instructions require read-only operation. Respect `WIKI_STAGED_WRITES`; do not promote staged material without authorization. Update existing relevant pages instead of creating duplicates. Distinguish extracted claims from inferences and disputed interpretations; preserve source locators and uncertainty. For an already-ingested unchanged work, enrich from the newly examined passage without pretending the whole book is a new source or bypassing cache rules; record the precise provenance and follow the applicable existing-source update workflow. If no passage supports an update, leave the wiki unchanged and report the gap.

Never modify the artifact being assessed unless separately requested. If ingestion cannot be performed, still report the evidence found and explain the blocker.

## 5. Report

For each material claim, report **supported**, **qualified**, **contradicted**, or **not established**, with a brief reason, relevant `[[wiki links]]`, and underlying work plus exact available locator. Indicate whether the evidence comes from a wiki summary, an inspected wiki section, a source passage, or a web source; separate historical fact from interpretation. Identify unverified quotations and independent-source limits. State what was ingested or staged, or why no update was made, and report remaining gaps and failed/unavailable search paths. Avoid calling a merely relevant result corroboration.
