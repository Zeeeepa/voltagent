"""
Simple Python functions to calculate Fibonacci numbers.

This module provides different implementations of Fibonacci number calculation:
1. Recursive approach (simple but inefficient for large numbers)
2. Iterative approach (efficient and recommended)
3. Memoized recursive approach (efficient with caching)
"""

def fibonacci_recursive(n):
    """
    Calculate the nth Fibonacci number using recursion.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        int: The nth Fibonacci number
        
    Note:
        This is inefficient for large n due to repeated calculations.
        Time complexity: O(2^n)
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if n <= 1:
        return n
    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


def fibonacci_iterative(n):
    """
    Calculate the nth Fibonacci number using iteration.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        int: The nth Fibonacci number
        
    Note:
        This is efficient and recommended for most use cases.
        Time complexity: O(n), Space complexity: O(1)
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b


def fibonacci_memoized(n, memo=None):
    """
    Calculate the nth Fibonacci number using memoization.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        memo (dict): Cache for previously calculated values
        
    Returns:
        int: The nth Fibonacci number
        
    Note:
        This combines the elegance of recursion with efficiency.
        Time complexity: O(n), Space complexity: O(n)
    """
    if memo is None:
        memo = {}
    
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    
    memo[n] = fibonacci_memoized(n - 1, memo) + fibonacci_memoized(n - 2, memo)
    return memo[n]


def fibonacci_sequence(count):
    """
    Generate a sequence of Fibonacci numbers.
    
    Args:
        count (int): Number of Fibonacci numbers to generate
        
    Returns:
        list: List of the first 'count' Fibonacci numbers
    """
    if count < 0:
        raise ValueError("count must be a non-negative integer")
    if count == 0:
        return []
    if count == 1:
        return [0]
    
    sequence = [0, 1]
    for i in range(2, count):
        sequence.append(sequence[i-1] + sequence[i-2])
    return sequence


# Example usage and testing
if __name__ == "__main__":
    # Test the functions
    print("Fibonacci Numbers (first 10):")
    for i in range(10):
        print(f"F({i}) = {fibonacci_iterative(i)}")
    
    print("\nFibonacci sequence (first 15 numbers):")
    print(fibonacci_sequence(15))
    
    # Performance comparison for larger numbers
    import time
    
    n = 30
    print(f"\nCalculating F({n}) using different methods:")
    
    # Iterative (fastest)
    start = time.time()
    result_iter = fibonacci_iterative(n)
    time_iter = time.time() - start
    print(f"Iterative: {result_iter} (Time: {time_iter:.6f}s)")
    
    # Memoized (fast)
    start = time.time()
    result_memo = fibonacci_memoized(n)
    time_memo = time.time() - start
    print(f"Memoized: {result_memo} (Time: {time_memo:.6f}s)")
    
    # Recursive (slow for large n, so we'll use a smaller number)
    if n <= 35:  # Only test recursive for smaller numbers
        start = time.time()
        result_rec = fibonacci_recursive(n)
        time_rec = time.time() - start
        print(f"Recursive: {result_rec} (Time: {time_rec:.6f}s)")
    else:
        print("Recursive: Skipped (too slow for large numbers)")

