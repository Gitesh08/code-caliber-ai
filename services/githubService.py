import aiohttp
import asyncio
from typing import Optional
import tempfile
from pathlib import Path
import zipfile
import io

async def check_repository_exists(owner: str, repo: str) -> bool:
    """Check if a GitHub repository exists and is accessible."""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    
    async with aiohttp.ClientSession() as session:
        async with session.head(url) as response:
            return response.status == 200

async def download_github_repository(repo_url: str) -> bytes:
    """Download a GitHub repository as a ZIP file."""
    # Convert repository URL to ZIP download URL
    # Example: https://github.com/owner/repo -> https://github.com/owner/repo/archive/refs/heads/main.zip
    zip_url = repo_url.rstrip('/') + '/archive/refs/heads/main.zip'
    
    async with aiohttp.ClientSession() as session:
        async with session.get(zip_url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download repository: HTTP {response.status}")
            
            return await response.read()

async def get_repository_info(owner: str, repo: str) -> Optional[dict]:
    """Get detailed information about a GitHub repository."""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            return None