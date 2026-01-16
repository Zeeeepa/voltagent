"""
Simple Python utility functions
"""

def calculate_average(numbers):
    """
    Calculate the average of a list of numbers.
    
    Args:
        numbers (list): A list of numeric values
        
    Returns:
        float: The average of the numbers
        
    Raises:
        ValueError: If the list is empty
        TypeError: If the list contains non-numeric values
    """
    if not numbers:
        raise ValueError("Cannot calculate average of an empty list")
    
    # Check if all elements are numeric
    for num in numbers:
        if not isinstance(num, (int, float)):
            raise TypeError(f"All elements must be numeric, got {type(num).__name__}")
    
    return sum(numbers) / len(numbers)


def greet_user(name, greeting="Hello"):
    """
    Generate a personalized greeting message.
    
    Args:
        name (str): The name of the person to greet
        greeting (str, optional): The greeting word. Defaults to "Hello"
        
    Returns:
        str: A formatted greeting message
    """
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Name must be a non-empty string")
    
    return f"{greeting}, {name.strip()}! Welcome!"


def is_prime(number):
    """
    Check if a number is prime.
    
    Args:
        number (int): The number to check
        
    Returns:
        bool: True if the number is prime, False otherwise
        
    Raises:
        TypeError: If the input is not an integer
        ValueError: If the number is less than 2
    """
    if not isinstance(number, int):
        raise TypeError("Input must be an integer")
    
    if number < 2:
        raise ValueError("Number must be 2 or greater")
    
    if number == 2:
        return True
    
    if number % 2 == 0:
        return False
    
    # Check odd divisors up to sqrt(number)
    for i in range(3, int(number ** 0.5) + 1, 2):
        if number % i == 0:
            return False
    
    return True


if __name__ == "__main__":
    # Example usage
    print("Testing the utility functions:")
    
    # Test calculate_average
    numbers = [1, 2, 3, 4, 5]
    avg = calculate_average(numbers)
    print(f"Average of {numbers}: {avg}")
    
    # Test greet_user
    greeting = greet_user("Alice")
    print(greeting)
    
    # Test is_prime
    test_number = 17
    prime_result = is_prime(test_number)
    print(f"Is {test_number} prime? {prime_result}")

