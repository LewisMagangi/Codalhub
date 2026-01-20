// Platform detection and solution extraction
class CodeHubExtractor {
  constructor() {
    this.platform = this.detectPlatform();
    this.init();
  }
  
  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('leetcode.com')) return 'leetcode';
    if (hostname.includes('codeforces.com')) return 'codeforces';
    if (hostname.includes('hackerrank.com')) return 'hackerrank';
    if (hostname.includes('codechef.com')) return 'codechef';
    if (hostname.includes('codewars.com')) return 'codewars';
    return 'unknown';
  }
  
  init() {
    if (this.platform === 'unknown') return;
    
    // Add push button to the page
    this.addPushButton();
    
    // Listen for successful submissions
    this.observeSubmissions();
  }
  
  addPushButton() {
    const button = document.createElement('button');
    button.id = 'codehub-push-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      Push to GitHub
    `;
    button.className = 'codehub-btn';
    
    button.addEventListener('click', () => this.handlePush());
    
    // Insert button based on platform
    this.insertButton(button);
  }
  
  insertButton(button) {
    const insertPositions = {
      leetcode: () => {
        const toolbar = document.querySelector('[data-e2e-locator="console-action-bar"]') ||
                       document.querySelector('.flex.items-center.space-x-4');
        if (toolbar) toolbar.appendChild(button);
      },
      codeforces: () => {
        const submitBtn = document.querySelector('.submit');
        if (submitBtn) submitBtn.parentElement.appendChild(button);
      },
      hackerrank: () => {
        const actions = document.querySelector('.hr-monaco-actions');
        if (actions) actions.appendChild(button);
      },
      codechef: () => {
        const submitArea = document.querySelector('.submit-panel');
        if (submitArea) submitArea.appendChild(button);
      },
      codewars: () => {
        const panel = document.querySelector('.action-bar');
        if (panel) panel.appendChild(button);
      }
    };
    
    const insert = insertPositions[this.platform];
    if (insert) {
      setTimeout(insert, 2000); // Wait for page to load
    }
  }
  
  extractSolution() {
    const extractors = {
      leetcode: () => {
        const editor = document.querySelector('.monaco-editor');
        if (!editor) return null;
        
        const lines = editor.querySelectorAll('.view-line');
        const code = Array.from(lines).map(line => line.textContent).join('\n');
        
        const titleEl = document.querySelector('[data-cy="question-title"]') ||
                       document.querySelector('a[href*="/problems/"]');
        const title = titleEl?.textContent.trim() || 'Unknown Problem';
        
        const langEl = document.querySelector('button[id*="headlessui-listbox-button"]');
        const language = langEl?.textContent.trim() || 'txt';
        
        return { code, title, language, platform: 'leetcode' };
      },
      
      codeforces: () => {
        const editor = document.querySelector('.ace_editor');
        if (!editor) return null;
        
        const code = editor.env?.editor?.getValue() || '';
        
        const problemTitle = document.querySelector('.problem-statement .title');
        const title = problemTitle?.textContent.trim() || 'Unknown Problem';
        
        return { code, title, language: 'cpp', platform: 'codeforces' };
      },
      
      hackerrank: () => {
        const editor = document.querySelector('.monaco-editor');
        if (!editor) return null;
        
        const lines = editor.querySelectorAll('.view-line');
        const code = Array.from(lines).map(line => line.textContent).join('\n');
        
        const titleEl = document.querySelector('.challengeTitle');
        const title = titleEl?.textContent.trim() || 'Unknown Problem';
        
        return { code, title, language: 'cpp', platform: 'hackerrank' };
      },
      
      codechef: () => {
        const editor = document.querySelector('#editor');
        const code = editor?.value || '';
        
        const titleEl = document.querySelector('.problem-heading');
        const title = titleEl?.textContent.trim() || 'Unknown Problem';
        
        return { code, title, language: 'cpp', platform: 'codechef' };
      },
      
      codewars: () => {
        const editor = document.querySelector('.CodeMirror');
        if (!editor) return null;
        
        const code = editor.CodeMirror?.getValue() || '';
        
        const titleEl = document.querySelector('h4');
        const title = titleEl?.textContent.trim() || 'Unknown Problem';
        
        return { code, title, language: 'javascript', platform: 'codewars' };
      }
    };
    
    const extractor = extractors[this.platform];
    return extractor ? extractor() : null;
  }
  
  async handlePush() {
    const button = document.getElementById('codehub-push-btn');
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '⏳ Pushing...';
      button.disabled = true;
      
      const solution = this.extractSolution();
      if (!solution) {
        throw new Error('Could not extract solution');
      }
      
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        data: solution
      });
      
      if (response.success) {
        button.innerHTML = '✓ Pushed!';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('CodeHub Error:', error);
      button.innerHTML = '✗ Failed';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
      alert(`Failed to push: ${error.message}`);
    }
  }
  
  observeSubmissions() {
    // This would watch for successful submissions and auto-push
    // Implementation depends on each platform's UI
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CodeHubExtractor());
} else {
  new CodeHubExtractor();
}