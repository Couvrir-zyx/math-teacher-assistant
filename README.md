# 数学教师工作台

高中数学线上教师使用的课堂反馈 Web 工作台。上传课堂截图后，使用 DeepSeek 识别课堂板块，生成单讲或组课反馈，并保存学生课次档案。

这是从原「数学教师助手」重写的第一版 Web MVP。旧版位于 Git 历史中，不再作为运行入口。

## 当前功能

- 多张课堂截图上传、拖放和剪贴板粘贴
- 单讲 / 组课反馈
- 基础巩固、稳步提升、拔尖冲刺三档结构区分
- 1000 字上限和超长反馈二次压缩
- 学生课次库、往期反馈查看和搜索
- 阶段总结生成
- 反馈图片卡片导出
- 本地数据备份、旧工作台 JSON 导入
- 可选的 Supabase 跨设备云同步
- PWA 离线壳，可安装到桌面或手机主屏幕

## 本地运行

项目无需安装构建依赖，只需要 Node.js 18 或更高版本。

```bash
cd work/site-review-20261111
node server.mjs
```

打开 `http://127.0.0.1:4173/`。直接双击 `index.html` 时，浏览器的 ES Module 和剪贴板权限可能受限，建议始终通过本地 HTTP 服务测试。

Windows 也可以双击 `启动预览.cmd`。

## 测试

```bash
node --test tests/*.test.mjs
```

## 部署

主分支根目录就是 GitHub Pages 静态站点，无需构建步骤。推送到 `main` 后，GitHub Pages 会直接发布：

`https://couvrir-zyx.github.io/math-teacher-assistant/`

## 开启跨设备同步

1. 在 [Supabase](https://supabase.com/) 新建一个免费项目。
2. 打开项目 SQL Editor，执行根目录的 `supabase-schema.sql`。
3. 在 Supabase Authentication 中启用 Email 登录。开发阶段可以关闭邮件确认，正式使用建议开启。
4. 把项目的 Project URL 和 anon public key 填入网站的「设置与数据 → 跨设备云同步」。
5. 输入教师邮箱和密码，点击「创建账号」或「登录并同步」。

网页只使用 Supabase anon key，不包含 service role key。数据库启用了行级安全，每个登录用户只能读写自己的记录。

## 数据与安全

- 学生课次档案保存在浏览器 `localStorage`，不包含 API Key。
- DeepSeek API Key 只保存在当前浏览器，不会进入导出的档案文件。
- Web 版直接请求 DeepSeek 接口。正式多用户版本应改用服务端代理，避免密钥暴露给浏览器。
- 未登录 Supabase 时，档案只保存在本机；登录后会在本机与云端按课次编号合并。
- 可以通过「导出全部档案」和「导入旧工作台 JSON」继续做离线备份。

## 下一阶段

1. 创建 Supabase 项目并实际跑通双设备同步。
2. 接入题库索引和题目图片对象存储。
3. 增加课后练习组卷、教师解析版和 Word/PDF 导出。
4. 桌面版继续负责 WPS 切题和题库生产，网页端负责日常查询与使用。
