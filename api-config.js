// API配置管理模块
class APIConfigManager {
    constructor() {
        this.config = {
            mathpix: {
                enabled: false,
                appId: '',
                appKey: '',
                endpoint: 'https://api.mathpix.com/v3/text',
                freeMode: true // 免费模式（有限额）
            },
            openai: {
                enabled: false,
                apiKey: '',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4-vision-preview'
            },
            gemini: {
                enabled: false,
                apiKey: '',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
            },
            currentProvider: 'mathpix' // 当前使用的API提供商
        };
        
        this.loadConfig();
    }
    
    // 加载保存的配置
    loadConfig() {
        try {
            const saved = localStorage.getItem('mathTeacherAPIConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }
    
    // 保存配置
    saveConfig() {
        try {
            localStorage.setItem('mathTeacherAPIConfig', JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('保存API配置失败:', error);
            return false;
        }
    }
    
    // 更新配置
    updateConfig(provider, updates) {
        if (this.config[provider]) {
            this.config[provider] = { ...this.config[provider], ...updates };
            this.config[provider].enabled = !!(this.config[provider].appId || this.config[provider].apiKey);
            this.saveConfig();
            return true;
        }
        return false;
    }
    
    // 切换当前提供商
    setCurrentProvider(provider) {
        if (this.config[provider]) {
            this.config.currentProvider = provider;
            this.saveConfig();
            return true;
        }
        return false;
    }
    
    // 获取当前配置
    getCurrentConfig() {
        const provider = this.config.currentProvider;
        return {
            provider: provider,
            ...this.config[provider],
            isConfigured: this.isConfigured(provider)
        };
    }
    
    // 检查是否已配置
    isConfigured(provider = null) {
        const targetProvider = provider || this.config.currentProvider;
        const config = this.config[targetProvider];
        
        if (!config) return false;
        
        switch(targetProvider) {
            case 'mathpix':
                return !!(config.appId && config.appKey);
            case 'openai':
            case 'gemini':
                return !!config.apiKey;
            default:
                return false;
        }
    }
    
    // 获取API请求头
    getHeaders(provider = null) {
        const targetProvider = provider || this.config.currentProvider;
        const config = this.config[targetProvider];
        
        if (!this.isConfigured(targetProvider)) {
            throw new Error(`${targetProvider} API未配置`);
        }
        
        switch(targetProvider) {
            case 'mathpix':
                return {
                    'Content-Type': 'application/json',
                    'app_id': config.appId,
                    'app_key': config.appKey
                };
            case 'openai':
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                };
            case 'gemini':
                return {
                    'Content-Type': 'application/json'
                };
            default:
                return {};
        }
    }
    
    // 获取API端点
    getEndpoint(provider = null) {
        const targetProvider = provider || this.config.currentProvider;
        const config = this.config[targetProvider];
        
        switch(targetProvider) {
            case 'mathpix':
                return config.endpoint;
            case 'openai':
                return config.endpoint;
            case 'gemini':
                return `${config.endpoint}/gemini-pro-vision:generateContent?key=${config.apiKey}`;
            default:
                return '';
        }
    }
    
    // 获取请求体
    getRequestBody(imageData, options = {}) {
        const provider = this.config.currentProvider;
        
        switch(provider) {
            case 'mathpix':
                return {
                    src: imageData,
                    formats: ['text', 'latex_styled'],
                    format_options: {
                        text: {
                            include_line_breaks: true
                        },
                        latex_styled: {
                            inline_delimiters: ['$', '$']
                        }
                    },
                    data_options: {
                        include_asciimath: true,
                        include_latex: true
                    }
                };
                
            case 'openai':
                return {
                    model: this.config.openai.model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: '分析这张数学教学图片，识别其中的数学内容（公式、图表、概念等），用中文简要描述。'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageData
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 500
                };
                
            case 'gemini':
                return {
                    contents: [
                        {
                            parts: [
                                {
                                    text: '分析这张数学教学图片，识别其中的数学内容（公式、图表、概念等），用中文简要描述。'
                                },
                                {
                                    inline_data: {
                                        mime_type: 'image/jpeg',
                                        data: imageData.split(',')[1] // 移除data:image前缀
                                    }
                                }
                            ]
                        }
                    ]
                };
                
            default:
                return {};
        }
    }
    
    // 解析API响应
    parseResponse(response, provider = null) {
        const targetProvider = provider || this.config.currentProvider;
        
        try {
            switch(targetProvider) {
                case 'mathpix':
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    
                    // 提取文本和LaTeX
                    const text = response.text || '';
                    const latex = response.latex_styled || '';
                    
                    return {
                        success: true,
                        text: text,
                        latex: latex,
                        raw: response
                    };
                    
                case 'openai':
                    if (response.error) {
                        throw new Error(response.error.message);
                    }
                    
                    const content = response.choices?.[0]?.message?.content || '';
                    return {
                        success: true,
                        text: content,
                        latex: '',
                        raw: response
                    };
                    
                case 'gemini':
                    if (response.error) {
                        throw new Error(response.error.message);
                    }
                    
                    const geminiText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    return {
                        success: true,
                        text: geminiText,
                        latex: '',
                        raw: response
                    };
                    
                default:
                    return {
                        success: false,
                        error: '不支持的API提供商',
                        raw: response
                    };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                raw: response
            };
        }
    }
}

// 创建全局实例
const apiConfigManager = new APIConfigManager();

// 导出函数
function showAPIConfigModal() {
    const modal = document.createElement('div');
    modal.className = 'api-config-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-cog"></i> API配置</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="api-provider-tabs">
                    <button class="provider-tab active" data-provider="mathpix">Mathpix</button>
                    <button class="provider-tab" data-provider="openai">OpenAI</button>
                    <button class="provider-tab" data-provider="gemini">Gemini</button>
                </div>
                
                <div class="api-config-form" id="mathpixConfig">
                    <h4>Mathpix API配置</h4>
                    <p class="api-description">
                        Mathpix专门识别数学公式，输出LaTeX格式。注册地址：
                        <a href="https://mathpix.com/" target="_blank">https://mathpix.com/</a>
                    </p>
                    <div class="form-group">
                        <label>App ID:</label>
                        <input type="text" id="mathpixAppId" placeholder="输入Mathpix App ID">
                    </div>
                    <div class="form-group">
                        <label>App Key:</label>
                        <input type="password" id="mathpixAppKey" placeholder="输入Mathpix App Key">
                    </div>
                    <div class="form-status">
                        <span id="mathpixStatus">未配置</span>
                    </div>
                </div>
                
                <div class="api-config-form" id="openaiConfig" style="display: none;">
                    <h4>OpenAI API配置</h4>
                    <p class="api-description">
                        需要GPT-4 Vision权限。获取API密钥：
                        <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI平台</a>
                    </p>
                    <div class="form-group">
                        <label>API Key:</label>
                        <input type="password" id="openaiApiKey" placeholder="输入OpenAI API Key">
                    </div>
                    <div class="form-status">
                        <span id="openaiStatus">未配置</span>
                    </div>
                </div>
                
                <div class="api-config-form" id="geminiConfig" style="display: none;">
                    <h4>Google Gemini API配置</h4>
                    <p class="api-description">
                        免费额度可用。获取API密钥：
                        <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>
                    </p>
                    <div class="form-group">
                        <label>API Key:</label>
                        <input type="password" id="geminiApiKey" placeholder="输入Gemini API Key">
                    </div>
                    <div class="form-status">
                        <span id="geminiStatus">未配置</span>
                    </div>
                </div>
                
                <div class="api-usage">
                    <h5>使用说明：</h5>
                    <ul>
                        <li>配置API后，图片识别将使用真实AI服务</li>
                        <li>未配置时使用模拟AI功能</li>
                        <li>API调用可能需要付费，请注意使用量</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="testApiBtn">测试连接</button>
                <button class="btn btn-primary" id="saveApiConfigBtn">保存配置</button>
                <button class="btn" id="closeApiConfigBtn">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 初始化表单
    updateConfigForms();
    
    // 事件监听
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#closeApiConfigBtn').addEventListener('click', () => modal.remove());
    
    modal.querySelectorAll('.provider-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.api-config-form').forEach(form => {
                form.style.display = 'none';
            });
            
            document.getElementById(`${tab.dataset.provider}Config`).style.display = 'block';
        });
    });
    
    modal.querySelector('#saveApiConfigBtn').addEventListener('click', saveAPIConfig);
    modal.querySelector('#testApiBtn').addEventListener('click', testAPIConnection);
    
    // 显示模态框
    modal.style.display = 'flex';
}

// 更新配置表单
function updateConfigForms() {
    const config = apiConfigManager.config;
    
    // Mathpix
    const mathpixAppId = document.getElementById('mathpixAppId');
    const mathpixAppKey = document.getElementById('mathpixAppKey');
    const mathpixStatus = document.getElementById('mathpixStatus');
    
    if (mathpixAppId) {
        mathpixAppId.value = config.mathpix.appId || '';
        mathpixAppKey.value = config.mathpix.appKey || '';
        mathpixStatus.textContent = config.mathpix.enabled ? '已配置' : '未配置';
        mathpixStatus.className = config.mathpix.enabled ? 'status-success' : 'status-error';
    }
    
    // OpenAI
    const openaiApiKey = document.getElementById('openaiApiKey');
    const openaiStatus = document.getElementById('openaiStatus');
    
    if (openaiApiKey) {
        openaiApiKey.value = config.openai.apiKey || '';
        openaiStatus.textContent = config.openai.enabled ? '已配置' : '未配置';
        openaiStatus.className = config.openai.enabled ? 'status-success' : 'status-error';
    }
    
    // Gemini
    const geminiApiKey = document.getElementById('geminiApiKey');
    const geminiStatus = document.getElementById('geminiStatus');
    
    if (geminiApiKey) {
        geminiApiKey.value = config.gemini.apiKey || '';
        geminiStatus.textContent = config.gemini.enabled ? '已配置' : '未配置';
        geminiStatus.className = config.gemini.enabled ? 'status-success' : 'status-error';
    }
}

// 保存API配置
function saveAPIConfig() {
    try {
        // 获取当前激活的标签页
        const activeTab = document.querySelector('.provider-tab.active');
        if (!activeTab) return;
        
        const provider = activeTab.dataset.provider;
        
        switch(provider) {
            case 'mathpix':
                apiConfigManager.updateConfig('mathpix', {
                    appId: document.getElementById('mathpixAppId').value.trim(),
                    appKey: document.getElementById('mathpixAppKey').value.trim()
                });
                break;
            case 'openai':
                apiConfigManager.updateConfig('openai', {
                    apiKey: document.getElementById('openaiApiKey').value.trim()
                });
                break;
            case 'gemini':
                apiConfigManager.updateConfig('gemini', {
                    apiKey: document.getElementById('geminiApiKey').value.trim()
                });
                break;
        }
        
        updateConfigForms();
        showModal('API配置已保存');
        
    } catch (error) {
        console.error('保存API配置失败:', error);
        showModal('保存失败: ' + error.message);
    }
}

// 测试API连接
async function testAPIConnection() {
    const activeTab = document.querySelector('.provider-tab.active');
    if (!activeTab) return;
    
    const provider = activeTab.dataset.provider;
    
    if (!apiConfigManager.isConfigured(provider)) {
        showModal(`请先配置${provider} API`);
        return;
    }
    
    showModal(`正在测试${provider} API连接...`);
    
    try {
        // 使用测试图片（一个小型的base64编码的测试图片）
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const result = await callAIAPI(testImage, provider);
        
        if (result.success) {
            showModal(`${provider} API连接成功！`);
        } else {
            showModal(`${provider} API连接失败: ${result.error}`);
        }
    } catch (error) {
        showModal(`测试失败: ${error.message}`);
    }
}

// 导出函数
window.apiConfigManager = apiConfigManager;
window.showAPIConfigModal = showAPIConfigModal;