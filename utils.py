def greet_user(name, age=None):
    """
    A simple function that greets a user with their name and optionally their age.
    
    Args:
        name (str): The user's name
        age (int, optional): The user's age
    
    Returns:
        str: A personalized greeting message
    """
    if age is not None:
        return f"Hello, {name}! You are {age} years old."
    else:
        return f"Hello, {name}! Nice to meet you!"


def calculate_area_circle(radius):
    """
    Calculate the area of a circle given its radius.
    
    Args:
        radius (float): The radius of the circle
    
    Returns:
        float: The area of the circle
    """
    import math
    return math.pi * radius ** 2


def is_even(number):
    """
    Check if a number is even.
    
    Args:
        number (int): The number to check
    
    Returns:
        bool: True if the number is even, False otherwise
    """
    return number % 2 == 0


# Example usage
if __name__ == "__main__":
    # Test the functions
    print(greet_user("Alice"))
    print(greet_user("Bob", 25))
    print(f"Area of circle with radius 5: {calculate_area_circle(5):.2f}")
    print(f"Is 10 even? {is_even(10)}")
    print(f"Is 7 even? {is_even(7)}")

