"""Existing tests for pricing — these all PASS even with the bug."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ecommerce.pricing import apply_discount, calculate_total


def test_basic_discount():
    assert apply_discount(100, 20) == 80.0


def test_zero_discount():
    assert apply_discount(50, 0) == 50.0


def test_full_discount():
    assert apply_discount(100, 100) == 0.0


def test_negative_price_raises():
    import pytest
    with pytest.raises(ValueError):
        apply_discount(-10, 10)


def test_calculate_total():
    items = [
        {"price": 100, "discount": 10},
        {"price": 50, "discount": 0},
    ]
    assert calculate_total(items) == 140.0
