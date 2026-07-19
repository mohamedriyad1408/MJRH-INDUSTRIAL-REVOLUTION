const fs = require('fs');
const path = require('path');

const repoPath = '/home/user/MJRH-INDUSTRIAL-REVOLUTION';
const fileListPath = path.join(repoPath, 'file_list.txt');
const outputPath = path.join(repoPath, 'MAIN_BRANCH_FULL_EXPORT.md');

const files = fs.readFileSync(fileListPath, 'utf8').split('\n').filter(Boolean);

let output = '# MAIN BRANCH FULL EXPORT\n\n';

for (const file of files) {
    const fullPath = path.join(repoPath, file);
    if (fs.existsSync(fullPath)) {
        console.log(`Extracting: ${file}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        output += `## File: ${file}\n\n`;
        output += '```' + (file.endsWith('.tsx') ? 'typescript' : file.split('.').pop()) + '\n';
        output += content;
        output += '\n```\n\n---\n\n';
    } else {
        console.warn(`File not found: ${file}`);
    }
}

fs.writeFileSync(outputPath, output);
console.log('Export complete.');
