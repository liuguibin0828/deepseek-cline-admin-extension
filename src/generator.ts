import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export class ClineAIChat {
    private context: vscode.ExtensionContext;
    private deepseekConfig = {
        apiKey: 'sk-1b1ed5bc12af423e99ee10236ae95666',
        endpoint: 'https://api.deepseek.com',
        model: 'deepseek-chat'
    };

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async startConversation() {
        // Initialize with code context
        const codeContext = await this.getCodeContext();

        // Start interactive conversation with empty docs
        await this.chatLoop('', codeContext);
    }

    private async getCodeContext(): Promise<string> {
        const repoCode = await vscode.workspace.findFiles(
            'apps/admin/creative-admin-operation/**/*.{ts,tsx}',
            '**/node_modules/**'
        );
        
        const context = await Promise.all(repoCode.map(async file => {
            const content = await vscode.workspace.fs.readFile(file);
            return `File: ${file.path}\n${content.toString()}`;
        }));

        return context.join('\n\n');
    }

    private async chatLoop(feishuDocs: string, codeContext: string) {
        while (true) {
            const userInput = await vscode.window.showInputBox({
                prompt: 'Enter your command or question (type "exit" to quit)',
                placeHolder: 'e.g. Create new module for user management'
            });

            if (!userInput || userInput.toLowerCase() === 'exit') break;

            // Process command
            if (userInput.startsWith('create')) {
                await this.handleCreateCommand(userInput, feishuDocs, codeContext);
            } else {
                await this.handleGeneralQuery(userInput, feishuDocs, codeContext);
            }
        }
    }

    private async handleCreateCommand(command: string, feishuDocs: string, codeContext: string) {
        // Extract module name from command
        const moduleName = command.replace('create', '').trim();
        if (!moduleName) {
            vscode.window.showErrorMessage('Please specify module name');
            return;
        }

        // Get API details through conversation
        const apiDetails = await this.getAPIDetails();
        if (!apiDetails) return;

        // Generate module
        await this.generateAdminModule(moduleName, apiDetails, feishuDocs, codeContext);
    }

    private async getAPIDetails() {
        const idl = await vscode.window.showInputBox({
            prompt: 'Enter API IDL',
            placeHolder: 'e.g. interface UserService { getUserInfo(): Promise<User>; }'
        });

        const serviceName = await vscode.window.showInputBox({
            prompt: 'Enter Service Name',
            placeHolder: 'e.g. UserService'
        });

        const apiMethod = await vscode.window.showInputBox({
            prompt: 'Enter API Method Name',
            placeHolder: 'e.g. getUserInfo'
        });

        if (!idl || !serviceName || !apiMethod) {
            vscode.window.showErrorMessage('All API details are required');
            return null;
        }

        return { idl, serviceName, apiMethod };
    }

    private async generateAdminModule(moduleName: string, apiDetails: any, feishuDocs: string, codeContext: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const modulePath = path.join(workspacePath, 'apps/admin/creative-admin-operation/src/routes', moduleName);

        // Create directory structure
        fs.mkdirSync(modulePath, { recursive: true });
        fs.mkdirSync(path.join(modulePath, 'components'));
        fs.mkdirSync(path.join(modulePath, 'services'));
        fs.mkdirSync(path.join(modulePath, 'hooks'));

        // Generate files using deepseekV3 AI
        const prompt = `Based on the following documentation:
${feishuDocs}

Repository code context:
${codeContext}

And the following API details:
- Service Name: ${apiDetails.serviceName}
- API Method: ${apiDetails.apiMethod}
- API IDL: ${apiDetails.idl}

Generate a complete admin module for ${moduleName} following Cline best practices. Include:
    - Main page component with proper API integration
    - Page container component
    - API service implementation matching the provided IDL
    - TypeScript types based on the API definition
    - CSS modules
    - Proper error handling for API calls
    - Loading states for async operations
    - Consistent with existing repository code patterns`;

        const response = await axios.post(this.deepseekConfig.endpoint, {
            model: this.deepseekConfig.model,
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            top_p: 1,
            n: 1,
            max_tokens: 2000,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${this.deepseekConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const generatedCode = response.data.choices[0].message.content;
        const codeParts = generatedCode.split('```');
        
        // Generate core files
        const filesToGenerate = [
            {
                path: 'page.tsx',
                content: codeParts[1] || ''
            },
            {
                path: 'page.config.tsx',
                content: codeParts[3] || ''
            },
            {
                path: 'services/api.ts',
                content: codeParts[5] || ''
            },
            {
                path: 'types.ts',
                content: codeParts[7] || ''
            }
        ];

        filesToGenerate.forEach(file => {
            fs.writeFileSync(path.join(modulePath, file.path), file.content);
        });

        vscode.window.showInformationMessage(`Successfully generated module: ${moduleName}`);
    }

    private async handleGeneralQuery(query: string, feishuDocs: string, codeContext: string) {
        const response = await axios.post(this.deepseekConfig.endpoint, {
            model: this.deepseekConfig.model,
            messages: [{
                role: "user",
                content: `Based on the following documentation:
${feishuDocs}

And code context:
${codeContext}

Answer the following question:
${query}`
            }],
            temperature: 0.7,
            top_p: 1,
            n: 1,
            max_tokens: 1000,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${this.deepseekConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const answer = response.data.choices[0].message.content;
        vscode.window.showInformationMessage(answer);
    }
}

export function activate(context: vscode.ExtensionContext) {
    const clineAI = new ClineAIChat(context);
    
    let disposable = vscode.commands.registerCommand('deepseek-cline.startChat', () => {
        clineAI.startConversation();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
