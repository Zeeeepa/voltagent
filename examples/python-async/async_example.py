import asyncio
import aiohttp
from typing import Optional


async def fetch_data(url: str, timeout: int = 10) -> Optional[str]:
    """
    A simple async function that fetches data from a URL.
    
    Args:
        url (str): The URL to fetch data from
        timeout (int): Request timeout in seconds (default: 10)
    
    Returns:
        Optional[str]: The response text if successful, None if failed
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    print(f"HTTP {response.status}: Failed to fetch data from {url}")
                    return None
    except asyncio.TimeoutError:
        print(f"Timeout: Request to {url} took longer than {timeout} seconds")
        return None
    except Exception as e:
        print(f"Error fetching data from {url}: {str(e)}")
        return None


async def process_multiple_urls(urls: list[str]) -> dict[str, Optional[str]]:
    """
    Process multiple URLs concurrently using asyncio.gather.
    
    Args:
        urls (list[str]): List of URLs to fetch
    
    Returns:
        dict[str, Optional[str]]: Dictionary mapping URLs to their response content
    """
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return {
        url: result if not isinstance(result, Exception) else None
        for url, result in zip(urls, results)
    }


async def simple_delay_function(message: str, delay: float = 1.0) -> str:
    """
    A simple async function that waits for a specified delay and returns a message.
    
    Args:
        message (str): The message to return
        delay (float): Delay in seconds (default: 1.0)
    
    Returns:
        str: The processed message with timestamp
    """
    await asyncio.sleep(delay)
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"[{timestamp}] Processed: {message}"


# Example usage
async def main():
    """
    Example usage of the async functions.
    """
    print("=== Simple Delay Function ===")
    result = await simple_delay_function("Hello, async world!", 2.0)
    print(result)
    
    print("\n=== Multiple URL Processing ===")
    urls = [
        "https://httpbin.org/json",
        "https://httpbin.org/uuid",
        "https://httpbin.org/ip"
    ]
    
    results = await process_multiple_urls(urls)
    for url, content in results.items():
        if content:
            print(f"✅ {url}: {len(content)} characters received")
        else:
            print(f"❌ {url}: Failed to fetch")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())

