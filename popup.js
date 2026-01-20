// Load saved configuration
document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.sync.get(['githubToken', 'githubUsername', 'repoName']);
  
  if (config.githubToken) {
    document.getElementById('githubToken').value = config.githubToken;
  }
  if (config.githubUsername) {
    document.getElementById('githubUsername').value = config.githubUsername;
  }
  if (config.repoName) {
    document.getElementById('repoName').value = config.repoName;
  }
});

// Save configuration
document.getElementById('saveBtn').addEventListener('click', async () => {
  const token = document.getElementById('githubToken').value.trim();
  const username = document.getElementById('githubUsername').value.trim();
  const repo = document.getElementById('repoName').value.trim();
  
  const statusEl = document.getElementById('status');
  
  if (!token || !username || !repo) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Please fill in all fields';
    return;
  }
  
  // Test GitHub token validity
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Invalid token');
    }
    
    // Save configuration
    await chrome.storage.sync.set({
      githubToken: token,
      githubUsername: username,
      repoName: repo
    });
    
    statusEl.className = 'status success';
    statusEl.textContent = '✓ Configuration saved successfully!';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
    
  } catch (error) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Invalid GitHub token. Please check and try again.';
  }
});