const inputText = document.getElementById('inputText');
const checkBtn = document.getElementById('checkBtn');
const resultsSection = document.getElementById('resultsSection');
const beforeText = document.getElementById('beforeText');
const afterText = document.getElementById('afterText');
const issuesList = document.getElementById('issuesList');
const copyBtn = document.getElementById('copyBtn');

let originalText = '';
let correctedText = '';
let grammarIssues = [];

checkBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    
    if (!text) {
        alert('Please enter some text to check!');
        return;
    }
    
    await analyzeText(text);
});

async function analyzeText(text) {
    originalText = text;
    
    checkBtn.disabled = true;
    checkBtn.classList.add('loading');
    checkBtn.textContent = 'Checking';
    
    try {
        const issues = await checkGrammar(text);
        grammarIssues = issues;
        
        correctedText = applyCorrections(text, issues);
        
        displayResults(text, correctedText, issues);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to check grammar. Please check your internet connection and try again.');
    } finally {
        checkBtn.disabled = false;
        checkBtn.classList.remove('loading');
        checkBtn.textContent = 'Check Grammar & Clarity';
    }
}

async function checkGrammar(text) {
    const API_URL = 'https://api.languagetool.org/v2/check';
    
    const params = new URLSearchParams({
        text: text,
        language: 'en-US'
    });
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    });
    
    if (!response.ok) {
        throw new Error('API request failed');
    }
    
    const data = await response.json();
    return data.matches || [];
}

function applyCorrections(text, issues) {
    if (issues.length === 0) {
        return text;
    }
    
    const sortedIssues = [...issues].sort((a, b) => b.offset - a.offset);
    
    let result = text;
    
    sortedIssues.forEach(issue => {
        if (issue.replacements && issue.replacements.length > 0) {
            const before = result.substring(0, issue.offset);
            const after = result.substring(issue.offset + issue.length);
            const replacement = issue.replacements[0].value;
            
            result = before + replacement + after;
        }
    });
    
    return result;
}


function displayResults(original, corrected, issues) {
    resultsSection.style.display = 'block';
    
    beforeText.innerHTML = highlightErrors(original, issues);
    
    if (issues.length === 0) {
        afterText.innerHTML = `
            <div class="no-issues">
                <h4>✨ Perfect!</h4>
                <p>No grammar or clarity issues found.</p>
            </div>
        `;
        issuesList.innerHTML = `
            <div class="no-issues">
                <p>Your text is clear and error-free!</p>
            </div>
        `;
    } else {
        afterText.innerHTML = highlightCorrections(corrected, issues);
        displayIssuesList(issues);
    }
    
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function highlightErrors(text, issues) {
    if (issues.length === 0) {
        return escapeHtml(text);
    }
    
    let result = '';
    let lastIndex = 0;
    
    const sortedIssues = [...issues].sort((a, b) => a.offset - b.offset);
    
    sortedIssues.forEach(issue => {
        result += escapeHtml(text.substring(lastIndex, issue.offset));
        
        const errorText = text.substring(issue.offset, issue.offset + issue.length);
        result += `<span class="error" title="${escapeHtml(issue.message)}">${escapeHtml(errorText)}</span>`;
        
        lastIndex = issue.offset + issue.length;
    });
    
    result += escapeHtml(text.substring(lastIndex));
    
    return result;
}

function highlightCorrections(text, issues) {
    if (issues.length === 0) {
        return escapeHtml(text);
    }
    
    let result = text;
    let offset = 0;
    
    const sortedIssues = [...issues].sort((a, b) => a.offset - b.offset);
    
    sortedIssues.forEach(issue => {
        if (issue.replacements && issue.replacements.length > 0) {
            const replacement = issue.replacements[0].value;
            const position = issue.offset + offset;
            
            const before = result.substring(0, position);
            const after = result.substring(position + replacement.length);
            
            result = before + `<span class="correction">${escapeHtml(replacement)}</span>` + after;
            
            offset += '<span class="correction"></span>'.length;
        }
    });
    
    return result;
}

function displayIssuesList(issues) {
    issuesList.innerHTML = '';
    
    if (issues.length === 0) {
        return;
    }
    
    issues.forEach(issue => {
        const issueDiv = document.createElement('div');
        issueDiv.className = 'issue-item';
        
        const issueType = categorizeIssue(issue);
        const original = originalText.substring(issue.offset, issue.offset + issue.length);
        const correction = issue.replacements && issue.replacements.length > 0 
            ? issue.replacements[0].value 
            : '[No suggestion]';
        
        issueDiv.innerHTML = `
            <span class="issue-type ${issueType}">${issueType}</span>
            <div>
                <span class="issue-original">${escapeHtml(original)}</span>
                <span class="issue-arrow">→</span>
                <span class="issue-corrected">${escapeHtml(correction)}</span>
            </div>
            <div class="issue-message">${escapeHtml(issue.message)}</div>
        `;
        
        issuesList.appendChild(issueDiv);
    });
}

function categorizeIssue(issue) {
    const category = issue.rule.category.id.toLowerCase();
    const issueType = issue.rule.issueType ? issue.rule.issueType.toLowerCase() : '';
    
    if (category.includes('typo') || issueType.includes('misspelling')) {
        return 'spelling';
    } else if (category.includes('style') || issueType.includes('style')) {
        return 'style';
    } else if (category.includes('grammar') || issueType.includes('grammar')) {
        return 'grammar';
    } else if (issueType.includes('clarity') || category.includes('redundancy')) {
        return 'clarity';
    } else {
        return 'grammar';
    }
}

copyBtn.addEventListener('click', () => {
    const textToCopy = correctedText || inputText.value;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = '#2e7d32';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#388e3c';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy text. Please copy manually.');
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        checkBtn.click();
    }
});
