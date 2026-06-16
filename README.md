# 数学教师助手 - AI增强版

一个帮助数学教师上传课堂图片，自动生成微信群话术的Web应用。支持AI智能识别数学内容。

## ✨ 功能特性

### 🖼️ 图片识别
- **AI智能识别**：使用AI分析数学图片内容
- **多API支持**：Mathpix、OpenAI、Gemini
- **传统OCR备用**：Tesseract.js文字识别
- **长图处理**：自动分割识别长截图

### 📝 话术生成
- **智能模板**：新课讲解、习题讲解、复习总结、自定义
- **AI建议**：根据图片内容提供教学建议
- **快捷编辑**：数学术语、表情符号、格式工具
- **历史记录**：保存和加载过往记录

### ⚙️ 配置管理
- **API配置界面**：友好的API密钥管理
- **本地存储**：配置和记录保存在浏览器中
- **响应式设计**：适配手机和电脑

## 🚀 快速开始

### 在线使用
1. 访问部署的页面
2. 上传数学课堂图片
3. 选择话术模板
4. 复制生成的话术到微信群

### 本地运行
1. 下载所有文件到本地
2. 用浏览器打开 `index.html`
3. 无需服务器，直接使用

## 🔧 API配置（可选）

### 支持的AI API
1. **Mathpix**（推荐） - 专业数学公式识别
2. **OpenAI** - GPT-4 Vision通用识别
3. **Google Gemini** - 免费额度可用

### 配置步骤
1. 点击右上角"API配置"按钮
2. 选择API提供商
3. 输入API密钥
4. 点击"测试连接"
5. 保存配置

## 📁 文件结构

```
math-teacher-assistant/
├── index.html          # 主页面
├── app.js             # 主逻辑（AI识别核心）
├── api-config.js      # API配置管理
├── style.css          # 主样式
├── quick-tools.css    # 快捷工具样式
├── README.md          # 本文件
├── DEPLOYMENT.md      # 部署说明
├── GITHUB_DEPLOYMENT.md # GitHub部署
├── deploy.bat         # 部署脚本
└── 其他支持文件...
```

## 🛠️ 技术栈

- **前端**：HTML5、CSS3、JavaScript (ES6+)
- **AI识别**：Tesseract.js、AI API集成
- **图标**：Font Awesome 6
- **部署**：GitHub Pages、Vercel、Netlify

## 📱 浏览器兼容性

- Chrome 90+ ✅
- Firefox 88+ ✅
- Edge 90+ ✅
- Safari 14+ ✅
- 移动浏览器 ✅

## 🔄 更新日志

### v1.1 - AI增强版
- 添加AI智能识别功能
- 支持多种AI API集成
- 改进用户界面和体验
- 添加API配置管理

### v1.0 - 基础版
- 图片上传和OCR识别
- 话术模板系统
- 基础编辑功能
- 历史记录

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发指南
1. Fork本仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License - 详见LICENSE文件

## 🙏 致谢

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR识别
- [Font Awesome](https://fontawesome.com/) - 图标
- [Mathpix](https://mathpix.com/) - 数学公式识别API
- [OpenAI](https://openai.com/) - GPT API

## 📞 联系

如有问题或建议，请提交Issue或联系维护者。

---

**让数学教学更轻松！** 🎯