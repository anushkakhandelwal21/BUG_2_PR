def calculate_average(numbers):
    """Calculate the average of a list of numbers. Returns 0 for an empty list."""
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)
