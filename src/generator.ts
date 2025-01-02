import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function generatePageModule(pageName: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new Error('No workspace folder open');
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const pagePath = path.join(workspacePath, 'src', 'pages', pageName);

    // Create directory structure
    fs.mkdirSync(pagePath, { recursive: true });
    fs.mkdirSync(path.join(pagePath, 'components'));
    fs.mkdirSync(path.join(pagePath, 'services'));
    fs.mkdirSync(path.join(pagePath, 'hooks'));

    // Generate files using deepseekV3 + cline templates
    const filesToGenerate = [
        {
            path: 'index.tsx',
            content: generateIndexContent(pageName)
        },
        {
            path: 'components/PageContainer.tsx',
            content: generatePageContainerContent(pageName)
        },
        {
            path: 'services/api.ts',
            content: generateApiServiceContent(pageName)
        }
    ];

    filesToGenerate.forEach(file => {
        fs.writeFileSync(path.join(pagePath, file.path), file.content);
    });

    return pagePath;
}

function generateIndexContent(pageName: string): string {
    return `import React from 'react';
import PageContainer from './components/PageContainer';

const ${pageName}: React.FC = () => {
    return (
        <PageContainer>
            {/* Your page content here */}
        </PageContainer>
    );
};

export default ${pageName};
`;
}

function generatePageContainerContent(pageName: string): string {
    return `import React from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
    children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
    return (
        <div className={styles.container}>
            {children}
        </div>
    );
};

export default PageContainer;
`;
}

function generateApiServiceContent(pageName: string): string {
    return `import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});

export const get${pageName}Data = async () => {
    const response = await api.get('/${pageName.toLowerCase()}');
    return response.data;
};

export default api;
`;
}
