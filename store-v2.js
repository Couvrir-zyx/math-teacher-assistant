const DATA_KEY = "math-teacher-workbench.data.v1";
const SETTINGS_KEY = "math-teacher-workbench.settings.v1";

const emptyData = () => ({
  version: 1,
  students: [],
  lessons: [],
  summaries: []
});

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const store = {
  getData() {
    const value = readJson(DATA_KEY, emptyData());
    return {
      version: 1,
      students: Array.isArray(value.students) ? value.students : [],
      lessons: Array.isArray(value.lessons) ? value.lessons : [],
      summaries: Array.isArray(value.summaries) ? value.summaries : []
    };
  },

  saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return data;
  },

  getSettings() {
    return {
      apiKey: "",
      model: "deepseek-chat",
      endpoint: "https://api.deepseek.com/chat/completions",
      ...readJson(SETTINGS_KEY, {})
    };
  },

  saveSettings(settings) {
    const value = {
      apiKey: String(settings.apiKey || "").trim(),
      model: String(settings.model || "deepseek-chat").trim(),
      endpoint: String(settings.endpoint || "https://api.deepseek.com/chat/completions").trim()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
    return value;
  },

  studentsWithCounts() {
    const data = this.getData();
    const map = new Map();
    for (const lesson of data.lessons) {
      const current = map.get(lesson.studentName) || {
        name: lesson.studentName,
        count: 0,
        group: Boolean(lesson.group),
        lastDate: "",
        level: lesson.level || "稳步提升"
      };
      current.count += 1;
      current.group = current.group || Boolean(lesson.group);
      if (!current.lastDate || lesson.date > current.lastDate) {
        current.lastDate = lesson.date;
        current.level = lesson.level || current.level;
      }
      map.set(lesson.studentName, current);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
  },

  lessonsFor(studentName) {
    return this.getData().lessons
      .filter(item => item.studentName === studentName)
      .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  },

  recentLessons(limit = 8) {
    return this.getData().lessons
      .slice()
      .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))
      .slice(0, limit);
  },

  upsertLesson(lesson) {
    const data = this.getData();
    const index = data.lessons.findIndex(item => item.id === lesson.id);
    if (index >= 0) data.lessons[index] = lesson;
    else data.lessons.push(lesson);
    this.saveData(data);
    return lesson;
  },

  upsertSummary(summary) {
    const data = this.getData();
    const index = data.summaries.findIndex(item => item.id === summary.id);
    if (index >= 0) data.summaries[index] = summary;
    else data.summaries.push(summary);
    this.saveData(data);
    return summary;
  },

  importObjects(objects, folderHints = []) {
    const data = this.getData();
    const existing = new Set(data.lessons.map(item => item.id));
    let imported = 0;

    objects.forEach((object, index) => {
      const source = object?.data || object;
      if (!source || !source.feedback || !Array.isArray(source.modules)) return;
      const studentName = String(source.student || folderHints[index] || "").trim();
      if (!studentName) return;
      const date = normalizeDate(source.date) || dateFromFilename(object?.filename) || new Date().toISOString().slice(0, 10);
      const topic = String(source.topic || topicFromFilename(object?.filename) || "课堂反馈");
      const id = `${studentName}::${date}::${topic}`;
      if (existing.has(id)) return;
      existing.add(id);
      data.lessons.push({
        id,
        studentName,
        group: Boolean(source.groupMode),
        date,
        course: String(source.course || "同步"),
        level: String(source.level || "稳步提升"),
        topic,
        teacherNote: String(source.teacherNote || ""),
        modules: source.modules,
        feedback: String(source.feedback || ""),
        createdAt: new Date().toISOString(),
        source: "import"
      });
      imported += 1;
    });

    this.saveData(data);
    return imported;
  },

  exportData() {
    return {
      app: "math-teacher-workbench",
      version: 1,
      exportedAt: new Date().toISOString(),
      ...this.getData()
    };
  },

  loadDemo() {
    const data = this.getData();
    if (data.lessons.some(item => item.id === demoLessons[0].id)) return 0;
    data.lessons.push(...clone(demoLessons));
    this.saveData(data);
    return demoLessons.length;
  },

  byteSize() {
    return new Blob([JSON.stringify(this.getData())]).size;
  }
};

export function makeId(prefix = "lesson") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayString() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function dateFromFilename(filename = "") {
  return normalizeDate(filename);
}

function topicFromFilename(filename = "") {
  const base = String(filename).split(/[\\/]/).pop().replace(/\.json$/i, "");
  return base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

const demoLessons = [
  {
    id: "demo-海澄-2026-11-01",
    studentName: "海澄",
    group: false,
    date: "2026-11-01",
    course: "同步",
    level: "基础巩固",
    topic: "函数定义域与抽象函数",
    teacherNote: "具体函数限制条件能列出来，抽象函数定义域容易把括号里的整体和自变量混在一起。",
    modules: [{ name: "具体函数定义域" }, { name: "抽象函数定义域" }, { name: "复合函数定义域" }],
    feedback: `家长您好，这是海澄本次函数定义域与抽象函数专题课的课堂反馈

【课堂内容】

1. 具体函数定义域：依次检查分母、根号和其他限制条件
2. 抽象函数定义域：先由已知范围求出括号内整体的范围，再求新变量范围
3. 复合函数定义域：内外层函数的限制条件都要保留，最后取交集

【课堂表现与改进建议】

海澄今天列具体函数限制条件时顺序没乱，根号和分母能够逐项检查。主要问题在抽象函数定义域，几道题把括号里的式子直接当成了自变量范围。

1. 抽象函数定义域：先问题目给的是谁的范围。已知的是自变量，就先把括号内整体范围求出来，再求新式子里的自变量。
2. 复合函数定义域：有一道题只看了内层，漏掉外层分母不能为零。以后做完内层，再从头检查一遍外层限制。
3. 求函数值：不要急着先求解析式，先看能不能令括号内整体等于目标值，再代回原式。

【后续做题注意】

1. 动笔之前先把所有限制条件列出来，再开始计算
2. 题目里每个条件都要在最后检查一次有没有用上
3. 遇到括号内不是单个字母时，先想清楚这个整体代表什么

【课后任务】

1. 把今天做错的抽象函数、复合函数题分开整理，标清错在范围转换还是漏条件
2. 整理一张定义域检查表，写清分母、根号、抽象函数各看什么
3. 完成课后小练习，重点复盘括号内整体范围有没有先求出来`,
    createdAt: "2026-11-01T12:00:00.000Z",
    source: "demo"
  },
  {
    id: "demo-海澄-2026-11-08",
    studentName: "海澄",
    group: false,
    date: "2026-11-08",
    course: "同步",
    level: "稳步提升",
    topic: "函数单调性与奇偶性",
    teacherNote: "定义判断基本掌握，但含参单调性讨论容易漏区间。",
    modules: [{ name: "函数单调性" }, { name: "奇偶性判断" }, { name: "含参单调区间" }],
    feedback: `家长您好，这是海澄本次函数单调性与奇偶性专题课的课堂反馈

【课堂内容】

1. 函数单调性：用定义比较函数值，判断区间内是否保持同一增减趋势
2. 奇偶性判断：先核对定义域是否关于原点对称，再比较函数值与自变量方向
3. 含参单调区间：结合定义域和临界点分区间讨论
4. 图象与性质综合：由对称性和增减性辅助判断函数值大小

【课堂表现与改进建议】

海澄今天判断基本初等函数的奇偶性比较顺，单调性定义也能按步骤书写。主要问题出现在含参单调区间，讨论时容易漏掉定义域限制。

1. 含参单调性：临界点找到后没有继续和定义域比较。求出参数临界值后，先把每个区间和定义域取交集，再写单调区间。
2. 奇偶性判断：偶尔先化简函数，后看定义域。以后第一行先写定义域，确认关于原点对称后再继续。
3. 函数值比较：可以利用奇偶性和单调性转化，但要注意两个自变量是否落在同一个单调区间。
4. 书写规范：单调区间要用区间形式写完整，两个不相邻区间之间不要直接并起来。

【后续做题注意】

1. 判断奇偶性时，先看定义域，再看函数值关系
2. 求含参单调区间，先把定义域、临界点和分类标准写齐
3. 用单调性比较函数值时，先确认两个自变量处在同一个单调区间
4. 单调区间之间用逗号分隔，不要合并成一个大区间

【课后任务】

1. 把单调性和奇偶性的错题分开整理，每题标清是定义域、分类还是书写问题
2. 整理一张函数性质检查表，写清使用前必须核对的条件
3. 完成课后小练习，重点检查单调区间有没有和定义域取交集`,
    createdAt: "2026-11-08T12:00:00.000Z",
    source: "demo"
  }
];
