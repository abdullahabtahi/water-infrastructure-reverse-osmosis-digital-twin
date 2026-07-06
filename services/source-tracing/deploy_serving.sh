#!/usr/bin/env bash
# Publish the source-tracing backend outputs (specs 003–007) to the correct BigQuery datasets,
# per the documented routing (specs/009-cloud-platform/data-model.md, infra/terraform/bigquery.tf):
#   - 003 physics deviation  -> ro_simulation  ("WaterTAP baseline + physics deviation scores")
#   - 005 fouling attribution -> ro_simulation  (analysis output; documented deviation — 005 has no
#                                                assigned dataset in the routing table; pending Abdullah)
#   - 004 forecasts           -> ro_forecasts   ("AI.FORECAST outputs")
#   - 006 economics           -> ro_forecasts   ("... LCOW, energy, SEC"; documented deviation)
# NOT ro_serving — that is Dataform-written UI KPI views (only the dataform@ SA may write it).
#
# Idempotent (--replace). Descriptive snake_case names + region pin + partition/cluster where a
# time column exists. Prereq: run_all.py produced data/*.csv; bq authenticated with write access.
set -euo pipefail

PROJECT="${GCP_PROJECT:-spatial-cat-489006-a4}"
LOC="us-central1"
HERE="$(cd "$(dirname "$0")" && pwd)"

load() {  # load <dataset.table> <csv> [extra bq flags...]
  local target="$1" csv="$2"; shift 2
  echo "→ ${target}  <-  ${csv}"
  bq --project_id="$PROJECT" --location="$LOC" load --autodetect --source_format=CSV \
     --replace --skip_leading_rows=1 "$@" "${target}" "${HERE}/data/${csv}"
}

# 003 — per-reading time series: partition by date, cluster by unit
load ro_simulation.deviation_scores    deviations.csv \
     --time_partitioning_field=reading_date --clustering_fields=unit_id,metric
# 005 — per-cycle aggregate: cluster only
load ro_simulation.fouling_attribution attributions.csv --clustering_fields=bank_id,unit_id
# 004 — per-cycle aggregate
load ro_forecasts.fouling_forecast     forecasts.csv    --clustering_fields=bank_id,unit_id
# 006 — per-cycle aggregate
load ro_forecasts.economics_tradeoff   economics.csv    --clustering_fields=bank_id,unit_id

echo "✅ published to ${PROJECT} (ro_simulation + ro_forecasts). Query e.g.:"
echo "   bq query --location=${LOC} --nouse_legacy_sql \\"
echo "     'SELECT * FROM \`${PROJECT}.ro_forecasts.fouling_forecast\` ORDER BY days_to_clean LIMIT 10'"
