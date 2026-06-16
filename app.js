// 全局变量
let currentImage = null;
let recognizedText = '';
let currentTemplate = 'new-lesson';
let tesseractWorker = null;
let isLongImage = false;
let imageSegments = [];
let aiAnalysisResult = null; // AI分析结果

// AI识别配置
const AI_CONFIG = {
    enabled: true, // 启用AI识别
    useRealAPI: false, // 是否使用真实API（根据配置自动设置）
    fallbackToOCR: true // AI失败时回退到OCR
};

// 长图处理配置
const LONG_IMAGE_CONFIG = {
    minHeightForSplit: 1500, // 高度超过1500px视为长图
    segmentHeight: 800,      // 每个分割段的高度
    overlapPixels: 100,      // 分割重叠像素，避免切割文字
    maxSegments: 5           // 最大分割段数
};

// DOM元素
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    imagePreview: document.getElementById('imagePreview'),
    previewImage: document.getElementById('previewImage'),
    recognizeBtn: document.getElementById('recognizeBtn'),
    clearImageBtn: document.getElementById('clearImageBtn'),
    changeImageBtn: document.getElementById('changeImageBtn'),
    recognitionResult: document.getElementById('recognitionResult'),
    recognitionStatus: document.getElementById('recognitionStatus'),
    recognizedText: document.getElementById('recognizedText'),
    copyTextBtn: document.getElementById('copyTextBtn'),
    clearTextBtn: document.getElementById('clearTextBtn'),
    templateBtns: document.querySelectorAll('.template-btn'),
    templatePreview: document.getElementById('templatePreview'),
    speechEditor: document.getElementById('speechEditor'),
    fillTemplateBtn: document.getElementById('fillTemplateBtn'),
    resetTemplateBtn: document.getElementById('resetTemplateBtn'),
    generateSpeechBtn: document.getElementById('generateSpeechBtn'),
    copySpeechBtn: document.getElementById('copySpeechBtn'),
    saveTemplateBtn: document.getElementById('saveTemplateBtn'),
    historyList: document.getElementById('historyList'),
    successModal: document.getElementById('successModal'),
    modalMessage: document.getElementById('modalMessage'),
    modalCloseBtns: document.querySelectorAll('.modal-close, .modal-close-btn'),
    aiAnalysisIndicator: null // 稍后创建
};

// 模板定义
const templates = {
    'new-lesson': `【{日期}课堂总结】

📚 今日教学内容：

🎯 教学重点：

👨‍🎓 学生掌握情况：

💡 课后建议：`,

    'exercise': `【{日期}习题讲解】

📝 讲解题目：

🔍 解题思路：

✅ 关键步骤：

📈 常见错误：

💪 巩固练习：`,

    'review': `【{日期}复习总结】

📖 复习内容：

🎯 核心知识点：

📊 掌握程度评估：

🔧 薄弱环节：

🚀 提升建议：`,

    'custom': `【{日期}自定义模板】

📋 内容摘要：

🎯 重点记录：

👨‍🎓 学生反馈：

💡 教学反思：`
};

// 初始化函数
function init() {
    // 创建AI分析状态指示器
    createAIIndicator();
    
    // 检查API配置
    checkAPIConfig();
    
    // 事件监听器
    elements.selectFileBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.recognizeBtn.addEventListener('click', () => recognizeImageWithAI());
    elements.clearImageBtn.addEventListener('click', clearImage);
    elements.changeImageBtn.addEventListener('click', changeImage);
    elements.copyTextBtn.addEventListener('click', copyRecognizedText);
    elements.clearTextBtn.addEventListener('click', clearRecognizedText);
    elements.fillTemplateBtn.addEventListener('click', fillTemplate);
    elements.resetTemplateBtn.addEventListener('click', resetTemplate);
    elements.generateSpeechBtn.addEventListener('click', generateSmartSpeech);
    elements.copySpeechBtn.addEventListener('click', copySpeech);
    elements.saveTemplateBtn.addEventListener('click', saveTemplate);
    
    // 模板按钮事件
    elements.templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTemplate = btn.dataset.template;
            updateTemplatePreview();
        });
    });
    
    // 快捷工具事件
    document.querySelectorAll('.math-term').forEach(btn => {
        btn.addEventListener('click', () => insertText(btn.dataset.text));
    });
    
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => insertText(btn.dataset.text));
    });
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => applyFormat(btn.dataset.format));
    });
    
    // 拖放事件
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    
    // 模态框关闭事件
    elements.modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.successModal.style.display = 'none';
        });
    });
    
    // 初始化模板预览
    updateTemplatePreview();
    
    // 加载历史记录
    loadHistory();
}

// 检查API配置
function checkAPIConfig() {
    // 动态加载API配置模块
    const script = document.createElement('script');
    script.src = 'api-config.js';
    script.onload = function() {
        if (window.apiConfigManager && window.apiConfigManager.isConfigured()) {
            AI_CONFIG.useRealAPI = true;
            console.log('检测到API配置，启用真实AI识别');
            
            // 添加API配置按钮到界面
            addAPIConfigButton();
        }
    };
    script.onerror = function() {
        console.log('API配置模块加载失败，使用模拟AI');
    };
    document.head.appendChild(script);
}

// 添加API配置按钮
function addAPIConfigButton() {
    const header = document.querySelector('header');
    if (!header) return;
    
    const apiBtn = document.createElement('button');
    apiBtn.className = 'btn btn-small api-config-btn';
    apiBtn.innerHTML = '<i class="fas fa-cog"></i> API配置';
    apiBtn.style.position = 'absolute';
    apiBtn.style.top = '20px';
    apiBtn.style.right = '20px';
    
    apiBtn.addEventListener('click', () => {
        if (window.showAPIConfigModal) {
            window.showAPIConfigModal();
        }
    });
    
    header.style.position = 'relative';
    header.appendChild(apiBtn);
}

// 创建AI分析状态指示器
function createAIIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'aiAnalysisIndicator';
    indicator.className = 'ai-indicator';
    indicator.innerHTML = `
        <div class="ai-indicator-content">
            <i class="fas fa-brain"></i>
            <span class="ai-status">AI分析就绪</span>
            <div class="ai-progress" style="display: none;">
                <div class="ai-progress-bar"></div>
                <span class="ai-progress-text">0%</span>
            </div>
        </div>
    `;
    indicator.style.display = 'none';
    
    // 插入到识别结果区域之前
    elements.recognitionResult.parentNode.insertBefore(indicator, elements.recognitionResult);
    elements.aiAnalysisIndicator = indicator;
}

// 更新AI指示器状态
function updateAIIndicator(status, progress = 0) {
    if (!elements.aiAnalysisIndicator) return;
    
    const statusEl = elements.aiAnalysisIndicator.querySelector('.ai-status');
    const progressEl = elements.aiAnalysisIndicator.querySelector('.ai-progress');
    const progressBar = elements.aiAnalysisIndicator.querySelector('.ai-progress-bar');
    const progressText = elements.aiAnalysisIndicator.querySelector('.ai-progress-text');
    
    switch(status) {
        case 'ready':
            elements.aiAnalysisIndicator.style.display = 'none';
            break;
        case 'analyzing':
            elements.aiAnalysisIndicator.style.display = 'block';
            statusEl.textContent = 'AI分析中...';
            progressEl.style.display = 'flex';
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            break;
        case 'completed':
            statusEl.textContent = 'AI分析完成';
            progressEl.style.display = 'none';
            setTimeout(() => {
                elements.aiAnalysisIndicator.style.display = 'none';
            }, 2000);
            break;
        case 'error':
            statusEl.textContent = 'AI分析失败';
            progressEl.style.display = 'none';
            setTimeout(() => {
                elements.aiAnalysisIndicator.style.display = 'none';
            }, 3000);
            break;
    }
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    } else {
        showModal('请选择图片文件（JPG、PNG等）');
    }
}

// 处理拖放
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.uploadArea.style.borderColor = '#2980b9';
    elements.uploadArea.style.background = '#e8f4fc';
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.uploadArea.style.borderColor = '#3498db';
    elements.uploadArea.style.background = '#f8f9fa';
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    elements.uploadArea.style.borderColor = '#3498db';
    elements.uploadArea.style.background = '#f8f9fa';
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    } else {
        showModal('请拖放图片文件（JPG、PNG等）');
    }
}

// 加载图片
function loadImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        currentImage = e.target.result;
        elements.previewImage.src = currentImage;
        elements.imagePreview.style.display = 'block';
        elements.uploadArea.style.display = 'none';
        
        // 自动开始AI识别
        setTimeout(() => recognizeImageWithAI(), 500);
    };
    
    reader.readAsDataURL(file);
}

// ==================== AI增强识别函数 ====================

// 使用AI识别图片内容
async function recognizeImageWithAI() {
    if (!currentImage) {
        showModal('请先上传图片');
        return;
    }
    
    // 隐藏传统的OCR结果显示
    elements.recognitionResult.style.display = 'none';
    
    // 显示AI分析指示器
    updateAIIndicator('analyzing', 10);
    
    try {
        // 检查是否使用真实API
        if (AI_CONFIG.useRealAPI && window.apiConfigManager && window.apiConfigManager.isConfigured()) {
            updateAIIndicator('analyzing', 30);
            
            // 使用真实API识别
            const apiResult = await callRealAIAPI(currentImage);
            
            if (apiResult.success) {
                // 使用API返回的结果
                aiAnalysisResult = {
                    type: 'api-detected',
                    detectedElements: extractElementsFromText(apiResult.text),
                    mathContent: apiResult.text,
                    latexContent: apiResult.latex || '',
                    confidence: 0.9,
                    source: 'api'
                };
                
                updateAIIndicator('analyzing', -1);
            } else {
                // API调用失败，回退到模拟AI
                throw new Error(`API调用失败: ${apiResult.error}`);
            }
        } else {
            // 使用模拟AI识别
            updateAIIndicator('analyzing', 30);
            const imageType = await detectImageType();
            
            updateAIIndicator('analyzing', 60);
            aiAnalysisResult = await analyzeImageWithAI(imageType);
        }
        
        // 提取关键数学概念
        updateAIIndicator('analyzing', 80);
        const mathConcepts = extractMathConcepts(aiAnalysisResult);
        
        // 智能填充模板
        updateAIIndicator('analyzing', 90);
        await smartFillTemplate(mathConcepts);
        
        // 完成
        updateAIIndicator('completed');
        
        // 保存分析结果到历史记录
        saveToHistory({
            imageType: aiAnalysisResult.type,
            concepts: mathConcepts,
            timestamp: new Date().toISOString(),
            source: aiAnalysisResult.source || 'simulated'
        });
        
    } catch (error) {
        console.error('AI识别失败:', error);
        updateAIIndicator('error');
        
        // 回退到传统OCR
        if (AI_CONFIG.fallbackToOCR) {
            showModal('AI识别失败，使用传统OCR识别');
            await recognizeImageTraditional();
        } else {
            showModal('AI识别失败，请重试');
        }
    }
}

// 调用真实AI API
async function callRealAIAPI(imageData) {
    if (!window.apiConfigManager) {
        throw new Error('API配置模块未加载');
    }
    
    const config = window.apiConfigManager.getCurrentConfig();
    if (!config.isConfigured) {
        throw new Error('API未配置');
    }
    
    try {
        const endpoint = window.apiConfigManager.getEndpoint();
        const headers = window.apiConfigManager.getHeaders();
        const body = window.apiConfigManager.getRequestBody(imageData);
        
        updateAIIndicator('analyzing', 50);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        updateAIIndicator('analyzing', 80);
        
        return window.apiConfigManager.parseResponse(data);
        
    } catch (error) {
        console.error('API调用失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 从文本中提取元素
function extractElementsFromText(text) {
    const elements = [];
    const mathKeywords = [
        '函数', '方程', '几何', '三角', '代数', '微积分',
        '公式', '定理', '证明', '计算', '图形', '图表',
        '坐标', '斜率', '导数', '积分', '矩阵', '向量'
    ];
    
    mathKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            elements.push(keyword);
        }
    });
    
    // 检测LaTeX公式
    const latexPattern = /\$[^$]+\$|\\[a-zA-Z]+\{.*?\}/g;
    const latexMatches = text.match(latexPattern);
    if (latexMatches) {
        elements.push('latex-formula');
    }
    
    return elements;
}

// 检测图片类型
async function detectImageType() {
    // 这里可以实现图片类型检测逻辑
    // 实际实现可能需要调用AI API或使用本地模型
    
    // 模拟检测逻辑
    return new Promise((resolve) => {
        setTimeout(() => {
            // 基于图片内容的简单检测
            const types = ['math-formula', 'geometry-diagram', 'algebra-chart', 'text-content'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            resolve(randomType);
        }, 500);
    });
}

// 使用AI分析图片
async function analyzeImageWithAI(imageType) {
    // 这里可以实现具体的AI分析逻辑
    // 可以调用HuggingFace API、OpenAI API或本地模型
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // 模拟AI分析结果
            const analysisResult = {
                type: imageType,
                detectedElements: [],
                mathContent: '',
                confidence: 0.85
            };
            
            // 根据图片类型生成不同的分析结果
            switch(imageType) {
                case 'math-formula':
                    analysisResult.detectedElements = ['quadratic-function', 'parabola', 'vertex-formula'];
                    analysisResult.mathContent = '检测到二次函数图像，顶点公式为 y = a(x-h)² + k';
                    break;
                case 'geometry-diagram':
                    analysisResult.detectedElements = ['triangle', 'circle', 'angles'];
                    analysisResult.mathContent = '检测到几何图形，包含三角形和圆的相关性质';
                    break;
                case 'algebra-chart':
                    analysisResult.detectedElements = ['function-graph', 'coordinates', 'slope'];
                    analysisResult.mathContent = '检测到函数图像图表，分析函数变化趋势';
                    break;
                default:
                    analysisResult.detectedElements = ['text', 'equations'];
                    analysisResult.mathContent = '检测到数学文本内容，包含公式和解题步骤';
            }
            
            resolve(analysisResult);
        }, 1000);
    });
}

// 提取数学概念
function extractMathConcepts(analysisResult) {
    const concepts = {
        topics: [],
        formulas: [],
        difficulty: 'medium',
        gradeLevel: 'high-school'
    };
    
    // 根据检测到的元素推断数学概念
    analysisResult.detectedElements.forEach(element => {
        switch(element) {
            case 'quadratic-function':
            case 'parabola':
            case 'vertex-formula':
                concepts.topics.push('二次函数');
                concepts.formulas.push('y = a(x-h)² + k');
                break;
            case 'triangle':
                concepts.topics.push('三角形');
                concepts.formulas.push('面积公式: S = ½bh');
                break;
            case 'circle':
                concepts.topics.push('圆');
                concepts.formulas.push('周长: C = 2πr, 面积: A = πr²');
                break;
            case 'function-graph':
                concepts.topics.push('函数图像');
                break;
            case 'coordinates':
                concepts.topics.push('坐标系');
                break;
            case 'slope':
                concepts.topics.push('斜率');
                concepts.formulas.push('k = (y₂-y₁)/(x₂-x₁)');
                break;
        }
    });
    
    return concepts;
}

// 智能填充模板
async function smartFillTemplate(mathConcepts) {
    // 根据分析结果智能选择模板
    let recommendedTemplate = currentTemplate;
    
    if (mathConcepts.topics.includes('二次函数') || mathConcepts.topics.includes('函数图像')) {
        recommendedTemplate = 'new-lesson';
    } else if (mathConcepts.topics.includes('三角形') || mathConcepts.topics.includes('圆')) {
        recommendedTemplate = 'exercise';
    } else if (mathConcepts.formulas.length > -1) {
        recommendedTemplate = 'review';
    }
    
    // 更新模板选择
    elements.templateBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.template === recommendedTemplate) {
            btn.classList.add('active');
        }
    });
    currentTemplate = recommendedTemplate;
    updateTemplatePreview();
    
    // 智能填充内容
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    
    let filledContent = templates[currentTemplate];
    
    // 替换变量
    filledContent = filledContent.replace('{日期}', dateStr);
    
    if (mathConcepts.topics.length > 0) {
        filledContent = filledContent.replace('{教学内容}', mathConcepts.topics.join('、'));
    }
    
    if (mathConcepts.formulas.length > 0) {
        const formulasText = mathConcepts.formulas.map(f => `• ${f}`).join('\n');
        filledContent = filledContent.replace('{重点内容}', formulasText);
    }
    
    // 添加AI分析建议
    const aiSuggestion = `\n\n🤖 AI分析建议：\n检测到${mathConcepts.topics.join('、')}相关内容，建议重点讲解${mathConcepts.formulas[0] || '核心概念'}。`;
    filledContent += aiSuggestion;
    
    elements.speechEditor.value = filledContent;
}

// ==================== 传统OCR识别（备用） ====================

// 传统OCR识别（用于回退）
async function recognizeImageTraditional() {
    elements.recognitionStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
    elements.recognitionResult.style.display = 'block';
    
    try {
        const worker = await Tesseract.createWorker('chi_sim+eng');
        const { data: { text } } = await worker.recognize(currentImage);
        await worker.terminate();
        
        recognizedText = text.trim();
        elements.recognizedText.value = recognizedText;
        elements.recognitionStatus.innerHTML = '<i class="fas fa-check-circle"></i> 识别完成';
        
        // 填充模板
        fillTemplate();
        
    } catch (error) {
        console.error('OCR识别失败:', error);
        elements.recognitionStatus.innerHTML = '<i class="fas fa-times-circle"></i> 识别失败';
        showModal('OCR识别失败');
    }
}

// ==================== 其他功能函数 ====================

// 清除图片
function clearImage() {
    currentImage = null;
    recognizedText = '';
    aiAnalysisResult = null;
    elements.previewImage.src = '';
    elements.imagePreview.style.display = 'none';
    elements.uploadArea.style.display = 'block';
    elements.recognitionResult.style.display = 'none';
    elements.recognizedText.value = '';
    elements.speechEditor.value = '';
    updateAIIndicator('ready');
}

// 更换图片
function changeImage() {
    elements.fileInput.click();
}

// 复制识别文字
function copyRecognizedText() {
    if (!recognizedText) {
        showModal('没有可复制的文字');
        return;
    }
    
    navigator.clipboard.writeText(recognizedText)
        .then(() => showModal('文字已复制到剪贴板'))
        .catch(() => showModal('复制失败，请手动复制'));
}

// 清空识别文字
function clearRecognizedText() {
    recognizedText = '';
    elements.recognizedText.value = '';
}

// 更新模板预览
function updateTemplatePreview() {
    elements.templatePreview.textContent = templates[currentTemplate];
}

// 填充模板
function fillTemplate() {
    if (!recognizedText && !aiAnalysisResult) {
        showModal('请先识别图片内容');
        return;
    }
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    
    let content = templates[currentTemplate];
    content = content.replace('{日期}', dateStr);
    
    // 如果有AI分析结果，使用AI提取的内容
    if (aiAnalysisResult) {
        content = content.replace('{教学内容}', aiAnalysisResult.mathContent || '数学内容');
    } else if (recognizedText) {
        // 使用OCR识别的内容
        const lines = recognizedText.split('\n').slice(0, III).join('\n');
        content = content.replace('{教学内容}', lines || '课堂内容');
    }
    
    elements.speechEditor.value = content;
}

// 重置模板
function resetTemplate() {
    elements.speechEditor.value = templates[currentTemplate];
}

// 智能生成话术（使用AI分析结果）
async function generateSmartSpeech() {
    if (!aiAnalysisResult && !recognizedText) {
        showModal('请先上传并识别图片');
        return;
    }
    
    showModal('正在生成智能话术...');
    
    // 模拟AI生成过程
    setTimeout(() => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        
        let smartSpeech = `【${dateStr}智能话术生成】\n\n`;
        
        if (aiAnalysisResult) {
            smartSpeech += `🤖 AI分析：${aiAnalysisResult.mathContent}\n\n`;
            smartSpeech += `📚 检测到的数学概念：${aiAnalysisResult.detectedElements.join('、')}\n\n`;
        }
        
        smartSpeech += `🎯 教学建议：\n`;
        smartSpeech += `1. 从基础概念入手，逐步深入\n`;
        smartSpeech += `2. 结合例题讲解，增强理解\n`;
        smartSpeech += `3. 设计分层练习，巩固掌握\n\n`;
        
        smartSpeech += `👨‍🎓 学生互动建议：\n`;
        smartSpeech += `• 提问引导思考\n`;
        smartSpeech += `• 小组讨论交流\n`;
        smartSpeech += `• 实时反馈调整\n`;
        
        elements.speechEditor.value = smartSpeech;
        showModal('智能话术生成完成！');
    }, 1500);
}

// 复制话术
function copySpeech() {
    const speech = elements.speechEditor.value;
    if (!speech.trim()) {
        showModal('没有可复制的话术内容');
        return;
    }
    
    navigator.clipboard.writeText(speech)
        .then(() => showModal('话术已复制到剪贴板'))
        .catch(() => showModal('复制失败，请手动复制'));
}

// 保存模板
function saveTemplate() {
    const templateName = prompt('请输入模板名称：', `自定义模板_${new Date().toLocaleDateString()}`);
    if (templateName) {
        localStorage.setItem(`template_${templateName}`, elements.speechEditor.value);
        showModal(`模板"${templateName}"已保存`);
    }
}

// 插入文本
function insertText(text) {
    const editor = elements.speechEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const currentText = editor.value;
    
    editor.value = currentText.substring(0, start) + text + currentText.substring(end);
    editor.focus();
    editor.selectionStart = editor.selectionEnd = start + text.length;
}

// 应用格式
function applyFormat(format) {
    const editor = elements.speechEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    let formattedText = selectedText;
    
    switch(format) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'list':
            formattedText = `• ${selectedText}`;
            break;
    }
    
    editor.value = editor.value.substring(0, start) + formattedText + editor.value.substring(end);
    editor.focus();
    editor.selectionStart = start;
    editor.selectionEnd = start + formattedText.length;
}

// 保存到历史记录
function saveToHistory(data) {
    const history = JSON.parse(localStorage.getItem('mathTeacherHistory') || '[]');
    history.unshift({
        ...data,
        preview: data.concepts.topics.join('、') || '数学内容',
        template: currentTemplate
    });
    
    // 只保留最近20条记录
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem('mathTeacherHistory', JSON.stringify(history));
    loadHistory();
}

// 加载历史记录
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('mathTeacherHistory') || '[]');
    const historyList = elements.historyList;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-clock"></i>
                <p>暂无历史记录</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-index">${index + 1}</span>
                <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                <span class="history-template">${item.template}</span>
            </div>
            <div class="history-item-content">
                <p>${item.preview}</p>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-small history-load-btn" data-index="${index}">
                    <i class="fas fa-redo"></i> 加载
                </button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
    
    // 添加历史项点击事件
    document.querySelectorAll('.history-load-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.history-load-btn').dataset.index);
            loadHistoryItem(index);
        });
    });
}

// 加载历史项
function loadHistoryItem(index) {
    const history = JSON.parse(localStorage.getItem('mathTeacherHistory') || '[]');
    if (index >= 0 && index < history.length) {
        const item = history[index];
        
        // 更新模板
        elements.templateBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.template === item.template) {
                btn.classList.add('active');
            }
        });
        currentTemplate = item.template;
        updateTemplatePreview();
        
        // 填充内容
        elements.speechEditor.value = `【历史记录加载】\n\n检测内容：${item.preview}\n\n模板类型：${item.template}\n\n时间：${new Date(item.timestamp).toLocaleString()}`;
        
        showModal('历史记录已加载');
    }
}

// 显示模态框
function showModal(message) {
    elements.modalMessage.textContent = message;
    elements.successModal.style.display = 'flex';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);