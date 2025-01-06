import * as vscode from 'vscode';
import { ClineAIChat } from './generator';

export function activate(context: vscode.ExtensionContext) {
    const clineAI = new ClineAIChat(context);
    
    let disposable = vscode.commands.registerCommand('deepseek-cline.startChat', () => {
        clineAI.startConversation();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
