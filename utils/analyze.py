import re
from pathlib import Path
from typing import Set

def is_entry_point(file_path: Path) -> bool:
    entry_point_patterns = {
        '.py': ['if __name__ == "__main__":', 'app = FastAPI()', 'app = Flask()'],
        '.js': ['index.js', 'main.js', 'app.js'],
        '.java': ['public static void main'],
        '.go': ['func main()'],
        '.rs': ['fn main()']
    }
    
    if file_path.name.lower() in ['index.html', 'package.json', 'cargo.toml', 'build.gradle']:
        return True
        
    if file_path.suffix in entry_point_patterns:
        try:
            content = file_path.read_text()
            return any(pattern in content for pattern in entry_point_patterns[file_path.suffix])
        except:
            return False
    
    return False

def find_dependencies(file_path: Path, all_files: Set[str]) -> Set[str]:
    dependencies = set()
    try:
        content = file_path.read_text()
        
        import_patterns = {
            '.py': [r'import\s+(\w+)', r'from\s+(\w+)\s+import'],
            '.js': [r'import.*from\s+[\'"](.+?)[\'"]', r'require\([\'"](.+?)[\'"]\)'],
            '.java': [r'import\s+([\w.]+)', r'package\s+([\w.]+)'],
            '.ts': [r'import.*from\s+[\'"](.+?)[\'"]'],
            '.go': [r'import\s+[\(]?["\'](.*?)["\']'],
            '.rs': [r'use\s+([\w:]+)'],
        }
        
        patterns = import_patterns.get(file_path.suffix, [])
        for pattern in patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                import_path = match.group(1)
                potential_files = resolve_import_to_files(import_path, file_path, all_files)
                dependencies.update(potential_files)
                    
    except Exception:
        pass
    
    return dependencies

def resolve_import_to_files(import_path: str, current_file: Path, all_files: Set[str]) -> Set[str]:
    resolved = set()
    current_dir = current_file.parent
    potential_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs'}
    
    for ext in potential_extensions:
        potential_path = (current_dir / f"{import_path}{ext}").relative_to(current_file.parent.parent)
        if str(potential_path) in all_files:
            resolved.add(str(potential_path))
            
        potential_index = (current_dir / import_path / f"index{ext}").relative_to(current_file.parent.parent)
        if str(potential_index) in all_files:
            resolved.add(str(potential_index))
    
    return resolved