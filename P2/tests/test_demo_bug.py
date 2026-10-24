
from demo_bug import calculate_average


def test_average_of_numbers():
    assert calculate_average([2, 4, 6]) == 4


def test_empty_list_returns_zero():
    assert calculate_average([]) == 0
    
def test_average_of_single_number():
    assert calculate_average([10]) == 10