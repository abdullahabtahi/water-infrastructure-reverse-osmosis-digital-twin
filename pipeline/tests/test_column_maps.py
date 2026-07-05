"""Tests for pipeline.ingest.column_maps — written first (TDD red before implementation).

Confirms unit_id/bank_id/stage/layout_family parse correctly for all 21 real OCWD filenames.
"""

import pytest

from pipeline.ingest.column_maps import parse_identity

ALL_21_FILENAMES = [
    f"orange_county_ro_{bank}{stage:02d}.csv"
    for bank in "ABCDEFG"
    for stage in (1, 2, 3)
]


def test_all_21_filenames_present():
    assert len(ALL_21_FILENAMES) == 21


@pytest.mark.parametrize("filename", ALL_21_FILENAMES)
def test_parse_identity_extracts_unit_bank_stage(filename):
    identity = parse_identity(filename)
    bank = filename.replace("orange_county_ro_", "").replace(".csv", "")[0]
    stage = int(filename.replace("orange_county_ro_", "").replace(".csv", "")[1:])

    assert identity.unit_id == f"{bank}{stage:02d}"
    assert identity.bank_id == bank
    assert identity.stage == stage


@pytest.mark.parametrize(
    "bank,expected_family",
    [("A", "ae"), ("B", "ae"), ("C", "ae"), ("D", "ae"), ("E", "ae"), ("F", "fg"), ("G", "fg")],
)
def test_layout_family_matches_ae_fg_split(bank, expected_family):
    identity = parse_identity(f"orange_county_ro_{bank}01.csv")
    assert identity.layout_family == expected_family


def test_parse_identity_rejects_unrecognized_filename():
    with pytest.raises(ValueError):
        parse_identity("not_an_ocwd_file.csv")
