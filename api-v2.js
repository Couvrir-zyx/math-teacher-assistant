const EXTRACT_PROMPT = `你是高中数学教研助理。下面是同一节线上数学课的课堂截图，可能包含印刷体题目、手写板书和老师讲解。

请把全部截图合并整理，只输出 JSON，不要代码块，不要解释。

JSON 结构：
{
  "topic": "完整但简洁的专题名，最多30字，多个板块之间用顿号",
  "modules": [
    {
      "name": "板块名称",
      "boardwork": "老师在这个板块讲了什么方法和关键判断，一到两句",
      "candidate_weakness": "学生可能出现的一个具体卡点，用容易、分不清、漏掉等动作描述",
      "candidate_rule": "换一道同类题仍然适用的动作规则"
    }
  ]
}

要求：
1. 按考点划分板块，合并重复内容，通常提取 3 到 6 个板块。
2. 老师的板书是讲解过程，不等于学生已经掌握。没有学生作答证据时，只能写可能卡点。
3. 看不清的地方如实写“字迹不清”，不要编题。
4. 数学内容必须准确。椭圆上一点和两焦点构成的三角形，周长是长轴长加焦距；过一个焦点的弦和另一个焦点构成的三角形，周长才是四倍长半轴，二者不能混用。
5. topic 要能直接放进开场白，不要带“专题”“综合练习”等尾巴。`;

const LEVEL_RULES = {
  "基础巩固": {
    content: 3,
    weakness: 3,
    rules: 3,
    tone: "少用专业术语，多写学生能直接照做的动作。先指出本次确实做对的具体环节，不写和以前比较的进步。"
  },
  "稳步提升": {
    content: 4,
    weakness: 4,
    rules: 4,
    tone: "按常规深度写，既指出具体问题，也给出马上能执行的处理方法。"
  },
  "拔尖冲刺": {
    content: 5,
    weakness: 5,
    rules: 5,
    tone: "不要停留在会做和套路。重点指出条件是否用全、分类是否完备、必要性是否验证、有没有更快的解法以及结论的适用边界。"
  }
};

export async function analyzeImages(images, context, settings, onProgress = () => {}) {
  if (!images.length) throw new Error("请至少上传一张课堂截图。");
  onProgress("正在读取课堂截图…", 12);

  const content = [{
    type: "text",
    text: `${EXTRACT_PROMPT}

补充信息：
- 本次反馈对象：${context.group ? "组课（多位同学）" : context.studentName}
- 老师补充：${context.note || "无"}
- 老师指定的专题：${context.topic || "未指定，请根据截图判断"}`
  }];

  for (const image of images) {
    content.push({ type: "image_url", image_url: { url: image.dataUrl } });
  }

  const raw = await callModel(settings, [
    { role: "system", content: "你是严谨的高中数学教研助理，只输出可解析的 JSON。" },
    { role: "user", content }
  ], 4200);

  onProgress("正在整理课堂板块…", 34);
  const parsed = parseJsonObject(raw);
  if (!Array.isArray(parsed.modules) || !parsed.modules.length) {
    throw new Error("没有识别出有效课堂内容，请换一张更清晰的截图重试。");
  }
  return {
    topic: tidyTopic(parsed.topic || context.topic || "课堂反馈"),
    modules: parsed.modules.slice(0, 6)
  };
}

export async function generateFeedback(analysis, context, settings, onProgress = () => {}) {
  const shape = LEVEL_RULES[context.level] || LEVEL_RULES["稳步提升"];
  const opening = context.group
    ? "各位同学家长您好，这是本次" + context.topic + "专题课的课堂反馈"
    : "家长您好，这是" + context.studentName + "本次" + context.topic + "专题课的课堂反馈";

  const prompt = `你是一位高中数学线上老师，正在给家长写课后反馈。

【固定结构】
必须完整保留四个标题：
【课堂内容】
【课堂表现与改进建议】
【后续做题注意】
【课后任务】

【必须遵守】
1. 使用以下固定开场白，然后直接进入【课堂内容】：
${opening}
2. 学生水平：${context.level}
${shape.tone}
3. 课堂内容写 ${shape.content} 项编号内容。每项格式为“板块名：这节课讲了什么、关键方法或判断步骤”，保留方法，但不要写题号、答案或大段计算。
4. 课堂表现与改进建议先写一到两句本次课堂总评，再写 ${shape.weakness} 条编号薄弱点。每条要写“具体表现或可能卡点 + 怎么改”。没有证据时用“容易”“可能”，不要把板书内容说成学生已经掌握。
5. 后续做题注意写 ${shape.rules} 条编号规则。每条一个清晰判断或动作，换一道同类题也能使用。
6. 课后任务固定 3 条，编号为 1. 2. 3.：
   第1条分类整理本次错题并写错因；
   第2条整理今天的方法、条件或结论；
   第3条完成课后练习并复盘一个与本课相关的具体点。
7. ${context.group ? "这是组课。全文使用“同学们”或“大家”，不写个人姓名，也不要把某一个人的问题扩大成所有人的问题。" : `这是单个学生反馈。全文直接称呼“${context.studentName}”，不要用“孩子”“该生”“学生”。`}
8. 没有提供往期反馈原文，不得写“比之前进步”“比上次稳”“相较以前提升”“最近有进步”等跨课比较。${context.firstLesson ? "系统判断这是第一次留下反馈，严禁任何往期比较。" : ""}
9. 不出现复杂数学公式、上下标、绝对值、分数线或难输入的符号。把公式意思写成中文。
10. 不要写“加油”“老师相信”“辛苦了”“综上所述”“整体来看”等套话。
11. 全文非空白字符不超过 1000 个。宁可压缩句子，也不要丢四个标题和有效信息。

【本次课堂结构化数据】
${JSON.stringify(analysis)}

【老师补充：优先采信】
${context.note || "无。只能依据课堂截图和结构化数据写，不要编造学生课堂上的态度或经历。"}`;

  onProgress("正在组织课堂反馈…", 62);
  let feedback = await callModel(settings, [
    { role: "system", content: "你是一位语言自然、判断严谨的高中数学老师，只写本次课堂有证据的内容。" },
    { role: "user", content: prompt }
  ], 2600);

  feedback = normalizeFeedback(feedback, context);
  if (visibleLength(feedback) > 1000) {
    onProgress("反馈信息较完整，正在压缩到 1000 字以内…", 78);
    const compact = await callModel(settings, [
      { role: "system", content: "你负责压缩高中课后反馈，必须保留四个标题、教学事实和每个部分的全部有效条目。" },
      {
        role: "user",
        content: `把下面反馈压缩到 900 至 950 个非空白字符，绝对不能超过 1000 字。不能删除四段标题，不能减少课堂内容、薄弱点和做题注意的条数，课后任务仍保留 3 条。只输出修订后的完整反馈。\n\n${feedback}`
      }
    ], 2200);
    feedback = normalizeFeedback(compact, context);
  }

  onProgress("反馈已生成", 100);
  return feedback;
}

export async function generateSummary(studentName, lessons, settings, onProgress = () => {}) {
  if (!lessons.length) throw new Error("还没有可以总结的课次。");
  const source = lessons.slice().reverse().map((lesson, index) => {
    return `【记录 ${index + 1}·${lesson.topic}·${lesson.course}】\n${lesson.feedback}`;
  }).join("\n\n");

  onProgress("正在梳理往期反馈…", 35);
  const prompt = `你是一位高中数学老师，要为家长写一份阶段总结。

学生：${studentName}
已有 ${lessons.length} 次课堂反馈，内容如下：
${source}

要求：
1. 只整理已经出现的真实变化和持续薄弱点，不按“第几次课”写流水账。
2. 全文不要出现具体日期、第几次课、最近一次、前几次等时间信息。
3. 结构按内容自适应：
   - 2 到 3 次课：【整体情况】【有变化的地方】【还要盯的地方】【给家长的建议】
   - 4 次课以上：可增加【接下来怎么练】和【阶段目标】
4. 变化必须写成“从……到……”或具体动作的前后差别；没有证据就写仍然存在，不要编造进步。
5. 语言自然、简洁、像老师当面沟通，不写空泛鼓励。
6. 全文 300 到 650 字，不使用复杂公式或符号。
7. 直接输出总结正文，不要解释。`;

  const text = await callModel(settings, [
    { role: "system", content: "你善于从多次课堂记录中提炼稳定变化，但不夸大、不编造。" },
    { role: "user", content: prompt }
  ], 2200);
  onProgress("阶段总结已生成", 100);
  return text.trim();
}

export async function testConnection(settings) {
  const text = await callModel(settings, [
    { role: "system", content: "只回答两个字：正常" },
    { role: "user", content: "连接测试" }
  ], 20);
  return text.trim();
}

async function callModel(settings, messages, maxTokens) {
  if (!settings.apiKey) throw new Error("还没有填写 DeepSeek API Key。");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(settings.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model || "deepseek-chat",
        messages,
        max_tokens: maxTokens,
        temperature: 0.25
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }
    if (!response.ok) {
      const message = data?.error?.message || raw.slice(0, 300) || `HTTP ${response.status}`;
      throw new Error(`API 请求失败：${message}`);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("API 没有返回有效内容。");
    return content;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("请求超时，请检查网络后重试。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonObject(raw) {
  const text = String(raw || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("模型没有返回可解析的课堂结构。");
  return JSON.parse(text.slice(start, end + 1));
}

function tidyTopic(value) {
  const cleaned = String(value || "").trim().replace(/[。；;，,、\s]+$/g, "");
  if (cleaned.length <= 30) return cleaned;
  const parts = cleaned.split(/[、，,；;]/).filter(Boolean);
  return parts[0] || cleaned.slice(0, 30);
}

function normalizeFeedback(feedback, context) {
  let body = String(feedback || "").trim();
  const heading = body.indexOf("【课堂内容】");
  if (heading > 0) body = body.slice(heading).trimStart();
  const opening = context.group
    ? `各位同学家长您好，这是本次${context.topic}专题课的课堂反馈`
    : `家长您好，这是${context.studentName}本次${context.topic}专题课的课堂反馈`;
  return `${opening}\n\n${body}`.trim();
}

export function visibleLength(text) {
  return [...String(text || "")].filter(char => !/\s/.test(char)).length;
}
