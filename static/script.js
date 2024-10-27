class DocumentationUI {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.setupMarkdown();
        this.setupMermaid();
        this.currentFile = null;
    }

    initializeElements() {
        this.form = document.getElementById('uploadForm');
        this.fileInput = document.getElementById('zipFile');
        this.apiKeyInput = document.getElementById('apiKey');
        this.toggleApiKeyButton = document.getElementById('toggleApiKey');
        this.customInstructionsInput = document.getElementById('customInstructions');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.documentationOutput = document.getElementById('documentationOutput');
        this.submitButton = document.getElementById('submitButton');
        this.fileStatus = document.getElementById('fileStatus');
        this.tabs = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.githubRepoInput = document.getElementById('githubRepo');
        this.validateRepoButton = document.getElementById('validateRepo');
        this.repoStatus = document.getElementById('repoStatus');
        this.isValidating = false;
    }

    attachEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.toggleApiKeyButton.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        this.validateRepoButton.addEventListener('click', () => this.validateGithubRepo());
        this.githubRepoInput.addEventListener('input', () => this.clearRepoStatus());
        this.fileInput.addEventListener('change', (e) => this.handleFileChange(e));
        this.setupActionButtons();
    }

    setupActionButtons() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.copyTabContent(tabId);
            });
        });

        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.downloadTabContent(tabId);
            });
        });
    }

    setupMarkdown() {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            langPrefix: 'hljs language-',
            breaks: true
        });
    }

    setupMermaid() {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'default',
            maxTextSize: 900,
            logLevel: 'error',
        });
    }

    toggleApiKeyVisibility() {
        const isVisible = this.apiKeyInput.type === 'password';
        this.apiKeyInput.type = isVisible ? 'text' : 'password';
        const icon = this.toggleApiKeyButton.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        const newActionText = isVisible ? 'Hide' : 'Show';
        this.toggleApiKeyButton.setAttribute('aria-label', `${newActionText} API key`);
        this.toggleApiKeyButton.setAttribute('title', `${newActionText} API key`);
    }

    handleFileChange(e) {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                this.showError('File size exceeds 50MB limit');
                this.fileInput.value = '';
                this.currentFile = null;
            } else {
                this.currentFile = file;
                this.updateFileStatus(file.name, 'Uploaded successfully');
            }
        } else {
            this.currentFile = null;
            this.clearFileStatus();
        }
    }

    updateFileStatus(fileName, status) {
        if (this.fileStatus) {
            this.fileStatus.innerHTML = `
                <div class="file-info">
                    <span>${fileName}</span>
                    <span>${status}</span>
                    <button class="remove-file" onclick="documentationUI.removeFile()">×</button>
                </div>
            `;
        }
    }

    clearFileStatus() {
        if (this.fileStatus) {
            this.fileStatus.innerHTML = '';
        }
    }

    removeFile() {
        console.log('Removing file');
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        this.currentFile = null;
        this.clearFileStatus();
    }

    //functions or handling the Github repo

    // validate repo entered by user
    async validateGithubRepo() {
        if (this.isValidating) return;

        const repoUrl = this.githubRepoInput.value.trim();
        const repoPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/;

        if (!repoUrl) {
            this.updateRepoStatus('Please enter a GitHub repository URL', false);
            return;
        }

        const match = repoUrl.match(repoPattern);
        if (!match) {
            this.updateRepoStatus('Invalid repository URL format', false);
            return;
        }

        const [, owner, repo] = match;

        try {
            this.isValidating = true;
            this.updateRepoStatus('Checking repository...', null);
            this.validateRepoButton.disabled = true;

            const exists = await this.checkRepoExists(owner, repo);

            if (exists) {
                this.updateRepoStatus(`Repository ${owner}/${repo} is valid and accessible`, true);
            } else {
                this.updateRepoStatus(`Repository ${owner}/${repo} does not exist or is not accessible`, false);
            }
        } catch (error) {
            console.error('Error validating repository:', error);
            this.updateRepoStatus(
                error.status === 403 ?
                'GitHub API rate limit exceeded. Please try again later.' :
                'Error checking repository. Please try again.',
                false
            );
        } finally {
            this.isValidating = false;
            this.validateRepoButton.disabled = false;
        }
    }

    //async function to check if repo is valid
    async checkRepoExists(owner, repo) {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                method: 'HEAD',
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.status === 200;
        } catch (error) {
            console.error('Error checking repository:', error);
            throw error;
        }
    }

    // to update validation status
    updateRepoStatus(message, isValid) {
        if (!this.repoStatus) return;

        let statusHTML;
        if (isValid === null) {
            // Loading state
            statusHTML = `
                <div class="repo-info loading">
                    <span>${message}</span>
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            `;
        } else {
            statusHTML = `
                <div class="repo-info ${isValid ? 'valid' : 'invalid'}">
                    <span>${message}</span>
                    ${isValid ? 
                        '<i class="fas fa-check" style="color: var(--success-color)"></i>' : 
                        '<i class="fas fa-times" style="color: var(--error-color)"></i>'}
                </div>
            `;
        }

        this.repoStatus.innerHTML = statusHTML;
    }

    // clear repo status
    clearRepoStatus() {
        if (this.repoStatus) {
            this.repoStatus.innerHTML = '';
        }
    }

    switchTab(tabId) {
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    }

    // Need to implement

    // copyTabContent(tabId) {
    //     const tabContent = document.getElementById(`${tabId}Tab`);
    //     if (tabContent) {
    //         const textContent = tabContent.innerText;
    //         navigator.clipboard.writeText(textContent)
    //             .then(() => {
    //                 this.showSuccess('Content copied to clipboard');
    //             })
    //             .catch(err => {
    //                 this.showError('Failed to copy content');
    //                 console.error('Copy failed:', err);
    //             });
    //     }
    // }

    // downloadTabContent(tabId) {
    //     const tabContent = document.getElementById(`${tabId}Tab`);
    //     if (tabContent) {
    //         const element = document.createElement('a');
    //         const content = tabContent.innerHTML;

    //         const htmlContent = `
    //             <!DOCTYPE html>
    //             <html>
    //             <head>
    //                 <meta charset="UTF-8">
    //                 <title>Documentation Export</title>
    //                 <style>
    //                     body { 
    //                         font-family: 'Google Sans', Arial, sans-serif; 
    //                         padding: 20px;
    //                         max-width: 1200px;
    //                         margin: 0 auto;
    //                     }
    //                     pre { 
    //                         background: #f5f5f5; 
    //                         padding: 15px; 
    //                         border-radius: 5px;
    //                         overflow-x: auto;
    //                     }
    //                     .mermaid { margin: 20px 0; }
    //                     .project-stats {
    //                         display: grid;
    //                         grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    //                         gap: 20px;
    //                         margin-bottom: 30px;
    //                     }
    //                     .stat-card {
    //                         background: #f8fafc;
    //                         padding: 15px;
    //                         border-radius: 8px;
    //                         border: 1px solid #e2e8f0;
    //                     }
    //                 </style>
    //             </head>
    //             <body>${content}</body>
    //             </html>
    //         `;

    //         const blob = new Blob([htmlContent], { type: 'text/html' });
    //         element.href = URL.createObjectURL(blob);
    //         element.download = `documentation-${tabId}.html`;
    //         document.body.appendChild(element);
    //         element.click();
    //         document.body.removeChild(element);
    //     }
    // }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    showError(message) {
        console.error('Error:', message);
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 5000);
        }
    }

    setLoadingState(loading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        if (this.submitButton) {
            this.submitButton.disabled = loading;
        }
    }


    //async function to handle the form submission
    async handleSubmit(e) {
        e.preventDefault();
        console.log('Form submitted');

        const apiKey = this.apiKeyInput.value;
        const customInstructions = this.customInstructionsInput.value;
        const repoUrl = this.githubRepoInput.value.trim();

        // Validate all inputs first
        if (!this.validateInputs()) {
            return;
        }

        try {
            this.setLoadingState(true);
            let documentation;

            if (this.currentFile) {
                documentation = await this.uploadAndAnalyze(this.currentFile, apiKey, customInstructions);
            } else if (repoUrl) {
                documentation = await this.analyzeGithubRepo(repoUrl, apiKey, customInstructions);
            }

            if (documentation) {
                this.displayDocumentation(documentation);
                this.showSuccess('Documentation generated successfully!');
            }
        } catch (error) {
            console.error('Error during submission:', error);
            this.showError(`Error: ${error.message}`);
        } finally {
            this.setLoadingState(false);
        }
    }


    // validate Inputs
    validateInputs() {
        const apiKey = this.apiKeyInput.value;
        const repoUrl = this.githubRepoInput.value.trim();
        const hasFile = Boolean(this.currentFile);
        const hasRepoUrl = Boolean(repoUrl);

        // Check API key
        if (!apiKey) {
            this.showError('Please enter your Gemini API key');
            return false;
        }

        // Check if at least one input method is provided
        if (!hasFile && !hasRepoUrl) {
            this.showError('Please either select a ZIP file or enter a GitHub repository URL');
            return false;
        }

        // Check if both input methods are provided
        if (hasFile && hasRepoUrl) {
            this.showError('Please use either ZIP file or GitHub URL, not both');
            return false;
        }

        // Validate ZIP file if present
        if (hasFile && !this.currentFile.name.endsWith('.zip')) {
            this.showError('Please upload a ZIP file');
            return false;
        }

        // Validate GitHub URL if present
        if (hasRepoUrl) {
            const repoPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/;
            if (!repoPattern.test(repoUrl)) {
                this.showError('Please enter a valid GitHub repository URL');
                return false;
            }
        }

        return true;
    }


    //method to  send form data to backend (zip file)
    async uploadAndAnalyze(file, apiKey, customInstructions) {
        console.log('Uploading and analyzing file:', file.name);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('gemini_api_key', apiKey);
        formData.append('custom_instructions', customInstructions);

        try {
            const response = await fetch('http://127.0.0.1:8000/upload-and-analyze', {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!responseText) {
                throw new Error('Empty response received from server');
            }

            try {
                const jsonData = JSON.parse(responseText);
                return jsonData;
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error('Invalid JSON response from server');
            }
        } catch (error) {
            console.error('Error in uploadAndAnalyze:', error);
            throw error;
        }
    }


    //method to send form data to backend (Github)
    // method for GitHub repository analysis
    async analyzeGithubRepo(repoUrl, apiKey, customInstructions) {
        console.log('Analyzing GitHub repository:', repoUrl);

        const requestData = {
            github_url: repoUrl,
            gemini_api_key: apiKey,
            custom_instructions: customInstructions
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/analyze-github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!responseText) {
                throw new Error('Empty response received from server');
            }

            try {
                const jsonData = JSON.parse(responseText);
                return jsonData;
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error('Invalid JSON response from server');
            }
        } catch (error) {
            console.error('Error in analyzeGithubRepo:', error);
            throw error;
        }
    }


    //function to handle display output
    displayDocumentation(data) {
        console.log('Displaying documentation');
        const { project_overview, component_analysis, project_analysis } = data.documentation;

        if (project_overview) {
            this.displayProjectOverview(project_overview);
        } else {
            console.error('Project overview data is missing');
        }

        if (component_analysis) {
            this.displayComponentAnalysis(component_analysis);
        } else {
            console.error('Component analysis data is missing');
        }

        if (project_analysis) {
            this.displayProjectAnalysis(project_analysis);
        } else {
            console.error('Project analysis data is missing');
        }

        this.renderMermaidDiagrams();

        if (this.documentationOutput) {
            this.documentationOutput.classList.add('visible');
        } else {
            console.error('Documentation output element not found');
        }

        this.switchTab('overview');
    }

    displayProjectOverview(overview) {
        const statsContainer = document.getElementById('projectStats');
        const overviewContent = document.getElementById('overviewContent');

        if (statsContainer) {
            statsContainer.innerHTML = this.createStatisticsHTML(overview.statistics);
        } else {
            console.error('Project stats container not found');
        }

        if (overviewContent) {
            overviewContent.innerHTML = this.formatMarkdown(overview.overview);
        } else {
            console.error('Overview content element not found');
        }
    }

    createStatisticsHTML(statistics) {
            return `
            <div class="stat-card">
                <h3>Total Files</h3>
                <p>${statistics.total_files}</p>
            </div>
            <div class="stat-card">
                <h3>Entry Points</h3>
                <p>${statistics.entry_points.length}</p>
            </div>
            ${Object.entries(statistics.file_categories)
                .filter(([_, count]) => count > 0)
                .map(([category, count]) => `
                    <div class="stat-card">
                        <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                        <p>${count} files</p>
                    </div>
                `).join('')}
        `;
    }

    displayComponentAnalysis(analysis) {
        const filesTab = document.getElementById('filesTab');
        if (filesTab) {
            filesTab.innerHTML = this.formatMarkdown(analysis);
        } else {
            console.error('Files tab element not found');
        }
    }

    displayProjectAnalysis(analysis) {
        const integrationsTab = document.getElementById('integrationsTab');
        if (integrationsTab) {
            integrationsTab.innerHTML = this.formatMarkdown(analysis);
        } else {
            console.error('Integrations tab element not found');
        }
    }

    formatMarkdown(content) {
        let html = marked.parse(content);

        html = html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (match, level, text) => {
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${id}">${text}</h${level}>`;
        });

        html = html.replace(/<pre><code/g, '<div class="code-block"><pre><code');
        html = html.replace(/<\/code><\/pre>/g, '</code></pre></div>');

        html = html.replace(/<table>/g, '<div class="table-container"><table class="responsive-table">');
        html = html.replace(/<\/table>/g, '</table></div>');

        html = html.replace(/<blockquote>/g, '<blockquote class="enhanced-quote">');

        html = html.replace(/<p>/g, '<p class="content-paragraph">');

        html = html.replace(/```mermaid([\s\S]*?)```/g, (match, p1) => {
            const cleanedCode = this.cleanMermaidCode(p1.trim());
            return `<div class="mermaid-container">
                        <div class="mermaid">
                            ${cleanedCode}
                        </div>
                        <button class="download-svg-btn" onclick="documentationUI.downloadSVG(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                    </div>`;
        });

        html = html.replace(/<\/h([1-6])>/g, '</h$1><br>');
        html = html.replace(/<\/p>/g, '</p><br>');

        return html;
    }

    cleanMermaidCode(mermaidCode) {
        let cleanedCode = mermaidCode.replace('```mermaid', '').replace('```', '').trim();
        
        const graphTypes = ['graph TD', 'graph LR', 'graph TB', 'graph BT', 'graph RL'];
        for (const graphType of graphTypes) {
            if (cleanedCode.includes(graphType) && graphType !== 'graph TD') {
                cleanedCode = cleanedCode.replace(graphType, '');
            }
        }
        
        if (!cleanedCode.startsWith('graph TD')) {
            cleanedCode = 'graph TD\n' + cleanedCode;
        }
        
        if (cleanedCode.includes('subgraph')) {
            const lines = cleanedCode.split('\n');
            const fixedLines = lines.map(line => {
                if (line.includes('subgraph') && !line.includes(']')) {
                    return line.replace('subgraph', 'subgraph ') + ' [';
                }
                return line;
            });
            cleanedCode = fixedLines.join('\n');
        }
        
        cleanedCode = cleanedCode.split('\n').filter(line => line.trim()).join('\n');
        
        return cleanedCode;
    }

    renderMermaidDiagrams() {
        const mermaidDiv = document.querySelectorAll(".mermaid");
        mermaidDiv.forEach((div, index) => {
            if (div.querySelector('svg')) {
                return;
            }
            const id = `mermaid-${index}`;
            div.id = id;
            try {
                mermaid.render(id, div.textContent.trim(), (svgCode) => {
                    div.innerHTML = svgCode;
                    this.adjustSVGSize(div.querySelector('svg'));
                });
            } catch (error) {
                console.error('Mermaid rendering error:', error);
                div.innerHTML = `<div class="error-message">Diagram rendering failed: ${error.message}</div>`;
            }
        });
    }

    adjustSVGSize(svg) {
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = 'auto';
            svg.style.maxWidth = '100%';
            svg.style.display = 'block';
            svg.style.margin = 'auto';

            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
                const containerWidth = svg.parentElement.clientWidth;
                const scaleFactor = containerWidth / vbWidth;
                
                svg.style.transformOrigin = 'top left';
                svg.style.transform = `scale(${scaleFactor})`;
                svg.parentElement.style.height = `${vbHeight * scaleFactor}px`;
            }
        }
    }

    downloadSVG(button) {
        const mermaidContainer = button.closest('.mermaid-container');
        const svg = mermaidContainer.querySelector('svg');
        if (svg) {
            const svgData = svg.outerHTML;
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const svgUrl = URL.createObjectURL(svgBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = svgUrl;
            downloadLink.download = 'workflow_diagram.svg';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(svgUrl);
        }
    }
}

// Initialize the UI when the document is loaded
let documentationUI;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing DocumentationUI');
    documentationUI = new DocumentationUI();
});