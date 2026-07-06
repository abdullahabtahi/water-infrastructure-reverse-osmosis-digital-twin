---
name: "compliance-check"
description: >
  Checks plant operation against permit limits and regulatory thresholds using semantic
  search over plant documents and BigQuery operational records.
---

# Compliance Check Skill

## Purpose
Answer: "Are we within permit limits?", "What does the OCWD permit say about recovery?",
"Is Bank F's permeate quality in spec?"

## Evidence Contract
Every compliance assessment MUST include:
- The permit/spec source document (from `search_docs` result `source_document`)
- The specific threshold value from the document
- The measured/current operating value from `ro_curated.unit_readings`
- Whether the value is within or outside limits
- `provenance`: "plant-data" for measured parameters; "document-search" for permit text

## Honest Non-Answer Rule
If the document search returns no relevant chunk (low relevance score or empty):
→ "I could not find a grounded permit or specification for this parameter —
   please consult the plant's permit documents directly."
→ NEVER infer a regulatory threshold from training knowledge alone.

## Search Guidance
Use `search_docs(query)` with queries like:
- "recovery rate permit limit"
- "permeate TDS maximum"
- "concentrate disposal requirements"
Return the top-k chunks ranked by distance (lower = more similar).
