import google.generativeai as genai
import zipfile
import tempfile
from pathlib import Path
import json
from typing import Dict, Set
from schema.models import ProjectStructure, FILE_GROUPS, FileInfo
from utils.analyze import is_entry_point, find_dependencies

def initialize_ai_model(api_key: str):
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-pro')

async def extract_and_analyze_project(zip_content: bytes, allowed_extensions: set) -> ProjectStructure:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir = Path(temp_dir)
        zip_path = temp_dir / "temp.zip"
        
        # Save and extract zip
        with open(zip_path, "wb") as f:
            f.write(zip_content)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        structure: ProjectStructure = {
            "files": {},
            "dependencies": {},
            "entry_points": set(),
            "file_groups": {group: [] for group in FILE_GROUPS.keys()}
        }
        
        # Map project structure
        for file_path in temp_dir.rglob('*'):
            if file_path.is_file() and file_path.suffix in allowed_extensions:
                relative_path = str(file_path.relative_to(temp_dir))
                
                # Categorize file
                for group, extensions in FILE_GROUPS.items():
                    if file_path.suffix in extensions:
                        structure["file_groups"][group].append(relative_path)
                
                # Store file info
                structure["files"][relative_path] = FileInfo(
                    path=relative_path,
                    extension=file_path.suffix,
                    size=file_path.stat().st_size,
                    references=set()
                )
                
                if is_entry_point(file_path):
                    structure["entry_points"].add(relative_path)
        
        # Find file dependencies
        for file_path in structure["files"].keys():
            dependencies = find_dependencies(temp_dir / file_path, structure["files"].keys())
            structure["dependencies"][file_path] = dependencies
            for dep in dependencies:
                structure["files"][dep].references.add(file_path)
    
    return structure

async def analyze_code_files(zip_content: bytes, api_key: str, custom_instructions: str, allowed_extensions: set) -> Dict:
    model = initialize_ai_model(api_key)
    
    project_structure = await extract_and_analyze_project(zip_content, allowed_extensions)
    
    # Convert sets to lists for JSON serialization
    serializable_structure = json.loads(json.dumps(project_structure, default=set_to_list))
    
    # Generate project overview
    overview_prompt = f"""
    Analyze this project structure and provide a comprehensive technical documentation overview:
    
    Project Statistics:
    - Total Files: {len(serializable_structure['files'])}
    - Entry Points: {serializable_structure['entry_points']}
    - File Categories: {json.dumps({k: len(v) for k, v in serializable_structure['file_groups'].items() if v})}
    
    Custom Instructions: {custom_instructions}
    
    Provide a clear and easy-to-understand guide that even non-experts can comprehend:
    1. Project type and main purpose: Explain how the product works in simple terms.
    2. Architecture overview: Simplify the complicated ideas into a clear structure.
    3. Key components and their relationships: Document internal processes and how they interact.
    4. Technologies used: List and briefly explain the main technologies for non-technical stakeholders.
    5. Project organization analysis: Capture valuable information about the project structure.
    6. User guide: Provide a brief guide on how to use or interact with the main features of the project.
    7. Troubleshooting: Include common issues and their solutions for developers and users.
    8. Generate a Mermaid diagram showing the high-level architecture and component relationships in a simple, easy-to-understand format.
    
    Remember to make all information easy to find and reference, using clear headings and bullet points where appropriate.
    """
    
    overview_response = model.generate_content(overview_prompt)
    
    # Generate detailed component analysis
    components_prompt = f"""
    Analyze each major component of the project and create technical documentation that simplifies complicated ideas:
    
    Entry Points: {serializable_structure['entry_points']}
    File Categories: {json.dumps(serializable_structure['file_groups'])}
    Dependencies: {json.dumps(serializable_structure['dependencies'])}
    
    For each major component, provide a clear and concise guide:
    1. Purpose and functionality: Explain in simple terms what the component does and why it's important.
    2. Integration with other components: Describe how it fits into the overall system using easy-to-understand analogies.
    3. Usage instructions: Provide step-by-step guidelines on how to use or interact with the component.
    4. Common pitfalls and solutions: List potential issues users might encounter and how to resolve them.
    5. Best practices: Offer tips for optimal use of the component.
    
    Ensure the documentation is accessible to both technical and non-technical stakeholders.
    """
    
    components_response = model.generate_content(components_prompt)
    
    # Generate features, limitations, and future scope
    analysis_prompt = f"""
    Based on the project structure and previous analysis, provide a comprehensive technical document that:
    
    Entry Points: {serializable_structure['entry_points']}
    File Categories: {json.dumps(serializable_structure['file_groups'])}
    Dependencies: {json.dumps(serializable_structure['dependencies'])}
    
    1. Key Features: 
       - List and briefly describe the main features of the project in non-technical terms.
       - Explain how each feature benefits the end-user or solves a specific problem.

    2. Limitations and Constraints: 
       - Identify current limitations of the project.
       - Explain these limitations in a way that non-technical stakeholders can understand.
       - Provide workarounds or temporary solutions where applicable.

    3. Future Scope: 
       - Suggest potential areas for expansion or new features.
       - Explain how these additions would enhance the project's value or functionality.

    4. Improvement Areas: 
       - Recommend specific improvements for code quality, architecture, or performance.
       - Translate technical improvements into business benefits for stakeholders.

    5. Maintenance Guide:
       - Provide simple instructions for keeping the project up-to-date and running smoothly.
       - Include a checklist of regular maintenance tasks.

    6. FAQs:
       - Anticipate and answer common questions that users or stakeholders might have about the project.

    Remember to use clear, concise language and avoid jargon. The goal is to create documentation that empowers all stakeholders with easily accessible and understandable information.
    """
    
    analysis_response = model.generate_content(analysis_prompt)
    
    return {
        "project_overview": {
            "overview": overview_response.text,
            "statistics": {
                "total_files": len(serializable_structure['files']),
                "entry_points": serializable_structure['entry_points'],
                "file_categories": {k: len(v) for k, v in serializable_structure['file_groups'].items() if v}
            }
        },
        "component_analysis": components_response.text,
        "project_analysis": analysis_response.text
    }
def set_to_list(obj):
    
    if isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, FileInfo):
        return {
            "path": obj.path,
            "extension": obj.extension,
            "size": obj.size,
            "references": list(obj.references)
        }
    elif hasattr(obj, '__dict__'):
        return obj.__dict__
    else:
        return str(obj)