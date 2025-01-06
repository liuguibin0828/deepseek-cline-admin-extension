import axios from 'axios';

export async function fetchFeishuDocs(): Promise<string> {
    // 飞书文档 API 配置
    const feishuConfig = {
        appId: process.env.FEISHU_APP_ID,
        appSecret: process.env.FEISHU_APP_SECRET,
        docToken: process.env.FEISHU_DOC_TOKEN
    };

    // 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: feishuConfig.appId,
        app_secret: feishuConfig.appSecret
    });

    const accessToken = tokenResponse.data.tenant_access_token;

    // 获取文档内容
    const docResponse = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${feishuConfig.docToken}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    // 提取文档内容
    const content = docResponse.data.data.document.content
        .map((block: any) => block.text)
        .join('\n');

    return content;
}
