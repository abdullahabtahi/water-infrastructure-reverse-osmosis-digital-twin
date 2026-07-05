"""One-time, idempotent loader: OCWD CSVs -> GCS -> BigQuery ro_raw.* (WRITE_TRUNCATE).

Adds unit_id/bank_id/stage/reading_date identity columns; every other column is preserved
verbatim from the source (FR-001 — no modification of existing readings). Re-running this
script on unchanged source produces identical raw tables (FR-016/SC-007) because BigQuery load
jobs use WRITE_TRUNCATE rather than append/merge — appropriate for a static, one-time
historical backfill (see specs/001-data-foundation/research.md §1-2).
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
from pathlib import Path

from google.cloud import bigquery, storage

from pipeline.ingest.column_maps import parse_identity

logger = logging.getLogger(__name__)

_RAW_TABLES = {
    "ae": "unit_readings_ae_raw",
    "fg": "unit_readings_fg_raw",
}


def discover_source_files(source_dir: Path) -> list[Path]:
    """All orange_county_ro_*.csv files in source_dir, sorted for deterministic ordering."""
    return sorted(Path(source_dir).glob("orange_county_ro_*.csv"))


def tag_rows(filepath: Path) -> list[dict]:
    """Read one source CSV and return its rows tagged with identity columns.

    Every original column/value is preserved verbatim; only new columns are added
    (unit_id, bank_id, stage, reading_date) — satisfies FR-001/FR-003.
    """
    identity = parse_identity(filepath.name)
    rows: list[dict] = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tagged = dict(row)
            tagged["unit_id"] = identity.unit_id
            tagged["bank_id"] = identity.bank_id
            tagged["stage"] = identity.stage
            tagged["reading_date"] = row["date"]
            rows.append(tagged)
    return rows


def _rows_to_csv_bytes(rows: list[dict]) -> bytes:
    if not rows:
        return b""
    fieldnames = list(rows[0].keys())
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


def load_all(source_dir: Path, project_id: str, bucket_name: str) -> dict[str, int]:
    """Load every source CSV into its layout-family raw table.

    Returns a dict of {table_name: row_count} for verification by the caller.
    """
    storage_client = storage.Client(project=project_id)
    bq_client = bigquery.Client(project=project_id)
    bucket = storage_client.bucket(bucket_name)

    rows_by_family: dict[str, list[dict]] = {"ae": [], "fg": []}
    for filepath in discover_source_files(source_dir):
        identity = parse_identity(filepath.name)
        rows_by_family[identity.layout_family].extend(tag_rows(filepath))

    row_counts: dict[str, int] = {}
    for family, table_name in _RAW_TABLES.items():
        rows = rows_by_family[family]
        row_counts[table_name] = len(rows)
        if not rows:
            logger.warning("No rows found for layout family %r — skipping load", family)
            continue

        csv_bytes = _rows_to_csv_bytes(rows)
        blob_name = f"ocwd/{table_name}.csv"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(csv_bytes, content_type="text/csv")

        gcs_uri = f"gs://{bucket_name}/{blob_name}"
        destination = f"{project_id}.ro_raw.{table_name}"
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.CSV,
            skip_leading_rows=1,
            autodetect=True,
            write_disposition="WRITE_TRUNCATE",
        )
        load_job = bq_client.load_table_from_uri(
            gcs_uri, destination, job_config=job_config
        )
        load_job.result()
        logger.info("Loaded %d rows into %s", len(rows), destination)

    return row_counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Directory containing the 21 OCWD CSVs")
    parser.add_argument("--project", required=True, help="GCP project ID")
    parser.add_argument(
        "--bucket", default=None, help="GCS bucket (default: {project}-raw-data)"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    bucket_name = args.bucket or f"{args.project}-raw-data"
    row_counts = load_all(Path(args.source), args.project, bucket_name)
    total = sum(row_counts.values())
    print(f"Loaded {total} total rows: {row_counts}")


if __name__ == "__main__":
    main()
