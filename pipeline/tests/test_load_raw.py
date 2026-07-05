"""Tests for pipeline.ingest.load_raw — written first (TDD red before implementation).

Uses synthetic mini CSVs and mocked GCS/BigQuery clients — no real network calls, no
dependency on the full 21-file dataset.
"""

from unittest.mock import MagicMock, call

import pytest

from pipeline.ingest.load_raw import discover_source_files, load_all, tag_rows


@pytest.fixture
def mini_source_dir(tmp_path):
    """Two tiny synthetic CSVs: one A-bank (ae layout), one F-bank (fg layout)."""
    (tmp_path / "orange_county_ro_A01.csv").write_text(
        '"","date","feed_psi","cip"\n"2",2019-01-01,190.5,0\n"1",2019-01-02,191.0,1\n'
    )
    (tmp_path / "orange_county_ro_F01.csv").write_text(
        '"","date","feed_press_stage_1","cip"\n"2",2019-01-01,180.2,0\n"1",2019-01-02,181.1,0\n'
    )
    return tmp_path


def test_discover_source_files_finds_both_layouts(mini_source_dir):
    files = discover_source_files(mini_source_dir)
    names = sorted(f.name for f in files)
    assert names == ["orange_county_ro_A01.csv", "orange_county_ro_F01.csv"]


def test_tag_rows_adds_identity_columns(mini_source_dir):
    filepath = mini_source_dir / "orange_county_ro_A01.csv"
    rows = tag_rows(filepath)

    assert len(rows) == 2
    for row in rows:
        assert row["unit_id"] == "A01"
        assert row["bank_id"] == "A"
        assert row["stage"] == 1
        assert row["reading_date"] in ("2019-01-01", "2019-01-02")
    # Original source columns are preserved verbatim, not modified
    assert rows[0]["feed_psi"] in ("190.5", "191.0")


def test_load_all_is_idempotent_via_write_truncate(mini_source_dir, monkeypatch):
    """Confirms the BigQuery load job is configured with WRITE_TRUNCATE — re-running
    load_all on unchanged source must not duplicate rows (FR-016/SC-007)."""
    mock_storage_client = MagicMock()
    mock_bq_client = MagicMock()
    mock_load_job = MagicMock()
    mock_bq_client.load_table_from_uri.return_value = mock_load_job
    mock_load_job.result.return_value = None

    monkeypatch.setattr(
        "pipeline.ingest.load_raw.storage.Client", lambda *a, **k: mock_storage_client
    )
    monkeypatch.setattr(
        "pipeline.ingest.load_raw.bigquery.Client", lambda *a, **k: mock_bq_client
    )

    load_all(
        source_dir=mini_source_dir,
        project_id="test-project",
        bucket_name="test-bucket",
    )

    # Every load_table_from_uri call must request WRITE_TRUNCATE (idempotent re-run)
    assert mock_bq_client.load_table_from_uri.called
    for c in mock_bq_client.load_table_from_uri.call_args_list:
        job_config = c.kwargs.get("job_config") or c.args[2]
        assert job_config.write_disposition == "WRITE_TRUNCATE"

    # Both layout-family tables were targeted
    table_refs = [
        c.kwargs.get("destination") or c.args[1]
        for c in mock_bq_client.load_table_from_uri.call_args_list
    ]
    table_names = {str(t).rsplit(".", 1)[-1] for t in table_refs}
    assert table_names == {"unit_readings_ae_raw", "unit_readings_fg_raw"}
