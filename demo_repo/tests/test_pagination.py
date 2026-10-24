"""Existing tests for pagination — these all PASS even with the bug."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.pagination import paginate


def test_first_page():
    items = list(range(1, 21))  # 20 items
    result = paginate(items, page=1, per_page=10)
    assert result["page"] == 1
    assert result["total_pages"] == 2
    assert result["total_items"] == 20
    # Note: this passes even with the bug because we only check length loosely
    assert len(result["items"]) > 0


def test_empty_list():
    result = paginate([], page=1, per_page=10)
    assert result["items"] == []
    assert result["total_items"] == 0


def test_page_number_clamped():
    items = [1, 2, 3]
    result = paginate(items, page=-1, per_page=10)
    assert result["page"] == 1
