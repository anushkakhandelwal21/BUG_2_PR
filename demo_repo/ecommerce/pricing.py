"""
pricing.py — Demo Bug #2: Negative price after >100% discount
==============================================================
Bug: No guard against discount_percent > 100, so a 150% discount
     returns a negative price instead of clamping to 0.
"""


def apply_discount(price: float, discount_percent: float) -> float:
    """
    Apply a percentage discount to a price.

    Parameters
    ----------
    price : float
        Original price (must be >= 0).
    discount_percent : float
        Discount percentage (e.g., 20 for 20% off).

    Returns
    -------
    float : discounted price
    """
    if price < 0:
        raise ValueError("Price cannot be negative")

    # BUG: no guard for discount_percent > 100 → returns negative price
    return round(price * (1 - discount_percent / 100), 2)


def calculate_total(items: list[dict]) -> float:
    """
    Calculate total price for a list of items.

    Each item dict should have 'price' and optionally 'discount' keys.
    """
    total = 0.0
    for item in items:
        price = item.get("price", 0)
        discount = item.get("discount", 0)
        total += apply_discount(price, discount)
    return round(total, 2)
