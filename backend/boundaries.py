"""Default-deny refusal logic — encodes the hard boundaries as behavior.

Only trait SNPs on traits.ALLOWLIST are ever interpreted. Everything else
(APOE, BRCA, any clinical/health variant) is refused by default. This is safer
than an rsid->risk-category classifier: a new disease SNP is refused because it
simply isn't on the allowlist, not because we recognized it.

TODO(P2/P1 — build fully): also encode the category-6 "honesty" answers:
  - "give me a finer breakdown" -> explain we're an interpretation layer, not a
    re-inference engine
  - "what's my health risk" -> hard NO + why (out of scope, regulatory line)
  - "tell me my exact ethnic group" -> honest limits grounded in the literature
"""
from __future__ import annotations

from backend.traits import ALLOWLIST

REFUSAL_MESSAGE = (
    "We only interpret a small set of vetted, non-medical trait markers. We do "
    "not interpret clinical or health-risk variants."
)


def is_allowed(rsid: str) -> bool:
    return rsid in ALLOWLIST


def refuse(rsid: str) -> dict:
    return {"rsid": rsid, "refused": True, "reason": REFUSAL_MESSAGE}
