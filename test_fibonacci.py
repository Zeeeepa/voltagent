import unittest
from fibonacci import fibonacci, fibonacci_recursive, fibonacci_sequence


class TestFibonacci(unittest.TestCase):
    
    def test_fibonacci_base_cases(self):
        """Test base cases for Fibonacci function."""
        self.assertEqual(fibonacci(0), 0)
        self.assertEqual(fibonacci(1), 1)
    
    def test_fibonacci_sequence_values(self):
        """Test known Fibonacci sequence values."""
        expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
        for i, expected_value in enumerate(expected):
            self.assertEqual(fibonacci(i), expected_value)
    
    def test_fibonacci_negative_input(self):
        """Test that negative input raises ValueError."""
        with self.assertRaises(ValueError):
            fibonacci(-1)
    
    def test_fibonacci_recursive_matches_iterative(self):
        """Test that recursive and iterative versions produce same results."""
        for i in range(10):  # Test up to 10 to avoid slow recursive calls
            self.assertEqual(fibonacci(i), fibonacci_recursive(i))
    
    def test_fibonacci_sequence_function(self):
        """Test the fibonacci_sequence function."""
        result = fibonacci_sequence(5)
        expected = [0, 1, 1, 2, 3]
        self.assertEqual(result, expected)
    
    def test_fibonacci_sequence_empty(self):
        """Test fibonacci_sequence with count=0."""
        result = fibonacci_sequence(0)
        self.assertEqual(result, [])
    
    def test_fibonacci_sequence_negative_count(self):
        """Test that negative count raises ValueError."""
        with self.assertRaises(ValueError):
            fibonacci_sequence(-1)


if __name__ == "__main__":
    unittest.main()

