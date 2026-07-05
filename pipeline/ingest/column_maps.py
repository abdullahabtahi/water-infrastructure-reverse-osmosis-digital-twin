"""Pure functions extracting unit/bank/stage identity from an OCWD source filename.

No I/O here — keeps this module trivially unit-testable (pipeline/tests/test_column_maps.py).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_FILENAME_PATTERN = re.compile(r"^orange_county_ro_([A-G])(\d{2})\.csv$")

# Banks A-E use the 128-column layout; banks F-G use the 117-column layout.
# Verified directly against the source CSV headers during /speckit.plan (research.md).
_AE_BANKS = frozenset("ABCDE")
_FG_BANKS = frozenset("FG")


@dataclass(frozen=True)
class UnitIdentity:
    unit_id: str
    bank_id: str
    stage: int
    layout_family: str  # "ae" or "fg"


def parse_identity(filename: str) -> UnitIdentity:
    """Parse unit_id/bank_id/stage/layout_family from a source CSV filename.

    Raises ValueError if the filename doesn't match the known OCWD naming convention.
    """
    match = _FILENAME_PATTERN.match(filename)
    if match is None:
        raise ValueError(
            f"Unrecognized OCWD filename: {filename!r} "
            "(expected 'orange_county_ro_<BANK><STAGE>.csv', e.g. 'orange_county_ro_A01.csv')"
        )

    bank_id, stage_str = match.groups()
    stage = int(stage_str)

    if bank_id in _AE_BANKS:
        layout_family = "ae"
    elif bank_id in _FG_BANKS:
        layout_family = "fg"
    else:
        raise ValueError(f"Unknown bank {bank_id!r} in filename {filename!r}")

    return UnitIdentity(
        unit_id=f"{bank_id}{stage:02d}",
        bank_id=bank_id,
        stage=stage,
        layout_family=layout_family,
    )
