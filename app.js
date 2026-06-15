// 全局变量
let currentImage = null;
let recognizedText = '';
let currentTemplate = 'new-lesson';
let tesseractWorker = null;
let isLongImage = false;
let imageSegments = [];

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
    modalCloseBtns: document.querySelectorAll('.modal-close, .modal-close-btn')
};

// 模板定义
const templates = {
    'new-lesson': `【{日期}课堂总结】

📚 今日教学内容：
• 核心知识点：{知识点1}、{知识点2}
• 重点公式：{重要公式}
• 解题方法：{方法技巧}

🎯 教学重点：
{重点内容描述}

👨‍🎓 学生课堂表现：
✓ 积极互动：{学生名单}
✓ 掌握良好：{掌握知识点}
⚠️ 需要关注：{薄弱环节}

📝 课后作业：
{作业内容}

💡 家长配合建议：
{建议内容}`,

    'exercise': `【解题方法精讲】{题目类型}

🔍 题目特点：{题目特征}
🧮 解题步骤：
1. {步骤1}
2. {步骤2}
3. {步骤3}

🌟 核心技巧：{解题技巧}
❌ 常见错误：{易错点}

🏆 学生掌握情况：
• 完全掌握：{学生名单}
• 基本掌握：{学生名单}
• 需要辅导：{学生名单}`,

    'review': `【{章节}复习总结】

📌 知识框架：
{知识结构图}

🎯 必考考点：
1. {考点1}
2. {考点2}
3. {考点3}

📝 典型例题：
{例题摘要}

🔗 易混淆概念：
{对比分析}

👨‍🎓 学生进步点：
{进步表现}`,

    'custom': `【自定义模板】

{自定义内容}`
};

// 初始化函数
function init() {
    // 初始化Tesseract
    initTesseract();
    
    // 绑定事件监听器
    bindEvents();
    
    // 加载历史记录
    loadHistory();
    
    // 设置默认模板
    updateTemplatePreview();
}

// 初始化Tesseract
async function initTesseract() {
    try {
        // 使用Tesseract.js进行OCR识别
        console.log('初始化Tesseract.js...');
    } catch (error) {
        console.error('Tesseract初始化失败:', error);
        showModal('OCR引擎初始化失败，请刷新页面重试');
    }
}

// 绑定所有事件
function bindEvents() {
    // 文件选择按钮
    elements.selectFileBtn.addEventListener('click', () => elements.fileInput.click());
    
    // 文件输入变化
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放上传
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('drop', handleDrop);
    
    // 识别按钮
    elements.recognizeBtn.addEventListener('click', recognizeImage);
    
    // 清除图片按钮
    elements.clearImageBtn.addEventListener('click', clearImage);
    
    // 更换图片按钮
    elements.changeImageBtn.addEventListener('click', () => elements.fileInput.click());
    
    // 复制识别文字
    elements.copyTextBtn.addEventListener('click', () => copyToClipboard(elements.recognizedText.value));
    
    // 清空识别文字
    elements.clearTextBtn.addEventListener('click', () => {
        elements.recognizedText.value = '';
        recognizedText = '';
    });
    
    // 模板选择
    elements.templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.templateBttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTemplate = btn.dataset.template;
            updateTemplatePreview();
        });
    });
    
    // 填充模板
    elements.fillTemplateBtn.addEventListener('click', fillTemplate);
    
    // 重置模板
    elements.resetTemplateBtn.addEventListener('click', resetTemplate);
    
    // 智能生成
    elements.generateSpeechBtn.addEventListener('click', generateSpeech);
    
    // 复制话术
    elements.copySpeechBtn.addEventListener('click', copySpeech);
    
    // 保存模板
    elements.saveTemplateBtn.addEventListener('click', saveTemplate);
    
    // 模态框关闭
    elements.modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.successModal.style.display = 'none';
        });
    });
    
    // 点击模态框外部关闭
    elements.successModal.addEventListener('click', (e) => {
        if (e.target === elements.successModal) {
            elements.successModal.style.display = 'none';
        }
    });
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
        
        // 自动开始识别
        setTimeout(() => recognizeImage(), 500);
    };
    
    reader.readAsDataURL(file);
}

// ==================== 长图处理函数 ====================

// 检测是否为长图
function detectLongImage(imgElement) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const isLong = img.height > LONG_IMAGE_CONFIG.minHeightForSplit;
            resolve({
                isLong: isLong,
                width: img.width,
                height: img.height,
                segments: isLong ? calculateSegments(img.height) : 1
            });
        };
        img.src = currentImage;
    });
}

// 计算分割段数
function calculateSegments(totalHeight) {
    const segments = Math.ceil(totalHeight / LONG_IMAGE_CONFIG.segmentHeight);
    return Math.min(segments, LONG_IMAGE_CONFIG.maxSegments);
}

// 创建图片分割的Canvas
function createImageSegment(imgElement, segmentIndex, imageInfo) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const segmentHeight = LONG_IMAGE_CONFIG.segmentHeight;
        const overlap = LONG_IMAGE_CONFIG.overlapPixels;
        const startY = segmentIndex * segmentHeight - (segmentIndex > 0 ? overlap : 0);
        const endY = Math.min(startY + segmentHeight + overlap, imageInfo.height);
        const actualHeight = endY - startY;
        
        canvas.width = imageInfo.width;
        canvas.height = actualHeight;
        
        // 绘制分割后的图片
        ctx.drawImage(
            imgElement,
            0, startY, imageInfo.width, actualHeight,
            0, 0, imageInfo.width, actualHeight
        );
        
        resolve({
            canvas: canvas,
            segmentIndex: segmentIndex,
            startY: startY,
            height: actualHeight
        });
    });
}

// 识别单个图片段
async function recognizeSegment(canvasData, segmentIndex, totalSegments) {
    try {
        const worker = await Tesseract.createWorker('chi_sim+eng');
        const { data: { text } } = await worker.recognize(canvasData.canvas.toDataURL());
        await worker.terminate();
        
        return {
            segmentIndex: segmentIndex,
            text: text.trim(),
            progress: Math.round(((segmentIndex + 1) / totalSegments) * 100)
        };
    } catch (error) {
        console.error(`段${segmentIndex}识别失败:`, error);
        return {
            segmentIndex: segmentIndex,
            text: `[第${segmentIndex + 1}段识别失败]`,
            progress: Math.round(((segmentIndex + 1) / totalSegments) * 100)
        };
    }
}

// 合并分段识别结果
function mergeSegmentResults(results) {
    // 按段索引排序
    results.sort((a, b) => a.segmentIndex - b.segmentIndex);
    
    // 合并文本，添加段分隔标记
    let mergedText = '';
    results.forEach((result, index) => {
        if (result.text) {
            mergedText += result.text;
            if (index < results.length - 1) {
                mergedText += '\n\n---\n\n'; // 段分隔符
            }
        }
    });
    
    return mergedText;
}

// 识别图片内容（支持长图）
async function recognizeImage() {
    if (!currentImage) {
        showModal('请先上传图片');
        return;
    }
    
    elements.recognitionStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测图片尺寸...';
    elements.recognitionResult.style.display = 'block';
    
    try {
        // 检测是否为长图
        const imageInfo = await detectLongImage();
        isLongImage = imageInfo.isLong;
        
        if (isLongImage) {
            elements.recognitionStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 检测到长图，正在分割为${imageInfo.segments}段识别...`;
            
            // 创建图片元素用于分割
            const img = new Image();
            img.src = currentImage;
            
            await new Promise(resolve => {
                img.onload = async () => {
                    // 创建所有分割段
                    const segmentPromises = [];
                    for (let i = 0; i < imageInfo.segments; i++) {
                        segmentPromises.push(createImageSegment(img, i, imageInfo));
                    }
                    
                    const segments = await Promise.all(segmentPromises);
                    
                    // 识别所有分割段
                    const recognitionPromises = segments.map(segmentData => 
                        recognizeSegment(segmentData, segmentData.segmentIndex, imageInfo.segments)
                    );
                    
                    // 更新进度
                    const progressInterval = setInterval(() => {
                        const completed = recognitionPromises.filter(p => p.status === 'fulfilled').length;
                        const progress = Math.round((completed / imageInfo.segments) * 100);
                        elements.recognitionStatus.innerHTML = 
                            `<i class="fas fa-spinner fa-spin"></i> 长图识别中... ${progress}%`;
                    }, 500);
                    
                    const results = await Promise.all(recognitionPromises);
                    clearInterval(progressInterval);
                    
                    // 合并结果
                    recognizedText = mergeSegmentResults(results);
                    elements.recognizedText.value = recognizedText;
                    elements.recognitionStatus.innerHTML = 
                        `<i class="fas fa-check-circle"></i> 长图识别完成（${imageInfo.segments}段）`;
                    
                    resolve();
                };
            });
            
        } else {
            // 普通图片识别
            elements.recognitionStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
            
            const worker = await Tesseract.createWorker('chi_sim+eng');
            const { data: { text } } = await worker.recognize(currentImage);
            await worker.terminate();
            
            recognizedText = text.trim();
            elements.recognizedText.value = recognizedText;
            elements.recognitionStatus.innerHTML = '<i class="fas fa-check-circle"></i> 识别完成';
        }
        
        // 自动填充模板
        setTimeout(() => fillTemplate(), 500);
        
    } catch (error) {
        console.error('OCR识别失败:', error);
        elements.recognitionStatus.innerHTML = '<i class="fas fa-times-circle"></i> 识别失败';
        
        // 使用模拟数据作为备选
        recognizedText = `二次函数图像与性质\n\n1. 顶点公式：y = a(x-h)² + k\n2. 对称轴：x = h\n3. 开口方向：a > 0 向上，a < 0 向下\n\n例题：求函数 y = 2(x-1)² + 3 的顶点坐标\n解：顶点为 (1, 3)`;
        elements.recognizedText.value = recognizedText;
        
        showModal('OCR识别失败，已使用模拟数据');
    }
}

// 清除图片
function clearImage() {
    currentImage = null;
    recognizedText = '';
    elements.previewImage.src = '';
    elements.imagePreview.style.display = 'none';
    elements.uploadArea.style.display = 'block';
    elements.recognitionResult.style.display = 'none';
    elements.recognizedText.value = '';
    elements.speechEditor.value = '';
}

// 更新模板预览
function updateTemplatePreview() {
    elements.templatePreview.textContent = templates[currentTemplate];
}

// 填充模板
function fillTemplate() {
    if (!recognizedText) {
        showModal('请先识别图片内容');
        return;
    }
    
    let template = templates[currentTemplate];
    
    // 分析识别文本，提取关键信息
    const extractedInfo = extractMathInfo(recognizedText);
    
    // 替换模板变量
    template = template.replace(/{日期}/g, getCurrentDate())
                      .replace(/{知识点1}/g, extractedInfo.topics[0] || '函数与图像')
                      .replace(/{知识点2}/g, extractedInfo.topics[1] || '方程求解')
                      .replace(/{重要公式}/g, extractedInfo.formulas[0] || 'y = ax² + bx + c')
                      .replace(/{方法技巧}/g, extractedInfo.methods[0] || '配方法')
                      .replace(/{重点内容描述}/g, extractedInfo.summary || '掌握基本概念和解题方法')
                      .replace(/{学生名单}/g, '张三、李四、王五')
                      .replace(/{掌握知识点}/g, extractedInfo.topics.join('、') || '基础概念')
                      .replace(/{薄弱环节}/g, '计算准确性、应用题理解')
                      .replace(/{作业内容}/g, '练习册相关章节习题')
                      .replace(/{建议内容}/g, '督促完成作业，及时复习')
                      .replace(/{题目类型}/g, extractedInfo.questionType || '函数题')
                      .replace(/{题目特征}/g, extractedInfo.features || '综合性强')
                      .replace(/{步骤1}/g, '分析题意')
                      .replace(/{步骤2}/g, '建立模型')
                      .replace(/{步骤3}/g, '求解验证')
                      .replace(/{解题技巧}/g, '数形结合')
                      .replace(/{易错点}/g, '符号错误、计算失误')
                      .replace(/{章节}/g, extractedInfo.chapter || '函数章节')
                      .replace(/{考点1}/g, '定义域值域')
                      .replace(/{考点2}/g, '图像性质')
                      .replace(/{考点3}/g, '实际应用')
                      .replace(/{例题摘要}/g, extractedInfo.example || '典型例题解析')
                      .replace(/{对比分析}/g, '一次函数与二次函数区别')
                      .replace(/{进步表现}/g, '计算速度提升、思路更清晰');
    
    elements.speechEditor.value = template;
}

// 提取数学信息
function extractMathInfo(text) {
    const info = {
        topics: [],
        formulas: [],
        methods: [],
        questionType: '',
        features: '',
        chapter: '',
        example: '',
        summary: ''
    };
    
    // 简单关键词匹配
    const mathKeywords = {
        topics: ['函数', '方程', '几何', '代数', '三角', '导数', '积分', '概率', '统计'],
        formulas: ['公式', '定理', '法则', '性质'],
        methods: ['方法', '技巧', '策略', '思路']
    };
    
    // 提取主题
    mathKeywords.topics.forEach(topic => {
        if (text.includes(topic)) {
            info.topics.push(topic);
        }
    });
    
    // 如果没有提取到主题，使用默认值
    if (info.topics.length === 0) {
        info.topics = ['函数', '方程'];
    }
    
    // 生成摘要
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
        info.summary = lines[0].substring(0, 50) + '...';
        info.example = lines.length > 1 ? lines[1].substring(0, -1) : '典型例题';
    }
    
    return info;
}

// 获取当前日期
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 重置模板
function resetTemplate() {
    elements.speechEditor.value = templates[currentTemplate];
}

// 智能生成话术
function generateSpeech() {
    if (!elements.speechEditor.value.trim()) {
        fillTemplate();
        return;
    }
    
    // 这里可以集成AI生成功能
    // 暂时使用增强版模板填充
    const enhancedText = enhanceSpeech(elements.speechEditor.value);
    elements.speechEditor.value = enhancedText;
    showModal('话术已智能增强');
}

// 增强话术
function enhanceSpeech(text) {
    // 添加一些鼓励性语句
    const encouragements = [
        '同学们今天表现非常棒！',
        '继续努力，明天会更好！',
        '相信大家都能掌握这些知识点！',
        '数学其实很有趣，让我们一起探索！'
    ];
    
    const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    if (!text.includes('💪') && !text.includes('加油')) {
        text += `\n\n💪 ${randomEncouragement}`;
    }
    
    return text;
}

// 复制话术
function copySpeech() {
    const text = elements.speechEditor.value.trim();
    if (!text) {
        showModal('请先生成或编辑话术内容');
        return;
    }
    
    copyToClipboard(text);
    
    // 保存到历史记录
    saveToHistory(text);
}

// 保存模板
function saveTemplate() {
    const customTemplate = elements.speechEditor.value.trim();
    if (!customTemplate) {
        showModal('请先编辑话术内容');
        return;
    }
    
    templates.custom = customTemplate;
    localStorage.setItem('customTemplate', customTemplate);
    showModal('自定义模板已保存');
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showModal('已复制到剪贴板！可以粘贴到微信群了。');
    }).catch(err => {
        console.error('复制失败:', err);
        // 备用方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showModal('已复制到剪贴板！可以粘贴到微信群了。');
    });
}

// 显示模态框
function showModal(message) {
    elements.modalMessage.textContent = message;
    elements.successModal.style.display = 'flex';
}

// 保存到历史记录
function saveToHistory(text) {
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    const historyItem = {
        id: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        preview: text.substring(0, 100) + '...',
        content: text
    };
    
    history.unshift(historyItem); // 添加到开头
    if (history.length > 10) {
        history.pop(); // 只保留最近10条
    }
    
    localStorage.setItem('speechHistory', JSON.stringify(history));
    loadHistory();
}

// 加载历史记录
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
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
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-date">${item.date}</span>
                <button class="btn btn-small history-use-btn" data-id="${item.id}">
                    <i class="fas fa-reply"></i> 使用
                </button>
            </div>
            <div class="history-preview">${item.preview}</div>
        `;
        
        historyList.appendChild(historyItem);
    });
    
    // 绑定使用按钮事件
    document.querySelectorAll('.history-use-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            useHistoryItem(id);
        });
    });
}

// 使用历史记录
function useHistoryItem(id) {
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    const item = history.find(item => item.id.toString() === id);
    
    if (item) {
        elements.speechEditor.value = item.content;
        showModal('已加载历史话术');
    }
}

// 加载自定义模板
function loadCustomTemplate() {
    const savedTemplate = localStorage.getItem('customTemplate');
    if (savedTemplate) {
        templates.custom = savedTemplate;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadCustomTemplate();
    init();
});

// 添加键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl + Enter 生成话术
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        generateSpeech();
    }
    
    // Ctrl + C 复制话术
    if (e.ctrlKey && e.key === 'c' && document.activeElement !== elements.speechEditor) {
        e.preventDefault();
        copySpeech();
    }
});