# Sample Python code with various error handling issues
# This file is used to test the error handling analyzer

import json
import requests
import sqlite3
import logging

logger = logging.getLogger(__name__)

# ❌ Missing error handling for database operations
def get_user(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

# ❌ Empty except block (error swallowing)
def create_user(user_data):
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (name, email) VALUES (?, ?)', 
                      (user_data['name'], user_data['email']))
        conn.commit()
        conn.close()
        return True
    except:
        pass  # Silent failure - bad practice

# ❌ Generic exception handling
def update_user(user_id, data):
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET name = ?, email = ? WHERE id = ?',
                      (data['name'], data['email'], user_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("Something went wrong")
        raise e

# ❌ Missing error handling for JSON parsing
def parse_user_data(json_string):
    data = json.loads(json_string)  # Can raise JSONDecodeError
    return data

# ❌ No error handling for file operations
def save_user_avatar(user_id, image_data):
    with open(f'/uploads/{user_id}.jpg', 'wb') as f:
        f.write(image_data)  # Can raise IOError, PermissionError, etc.
    return f'/uploads/{user_id}.jpg'

# ❌ Missing error handling for HTTP requests
def fetch_user_profile(user_id):
    response = requests.get(f'/api/users/{user_id}')  # Can raise various exceptions
    return response.json()

# ❌ Resource leak - connection not properly closed
def get_user_stats(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM user_actions WHERE user_id = ?', (user_id,))
    stats = cursor.fetchone()
    return stats
    # Connection never closed!

# ❌ Missing error handling in loop
def process_user_batch(user_ids):
    results = []
    for user_id in user_ids:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        processed = process_user_data(user)  # Can raise exceptions
        results.append(processed)
        conn.close()
    return results

# ❌ Error propagation without context
def delete_user(user_id):
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
    except Exception as err:
        raise err  # No additional context

# ❌ Missing validation error handling
def validate_email(email):
    import re
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None  # Should handle invalid input

# ❌ Type conversion without error handling
def convert_user_age(age_string):
    return int(age_string)  # Can raise ValueError

# ✅ Good example with proper error handling
def get_user_safely(user_id):
    if not user_id or not isinstance(user_id, (int, str)):
        raise ValueError('Invalid user ID provided')
    
    conn = None
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise ValueError(f'User with ID {user_id} not found')
        
        logger.info(f'Successfully retrieved user {user_id}')
        return user
    except sqlite3.Error as e:
        logger.error(f'Database error while getting user {user_id}: {e}')
        raise RuntimeError(f'Unable to retrieve user: {e}')
    except Exception as e:
        logger.error(f'Unexpected error while getting user {user_id}: {e}')
        raise RuntimeError(f'Unable to retrieve user: {e}')
    finally:
        if conn:
            conn.close()

# ✅ Good example with context manager
def get_user_stats_safely(user_id):
    try:
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM user_actions WHERE user_id = ?', (user_id,))
            stats = cursor.fetchone()
            return stats
    except sqlite3.Error as e:
        logger.error(f'Database error while getting stats for user {user_id}: {e}')
        raise RuntimeError(f'Unable to retrieve user statistics: {e}')

# ✅ Good example with specific exception handling
def parse_user_data_safely(json_string):
    try:
        if not json_string or not isinstance(json_string, str):
            raise ValueError('Invalid JSON string provided')
        
        data = json.loads(json_string)
        return data
    except json.JSONDecodeError as e:
        logger.error(f'Invalid JSON format: {e}')
        raise ValueError(f'Unable to parse JSON: {e}')
    except Exception as e:
        logger.error(f'Unexpected error parsing JSON: {e}')
        raise RuntimeError(f'Unable to parse user data: {e}')

# Helper function that might raise exceptions
def process_user_data(user):
    if not user:
        raise ValueError('No user data provided')
    if len(user) < 3:  # Assuming user tuple has at least 3 fields
        raise ValueError('Incomplete user data')
    
    # Simulate processing
    return {'id': user[0], 'name': user[1], 'email': user[2], 'processed': True}

