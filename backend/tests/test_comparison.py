from app.services.comparison_service import match_clauses, material_difference


def test_equivalent_liability_wording_is_not_material():
    material, _reason = material_difference(
        "Liability shall not exceed $1 million.",
        "Liability shall be limited to $1 million.",
    )
    assert material is False


def test_unlimited_liability_is_a_material_change():
    material, reason = material_difference(
        "Liability capped at $1 million.",
        "Liability is unlimited.",
    )
    assert material is True
    assert "unlimited" in reason.lower()


def test_semantic_match_pairs_similar_clauses():
    left = [{"title": "Liability", "clause_type": "liability", "text": "Liability shall not exceed $1 million."}]
    right = [{"title": "Liability", "clause_type": "liability", "text": "Liability shall be limited to $1 million."}]
    result = match_clauses(left, right, [[1.0, 0.0, 0.0]], [[0.99, 0.01, 0.0]])
    assert len(result) == 1
    assert result[0].change_type == "MODIFIED"
    assert result[0].material_change is False
    assert result[0].risk_level == "Low"


def test_unrelated_clauses_are_added_and_removed():
    left = [{"title": "Liability", "text": "Liability shall not exceed $1 million."}]
    right = [{"title": "Payment", "text": "Invoices are payable within 90 days."}]
    result = match_clauses(left, right, [[1.0, 0.0, 0.0]], [[0.0, 1.0, 0.0]])
    kinds = {item.change_type for item in result}
    assert kinds == {"ADDED", "REMOVED"}


def test_changed_amount_is_material_after_a_semantic_pair():
    left = [{"title": "Liability", "text": "Liability shall not exceed $1 million."}]
    right = [{"title": "Liability", "text": "Liability shall not exceed $5 million."}]
    result = match_clauses(left, right, [[1.0, 0.0]], [[0.98, 0.02]])
    assert result[0].material_change is True
    assert result[0].risk_level == "High"
