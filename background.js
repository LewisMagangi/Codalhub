// Background service worker for GitHub API calls

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pushToGitHub') {
    handleGitHubPush(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleGitHubPush(solution) {
  try {
    // Get configuration
    const config = await chrome.storage.sync.get(['githubToken', 'githubUsername', 'repoName']);
    
    if (!config.githubToken || !config.githubUsername || !config.repoName) {
      throw new Error('Please configure GitHub settings first');
    }
    
    const { githubToken, githubUsername, repoName } = config;
    
    // Ensure repository exists
    await ensureRepoExists(githubToken, githubUsername, repoName);
    
    // Create file path
    const fileName = sanitizeFileName(solution.title);
    const extension = getFileExtension(solution.language);
    const filePath = `${solution.platform}/${fileName}.${extension}`;
    
    // Create README if it doesn't exist
    await createReadmeIfNeeded(githubToken, githubUsername, repoName, solution.platform);
    
    // Push solution to GitHub
    await pushFileToGitHub(
      githubToken,
      githubUsername,
      repoName,
      filePath,
      solution.code,
      `Add solution: ${solution.title} [${solution.platform}]`
    );
    
    return { success: true };
    
  } catch (error) {
    console.error('GitHub push error:', error);
    return { success: false, error: error.message };
  }
}

async function ensureRepoExists(token, username, repoName) {
  // Check if repo exists
  const checkResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (checkResponse.ok) return; // Repo exists
  
  // Create repo if it doesn't exist
  const createResponse = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: repoName,
      description: 'DSA Solutions - Auto-uploaded by CodeHub Extension',
      private: false,
      auto_init: true
    })
  });
  
  if (!createResponse.ok) {
    throw new Error('Failed to create repository');
  }
  
  // Wait a bit for repo initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function pushFileToGitHub(token, username, repoName, filePath, content, commitMessage) {
  // Check if file exists to get SHA
  let sha = null;
  const checkResponse = await fetch(
    `https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (checkResponse.ok) {
    const data = await checkResponse.json();
    sha = data.sha;
  }
  
  // Create or update file
  const response = await fetch(
    `https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
        sha: sha // Include SHA if updating existing file
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to push to GitHub');
  }
  
  return await response.json();
}

async function createReadmeIfNeeded(token, username, repoName, platform) {
  const readmePath = `${platform}/README.md`;
  
  // Check if README exists
  const checkResponse = await fetch(
    `https://api.github.com/repos/${username}/${repoName}/contents/${readmePath}`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (checkResponse.ok) return; // README exists
  
  // Create README
  const readmeContent = `# ${platform.charAt(0).toUpperCase() + platform.slice(1)} Solutions

This folder contains solutions from ${platform}.

Auto-uploaded using CodeHub Extension.
`;
  
  await pushFileToGitHub(
    token,
    username,
    repoName,
    readmePath,
    readmeContent,
    `Initialize ${platform} folder`
  );
}

function sanitizeFileName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function getFileExtension(language) {
  const extensions = {
    'javascript': 'js',
    'python': 'py',
    'python3': 'py',
    'java': 'java',
    'c++': 'cpp',
    'cpp': 'cpp',
    'c': 'c',
    'c#': 'cs',
    'ruby': 'rb',
    'swift': 'swift',
    'go': 'go',
    'kotlin': 'kt',
    'rust': 'rs',
    'typescript': 'ts',
    'php': 'php',
    'sql': 'sql',
    'mysql': 'sql'
  };
  
  return extensions[language.toLowerCase()] || 'txt';
}