# Simple Async Python Functions

This directory contains examples of simple async Python functions demonstrating common asynchronous programming patterns.

## Functions Included

### 1. `fetch_data(url, timeout=10)`
- Fetches data from a URL asynchronously
- Handles timeouts and errors gracefully
- Returns the response text or None if failed

### 2. `process_multiple_urls(urls)`
- Processes multiple URLs concurrently using `asyncio.gather`
- Returns a dictionary mapping URLs to their response content
- Demonstrates concurrent execution for better performance

### 3. `simple_delay_function(message, delay=1.0)`
- A basic async function that waits for a specified delay
- Returns a timestamped message
- Good for understanding basic async/await patterns

## Installation

```bash
cd examples/python-async
pip install -r requirements.txt
```

## Usage

Run the example:

```bash
python async_example.py
```

This will demonstrate all three async functions in action.

## Key Concepts Demonstrated

- **async/await syntax**: Modern Python asynchronous programming
- **Concurrent execution**: Using `asyncio.gather()` for parallel operations
- **Error handling**: Proper exception handling in async functions
- **HTTP requests**: Asynchronous HTTP calls with aiohttp
- **Timeouts**: Handling request timeouts gracefully

## Requirements

- Python 3.7+
- aiohttp library for HTTP requests

