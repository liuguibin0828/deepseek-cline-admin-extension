"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePageModule = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const document_1 = require("./utils/document");
function generatePageModule(pageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        // Configure Deepseek API
        const deepseekConfig = {
            apiKey: 'sk-1b1ed5bc12af423e99ee10236ae95666',
            endpoint: 'https://api.deepseek.com',
            model: 'deepseek-chat'
        };
        const workspacePath = workspaceFolders[0].uri.fsPath;
        const pagePath = path.join(workspacePath, 'apps/admin/creative-admin-operation/src/pages', pageName);
        // Create directory structure
        fs.mkdirSync(pagePath, { recursive: true });
        fs.mkdirSync(path.join(pagePath, 'components'));
        fs.mkdirSync(path.join(pagePath, 'services'));
        fs.mkdirSync(path.join(pagePath, 'hooks'));
        // Prompt user for API details
        const apiIdl = yield vscode.window.showInputBox({
            prompt: 'Enter your API IDL (Interface Definition Language)',
            placeHolder: 'Paste your API IDL here...'
        });
        const serviceName = yield vscode.window.showInputBox({
            prompt: 'Enter the service name',
            placeHolder: 'e.g. UserService'
        });
        const apiName = yield vscode.window.showInputBox({
            prompt: 'Enter the API name',
            placeHolder: 'e.g. getUserInfo'
        });
        // Fetch documentation knowledge base
        const docContent = yield (0, document_1.fetchDocumentation)();
        // Get repository code context excluding node_modules
        const repoCode = yield vscode.workspace.findFiles('**/*.ts', '**/node_modules/**');
        const codeContext = yield Promise.all(repoCode.map((file) => __awaiter(this, void 0, void 0, function* () {
            const content = yield vscode.workspace.fs.readFile(file);
            return `File: ${file.path}\n${content.toString()}`;
        })));
        // Get all IDL services from repository
        const idlServices = new Set();
        for (const file of repoCode) {
            const content = (yield vscode.workspace.fs.readFile(file)).toString();
            const serviceMatches = content.match(/export\s+(?:interface|class)\s+(\w+Service)\b/g);
            if (serviceMatches) {
                serviceMatches.forEach(match => {
                    const serviceName = match.replace(/export\s+(?:interface|class)\s+/, '');
                    idlServices.add(serviceName);
                });
            }
        }
        // Generate files using deepseekV3 AI with documentation, API context and repository code
        const prompt = `Based on the following documentation:
${docContent}

Repository code context:
${codeContext.join('\n\n')}

Available IDL Services:
${Array.from(idlServices).join(', ') || 'No services found'}

And the following API details:
- Service Name: ${serviceName || 'Not provided'}
- API Name: ${apiName || 'Not provided'}
- API IDL: ${apiIdl || 'Not provided'}

Generate a complete React page module for ${pageName} following Cline best practices. Include:
    - Main page component with proper API integration
    - Page container component
    - API service implementation matching the provided IDL
    - TypeScript types based on the API definition
    - CSS modules
    - Proper error handling for API calls
    - Loading states for async operations
    - Consistent with existing repository code patterns`;
        const response = yield axios_1.default.post(deepseekConfig.endpoint, {
            model: deepseekConfig.model,
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
                'Authorization': `Bearer ${deepseekConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        const generatedCode = response.data.choices[0].message.content;
        // Parse generated code into structured format
        const codeParts = generatedCode.split('```');
        const structuredCode = {
            mainComponent: codeParts[1] || '',
            pageContainer: codeParts[3] || '',
            apiService: codeParts[5] || '',
            types: codeParts[7] || '',
            styles: codeParts[9] || ''
        };
        const filesToGenerate = [
            {
                path: 'page.tsx',
                content: generatedCode.mainComponent
            },
            {
                path: 'page.config.tsx',
                content: `import { definePageConfig } from 'cliner';

export default definePageConfig({
    api: ${JSON.stringify(apiIdl || '', null, 2)},
    serviceName: '${serviceName || ''}',
    apiName: '${apiName || ''}',
    // Other page configurations
});`
            },
            {
                path: 'index.tsx',
                content: generatedCode.mainComponent
            },
            {
                path: 'components/PageContainer.tsx',
                content: generatedCode.pageContainer
            },
            {
                path: 'services/api.ts',
                content: `import axios from 'axios';

const ${serviceName || 'ApiService'} = {
    ${apiName || 'getData'}: async (params: any) => {
        const response = await axios.post('/api/${(serviceName || '').toLowerCase()}/${(apiName || '').toLowerCase()}', params);
        return response.data;
    }
};

export default ${serviceName || 'ApiService'};
`
            },
            {
                path: 'types.ts',
                content: generatedCode.types
            },
            {
                path: 'PageContainer.module.css',
                content: generatedCode.styles
            }
        ];
        filesToGenerate.forEach(file => {
            fs.writeFileSync(path.join(pagePath, file.path), file.content);
        });
        return pagePath;
    });
}
exports.generatePageModule = generatePageModule;
//# sourceMappingURL=generator.js.map