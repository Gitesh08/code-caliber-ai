from typing import Dict, Set, TypedDict, List
from dataclasses import dataclass
from pathlib import Path

@dataclass
class FileInfo:
    path: str
    extension: str
    size: int
    references: Set[str]

class ProjectStructure(TypedDict):
    files: Dict[str, FileInfo]
    dependencies: Dict[str, Set[str]]
    entry_points: Set[str]
    file_groups: Dict[str, List[str]]

FILE_GROUPS = {
    'frontend': {'.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.scss', '.less', '.svelte'},
    'backend': {'.py', '.java', '.rb', '.php', '.go', '.cs', '.rs'},
    'mobile': {'.swift', '.kt', '.dart', '.m', '.mm'},
    'config': {'.json', '.yaml', '.yml', '.toml', '.ini', '.conf'},
    'database': {'.sql', '.psql', '.pls'},
    'documentation': {'.md', '.rst', '.tex'},
    'build': {'.gradle', '.cmake', '.make', '.rake'},
    'smart_contracts': {'.sol', '.vyper'},
    'ai_ml': {'.ipynb'},
    'system': {'.c', '.cpp', '.h', '.hpp', '.asm', '.s'}
}

ALLOWED_EXTENSIONS = {ext for extensions in FILE_GROUPS.values() for ext in extensions}