import * as vscode from 'vscode';
import { generatePageModule } from './generator';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('deepseek-cline.generatePage', async () => {
        const pageName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the page module to generate',
            placeHolder: 'e.g. UserProfilePage'
        });

        if (pageName) {
            try {
                const result = await generatePageModule(pageName);
                vscode.window.showInformationMessage(`Successfully generated page module: ${result}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating page module: ${error}`);
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
