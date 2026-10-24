"""
pagination.py — Demo Bug #1: Off-by-one in pagination
=====================================================
Bug: The last item on the final page is dropped because
     the slice uses `per_page - 1` instead of `per_page`.

Existing tests pass because they don't test the boundary case.
"""


def paginate(items: list, page: int = 1, per_page: int = 10) -> dict:
    """
    Return a page of results from `items`.

    Parameters
    ----------
    items : list
        The full list of items to paginate.
    page : int
        1-based page number.
    per_page : int
        Number of items per page.

    Returns
    -------
    dict with keys: items, page, per_page, total_items, total_pages
    """
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 10

    total_items = len(items)
    total_pages = max(1, (total_items + per_page - 1) // per_page)

    start = (page - 1) * per_page
    end = start + per_page - 1  # BUG: should be `start + per_page`

    return {
        "items": items[start:end],
        "page": page,
        "per_page": per_page,
        "total_items": total_items,
        "total_pages": total_pages,
    }
