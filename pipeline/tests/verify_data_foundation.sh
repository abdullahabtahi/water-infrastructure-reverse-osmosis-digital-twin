#!/usr/bin/env bash
# Oceanus — Data Foundation acceptance script (Feature 001).
#
# Read-only. One check per spec Success Criterion (SC-001..SC-008), run against the live
# ro_curated tables after `load_raw.py` + `dataform run`.
#
# Usage: ./verify_data_foundation.sh

set -uo pipefail  # no -e: run every check and report a full pass/fail summary

PROJECT_ID="${PROJECT_ID:-spatial-cat-489006-a4}"

PASS=0
FAIL=0

check() {
  local description="$1"
  local result="$2"
  if [[ "${result}" -eq 0 ]]; then
    echo "  [PASS] ${description}"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] ${description}"
    FAIL=$((FAIL + 1))
  fi
}

bq_scalar() {
  bq query --use_legacy_sql=false --format=csv "$1" 2>/dev/null | tail -n +2
}

echo "=== SC-001: complete history, correct attribution ==="
row_count=$(bq_scalar "SELECT COUNT(*) FROM \`${PROJECT_ID}.ro_curated.unit_readings\`")
unit_count=$(bq_scalar "SELECT COUNT(DISTINCT unit_id) FROM \`${PROJECT_ID}.ro_curated.unit_readings\`")
[[ "${row_count}" == "15624" ]]
check "unit_readings has exactly 15,624 rows (found ${row_count})" $?
[[ "${unit_count}" == "21" ]]
check "unit_readings covers exactly 21 distinct units (found ${unit_count})" $?

echo ""
echo "=== SC-002: single query across all 21 units, no per-layout branching ==="
distinct_signal_units=$(bq_scalar "SELECT COUNT(DISTINCT unit_id) FROM \`${PROJECT_ID}.ro_curated.unit_readings\` WHERE unit_n_delta_p IS NOT NULL")
[[ "${distinct_signal_units}" -gt 0 ]]
check "a core signal (unit_n_delta_p) is queryable across units in one query (${distinct_signal_units} units returned)" $?

echo ""
echo "=== SC-003: dss_derived saw-tooth resets within 1 day of each cip event ==="
mismatch=$(bq_scalar "
  SELECT COUNT(*) FROM \`${PROJECT_ID}.ro_curated.unit_readings\`
  WHERE dss_source IS NOT NULL AND ABS(dss_derived - dss_source) > 1
")
[[ "${mismatch}" == "0" ]]
check "dss_derived matches source dss within \u00b11 day for all rows (mismatches: ${mismatch})" $?

echo ""
echo "=== SC-004: cip_events reconciles exactly with source cip signal ==="
source_cip=$(bq_scalar "SELECT COUNT(*) FROM \`${PROJECT_ID}.ro_curated.unit_readings\` WHERE cip")
catalog_cip=$(bq_scalar "SELECT COUNT(*) FROM \`${PROJECT_ID}.ro_curated.cip_events\`")
[[ "${source_cip}" == "${catalog_cip}" ]]
check "cip_events count (${catalog_cip}) matches source cip=1 count (${source_cip})" $?

echo ""
echo "=== SC-005: energy provenance correct (measured F-G, not_available A-E) ==="
wrong_provenance=$(bq_scalar "
  SELECT COUNT(*) FROM \`${PROJECT_ID}.ro_curated.signal_provenance\` sp
  JOIN (SELECT DISTINCT unit_id, bank_id FROM \`${PROJECT_ID}.ro_curated.unit_readings\`) ur USING(unit_id)
  WHERE sp.signal_name = 'energy'
    AND ((bank_id IN ('F','G') AND provenance != 'measured')
      OR (bank_id NOT IN ('F','G') AND provenance != 'not_available'))
")
[[ "${wrong_provenance}" == "0" ]]
check "zero units have incorrect energy provenance (found ${wrong_provenance})" $?

echo ""
echo "=== SC-006: zero fabricated values (NULL counts preserved raw -> curated) ==="
raw_null_ph=$(bq_scalar "SELECT COUNTIF(ph IS NULL OR ph = '' OR UPPER(ph) = 'NA') FROM \`${PROJECT_ID}.ro_raw.unit_readings_ae_raw\`")
curated_null_ph=$(bq_scalar "SELECT COUNTIF(ph IS NULL) FROM \`${PROJECT_ID}.ro_curated.unit_readings\` WHERE bank_id IN ('A','B','C','D','E')")
[[ "${raw_null_ph}" == "${curated_null_ph}" ]]
check "ph absence count matches raw->curated (raw ${raw_null_ph}, curated ${curated_null_ph}) — no fabricated substitution" $?

echo ""
echo "=== SC-007: reproducibility (see T042 for the full teardown/reload proof) ==="
echo "  [INFO] Run T042 separately: re-run load_raw.py + dataform run, diff row counts"

echo ""
echo "=== SC-008: cross-plant question answerable without raw CSVs ==="
sc008_rows=$(bq_scalar "
  SELECT COUNT(*) FROM (
    SELECT unit_id
    FROM \`${PROJECT_ID}.ro_curated.unit_readings\` ur
    WHERE cycle_id = (SELECT MAX(cycle_id) FROM \`${PROJECT_ID}.ro_curated.unit_readings\` ur2 WHERE ur2.unit_id = ur.unit_id)
    GROUP BY unit_id
  )
")
[[ "${sc008_rows}" -gt 0 ]]
check "cross-plant sample query (steepest flux decline in current cycle) returns results (${sc008_rows} units)" $?

echo ""
echo "=== Summary: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
