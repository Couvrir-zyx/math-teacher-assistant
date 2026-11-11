import test from "node:test";
import assert from "node:assert/strict";
import { analyzeImages, generateFeedback, visibleLength } from "../api-v2.js";
import { store } from "../store-v2.js";
import { cloud, mergeData } from "../cloud-v2.js";

const settings = {
  apiKey: "test-key",
  endpoint: "https://example.test/chat/completions",
  model: "deepseek-chat"
};

function mockResponse(content) {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }]
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

test("课堂截图解析为结构化板块", async () => {
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model, "deepseek-chat");
    assert.equal(body.messages[1].content.length, 2);
    return mockResponse(JSON.stringify({
      topic: "圆的最值、椭圆定义与焦点三角形",
      modules: [
        { name: "圆上动点最值", candidate_weakness: "容易硬算" },
        { name: "椭圆定义", candidate_weakness: "容易漏掉距离和条件" }
      ]
    }));
  };

  const result = await analyzeImages([
    { dataUrl: "data:image/png;base64,AAAA" }
  ], {
    studentName: "测试学生",
    group: false,
    note: ""
  }, settings);

  assert.equal(result.modules.length, 2);
  assert.match(result.topic, /椭圆/);
});

test("多张截图分别识别后合并板块", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls <= 2) {
      return mockResponse(JSON.stringify({
        topic: calls === 1 ? "圆" : "椭圆",
        modules: [{ name: calls === 1 ? "圆的最值" : "椭圆定义" }]
      }));
    }
    return mockResponse(JSON.stringify({
      topic: "圆与椭圆",
      modules: [{ name: "圆的最值" }, { name: "椭圆定义" }]
    }));
  };
  const result = await analyzeImages([
    { dataUrl: "data:image/png;base64,AAAA" },
    { dataUrl: "data:image/png;base64,BBBB" }
  ], {
    studentName: "测试学生",
    group: false,
    note: ""
  }, settings);
  assert.equal(calls, 3);
  assert.equal(result.topic, "圆与椭圆");
  assert.equal(result.modules.length, 2);
});

test("组课反馈使用多人称呼并保留四段", async () => {
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const prompt = body.messages[1].content;
    assert.match(prompt, /各位同学家长您好/);
    assert.match(prompt, /课堂内容写 4 项/);
    return mockResponse(`各位同学家长您好，这是本次圆与椭圆专题课的课堂反馈

【课堂内容】
1. 圆的最值
2. 椭圆定义
3. 标准方程
4. 焦点三角形

【课堂表现与改进建议】
1. 注意定义条件
2. 注意焦点位置
3. 注意变量范围
4. 注意分类完整

【后续做题注意】
1. 先定范围
2. 再看关系
3. 最后计算
4. 回头检查

【课后任务】
1. 整理错题
2. 整理方法
3. 完成练习`);
  };

  const feedback = await generateFeedback({
    topic: "圆与椭圆",
    modules: [{ name: "圆的最值" }, { name: "椭圆定义" }]
  }, {
    studentName: "圆椭圆专题班",
    group: true,
    course: "同步",
    level: "稳步提升",
    topic: "圆与椭圆",
    note: "",
    firstLesson: true
  }, settings);

  assert.match(feedback, /^各位同学家长您好/);
  assert.match(feedback, /【课后任务】/);
  assert.ok(visibleLength(feedback) <= 1000);
});

test("空白字符不进入反馈字数统计", () => {
  assert.equal(visibleLength("反 馈\n\r测试"), 4);
});

test("旧工作台 JSON 能导入学生课次", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };

  const count = store.importObjects([{
    filename: "2026-11-01-函数定义域与抽象函数.json",
    data: {
      student: "海澄",
      date: "2026-11-01",
      course: "同步",
      topic: "函数定义域与抽象函数",
      modules: [{ name: "抽象函数定义域" }],
      feedback: "家长您好，这是海澄本次函数定义域与抽象函数专题课的课堂反馈"
    }
  }]);

  assert.equal(count, 1);
  assert.equal(store.studentsWithCounts()[0].name, "海澄");
  assert.match(store.lessonsFor("海澄")[0].feedback, /函数定义域/);
});

test("本机与云端课次可按编号合并", () => {
  const merged = mergeData({
    lessons: [{
      id: "same",
      date: "2026-11-01",
      createdAt: "2026-11-01T10:00:00Z",
      updatedAt: "2026-11-01T12:00:00Z",
      feedback: "本机新版"
    }],
    summaries: []
  }, {
    lessons: [{
      id: "same",
      date: "2026-11-01",
      createdAt: "2026-11-01T10:00:00Z",
      updatedAt: "2026-11-01T11:00:00Z",
      feedback: "云端旧版"
    }, {
      id: "cloud-only",
      date: "2026-11-02",
      createdAt: "2026-11-02T10:00:00Z",
      feedback: "云端独有"
    }],
    summaries: []
  });
  assert.equal(merged.lessons.length, 2);
  assert.equal(merged.lessons.find(item => item.id === "same").feedback, "本机新版");
});

test("Supabase 云同步使用当前用户令牌", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "POST") return new Response("", { status: 201 });
    return new Response(JSON.stringify([{ payload: { lessons: [], summaries: [] } }]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  const config = { url: "https://demo.supabase.co", anonKey: "anon", email: "teacher@example.com" };
  const session = {
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: Date.now() + 3600000,
    userId: "user-1",
    email: "teacher@example.com"
  };
  await cloud.pull(config, session);
  await cloud.push(config, session, { version: 1, lessons: [], summaries: [] });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /workbench_state/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer access");
  assert.equal(calls[1].options.headers.apikey, "anon");
  assert.match(calls[1].options.body, /"user_id":"user-1"/);
});
