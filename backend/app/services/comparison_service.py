"""Pair clauses by embedding similarity, then decide if a wording change is material."""

import math
import re
from dataclasses import dataclass

_MONEY = re.compile(
    r"\$\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(million|billion|m|bn|k))?",
    re.IGNORECASE,
)
_DAYS = re.compile(r"(\d+)\s+days?", re.IGNORECASE)
_UNLIMITED = re.compile(
    r"unlimited\s+liability|liability\s+(?:shall\s+be\s+|is\s+)?unlimited",
    re.IGNORECASE,
)


@dataclass
class ComparedClause:
    title: str
    content_a: str
    content_b: str
    difference: str
    risk_level: str
    risk_analysis: str
    change_type: str
    material_change: bool


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def money_values(text: str) -> list[float]:
    values: list[float] = []
    for match in _MONEY.finditer(text):
        number = float(match.group(1).replace(",", ""))
        unit = (match.group(2) or "").lower()
        if unit in {"million", "m"}:
            number *= 1_000_000
        elif unit in {"billion", "bn"}:
            number *= 1_000_000_000
        elif unit == "k":
            number *= 1_000
        values.append(number)
    return values


def day_values(text: str) -> list[int]:
    return [int(match.group(1)) for match in _DAYS.finditer(text)]


def is_unlimited_liability(text: str) -> bool:
    return _UNLIMITED.search(text) is not None


def material_difference(left: str, right: str) -> tuple[bool, str]:
    left_unlimited = is_unlimited_liability(left)
    right_unlimited = is_unlimited_liability(right)
    if left_unlimited != right_unlimited:
        return True, "Liability changed between a capped amount and unlimited liability."
    left_money = money_values(left)
    right_money = money_values(right)
    if left_money and right_money:
        base = max(left_money[0], right_money[0], 1)
        if abs(left_money[0] - right_money[0]) / base > 0.05:
            return True, (
                f"A monetary amount changed from {left_money[0]:.0f} to {right_money[0]:.0f}."
            )
    left_days = day_values(left)
    right_days = day_values(right)
    if left_days and right_days and left_days[0] != right_days[0]:
        return True, f"A time period changed from {left_days[0]} days to {right_days[0]} days."
    return False, "The wording changed, but the extracted amount, duration, and liability cap match."


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def match_clauses(
    left: list[dict],
    right: list[dict],
    left_vectors: list[list[float]],
    right_vectors: list[list[float]],
    threshold: float = 0.75,
) -> list[ComparedClause]:
    scores: list[tuple[float, int, int]] = []
    for i, left_vector in enumerate(left_vectors):
        for j, right_vector in enumerate(right_vectors):
            scores.append((cosine(left_vector, right_vector), i, j))
    scores.sort(key=lambda item: item[0], reverse=True)
    used_left: set[int] = set()
    used_right: set[int] = set()
    paired: list[ComparedClause] = []
    for score, i, j in scores:
        if score < threshold or i in used_left or j in used_right:
            continue
        used_left.add(i)
        used_right.add(j)
        paired.append(_compare_pair(left[i], right[j], score))
    for i, clause in enumerate(left):
        if i not in used_left:
            paired.append(_removed(clause))
    for j, clause in enumerate(right):
        if j not in used_right:
            paired.append(_added(clause))
    return paired


def _compare_pair(left: dict, right: dict, score: float) -> ComparedClause:
    text_a = left.get("text", "")
    text_b = right.get("text", "")
    title = left.get("title") or right.get("title") or left.get("clause_type") or "Clause"
    if _normalize(text_a) == _normalize(text_b):
        return ComparedClause(
            title=title,
            content_a=text_a,
            content_b=text_b,
            difference="The clauses match.",
            risk_level="Low",
            risk_analysis=f"Semantic similarity {score:.2f}. No textual change.",
            change_type="UNCHANGED",
            material_change=False,
        )
    material, reason = material_difference(text_a, text_b)
    return ComparedClause(
        title=title,
        content_a=text_a,
        content_b=text_b,
        difference="MODIFIED" if not material else "MODIFIED — material change",
        risk_level="High" if material else "Low",
        risk_analysis=reason,
        change_type="MODIFIED",
        material_change=material,
    )


def _removed(clause: dict) -> ComparedClause:
    return ComparedClause(
        title=clause.get("title") or clause.get("clause_type") or "Clause",
        content_a=clause.get("text", ""),
        content_b="",
        difference="REMOVED",
        risk_level="Medium",
        risk_analysis="This clause is present in Agreement A and has no semantic match in Agreement B.",
        change_type="REMOVED",
        material_change=True,
    )


def _added(clause: dict) -> ComparedClause:
    return ComparedClause(
        title=clause.get("title") or clause.get("clause_type") or "Clause",
        content_a="",
        content_b=clause.get("text", ""),
        difference="ADDED",
        risk_level="Medium",
        risk_analysis="This clause is present in Agreement B and has no semantic match in Agreement A.",
        change_type="ADDED",
        material_change=True,
    )
