# Fibonacci Calculator

A simple Python implementation for calculating Fibonacci numbers with multiple approaches.

## Functions

### `fibonacci(n)`
Calculates the nth Fibonacci number using an efficient iterative approach.

**Parameters:**
- `n` (int): The position in the Fibonacci sequence (0-indexed)

**Returns:**
- `int`: The nth Fibonacci number

**Example:**
```python
from fibonacci import fibonacci

print(fibonacci(10))  # Output: 55
```

### `fibonacci_recursive(n)`
Calculates the nth Fibonacci number using recursion. Less efficient for large numbers due to repeated calculations.

**Parameters:**
- `n` (int): The position in the Fibonacci sequence (0-indexed)

**Returns:**
- `int`: The nth Fibonacci number

### `fibonacci_sequence(count)`
Generates a sequence of Fibonacci numbers.

**Parameters:**
- `count` (int): Number of Fibonacci numbers to generate

**Returns:**
- `list`: List of Fibonacci numbers

**Example:**
```python
from fibonacci import fibonacci_sequence

print(fibonacci_sequence(8))  # Output: [0, 1, 1, 2, 3, 5, 8, 13]
```

## Usage

Run the main script to see examples:
```bash
python fibonacci.py
```

Run tests:
```bash
python test_fibonacci.py
```

## Fibonacci Sequence

The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones:
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...

- F(0) = 0
- F(1) = 1  
- F(n) = F(n-1) + F(n-2) for n > 1

