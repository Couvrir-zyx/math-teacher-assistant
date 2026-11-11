import { store, makeId, todayString } from "./store-v2.js";
import { analyzeImages, generateFeedback, generateSummary, testConnection, visibleLength } from "./api-v2.js";
import { downloadFeedbackCard } from "./card-v2.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = {
  view: "write",
  images: [],
  settings: store.getSettings(),
  data: store.getData(),
  currentDraft: null,
  selectedStudent: "",
  selectedLesson: null,
  studentContext: "",
  busy: false
};

const els = {
  nav: $$(".nav-item"),
  views: $$(".view"),
  pageTitle: $("#page-title"),
  groupMode: $("#group-mode"),
  studentName: $("#student-name"),
  studentLabel: $("#student-label"),
  studentListData: $("#student-list"),
  course: $("#course"),
  level: $("#level"),
  topic: $("#topic"),
  imageInput: $("#image-input"),
  dropzone: $("#dropzone"),
  imageGrid: $("#image-grid"),
  imageCount: $("#image-count"),
  teacherNote: $("#teacher-note"),
  progressTitle: $("#progress-title"),
  progressDetail: $("#progress-detail"),
  progressBar: $("#progress-bar"),
  generateButton: $("#generate-button"),
  emptyResult: $("#empty-result"),
  feedbackEditor: $("#feedback-editor"),
  charCount: $("#char-count"),
  resultActions: $("#result-actions"),
  todayCount: $("#today-count"),
  toastRegion: $("#toast-region"),
  apiKey: $("#api-key"),
  apiModel: $("#api-model"),
  apiEndpoint: $("#api-endpoint"),
  apiBadge: $("#api-badge"),
  dataSize: $("#data-size"),
  studentSearch: $("#student-search"),
  studentCount: $("#student-count"),
  studentList: $("#student-list"),
  emptyLibrary: $("#empty-library"),
  lessonContent: $("#lesson-content"),
  selectedStudentName: $("#selected-student-name"),
  selectedStudentMeta: $("#selected-student-meta"),
  lessonList: $("#lesson-list"),
  detailLevel: $("#detail-level"),
  detailTopic: $("#detail-topic"),
  detailMeta: $("#detail-meta"),
  detailFeedback: $("#detail-feedback"),
  settingsModal: $("#settings-modal"),
  modalApiKey: $("#modal-api-key")
};

init();

function init() {
  bindNavigation();
  bindWriteView();
  bindLibraryView();
  bindSettings();
  hydrateSettings();
  renderAll();
  if (!state.settings.apiKey && !localStorage.getItem("math-teacher-workbench.setupSeen")) {
    setTimeout(openSetupModal, 350);
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function bindNavigation() {
  els.nav.forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  $("#quick-settings").addEventListener("click", () => setView("settings"));
  $("#teacher-avatar").addEventListener("click", openSetupModal);
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace("#", "");
    if (["write", "students", "settings"].includes(view)) setView(view, false);
  });
}

function bindWriteView() {
  els.dropzone.addEventListener("click", () => els.imageInput.click());
  els.dropzone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.imageInput.click();
    }
  });
  els.imageInput.addEventListener("change", event => addFiles([...event.target.files]));
  document.addEventListener("dragover", event => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    els.dropzone.classList.add("is-over");
  });
  els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("is-over"));
  els.dropzone.addEventListener("drop", event => {
    event.preventDefault();
    els.dropzone.classList.remove("is-over");
    if (state.view === "write") addFiles([...event.dataTransfer.files]);
  });
  document.addEventListener("paste", handlePaste);

  els.groupMode.addEventListener("change", () => {
    const hasDraft = els.teacherNote.value || els.feedbackEditor.value;
    state.studentContext = "";
    els.studentLabel.textContent = els.groupMode.checked ? "组课名称" : "学生姓名";
    els.studentName.placeholder = els.groupMode.checked ? "例如：周六圆椭圆专题班" : "输入学生姓名";
    if (hasDraft) {
      els.teacherNote.value = "";
      resetFeedbackEditor();
      toast("已切换单讲/组课，上一份课堂补充和反馈已清空");
    }
  });

  els.studentName.addEventListener("change", () => {
    const next = els.studentName.value.trim();
    if (state.studentContext && next && state.studentContext !== next) {
      if (els.teacherNote.value || els.feedbackEditor.value) {
        els.teacherNote.value = "";
        resetFeedbackEditor();
        toast("已切换学生，上一份课堂补充和反馈已清空");
      }
    }
    state.studentContext = next;
    const savedLevel = studentLevel(next);
    if (savedLevel) els.level.value = savedLevel;
  });

  els.feedbackEditor.addEventListener("input", updateCharCount);
  els.generateButton.addEventListener("click", handleGenerate);
  $("#copy-feedback").addEventListener("click", () => copyText(els.feedbackEditor.value));
  $("#paste-feedback").addEventListener("click", pasteFeedback);
  $("#save-feedback").addEventListener("click", saveFeedbackChanges);
  $("#download-card").addEventListener("click", () => {
    if (!state.currentDraft) return toast("先生成一份反馈", true);
    if (!els.feedbackEditor.value.trim()) return toast("反馈正文为空", true);
    downloadFeedbackCard({
      ...state.currentDraft,
      feedback: els.feedbackEditor.value.trim()
    });
    toast("图片卡片已导出");
  });
}

function bindLibraryView() {
  els.studentSearch.addEventListener("input", renderStudentList);
  $("#copy-lesson").addEventListener("click", () => {
    if (state.selectedLesson) copyText(state.selectedLesson.feedback);
  });
  $("#generate-summary").addEventListener("click", handleSummary);
}

function bindSettings() {
  $("#save-api").addEventListener("click", saveApiSettings);
  $("#test-api").addEventListener("click", handleTestApi);
  $("#toggle-key").addEventListener("click", () => {
    const showing = els.apiKey.type === "text";
    els.apiKey.type = showing ? "password" : "text";
    $("#toggle-key").textContent = showing ? "显示" : "隐藏";
  });
  $("#export-data").addEventListener("click", exportData);
  $("#import-files").addEventListener("change", event => importFiles([...event.target.files]));
  $("#import-folder").addEventListener("change", event => importFiles([...event.target.files]));
  $("#load-demo").addEventListener("click", () => {
    const count = store.loadDemo();
    state.data = store.getData();
    renderAll();
    toast(count ? `已载入 ${count} 条演示课次` : "演示数据已经载入过了");
  });
  $("#modal-save-key").addEventListener("click", event => {
    event.preventDefault();
    const key = els.modalApiKey.value.trim();
    if (!key) return toast("请输入 API Key", true);
    saveSettings({ ...state.settings, apiKey: key });
    localStorage.setItem("math-teacher-workbench.setupSeen", "1");
    els.settingsModal.close();
    toast("API Key 已保存在当前浏览器");
  });
  els.settingsModal.addEventListener("close", () => {
    localStorage.setItem("math-teacher-workbench.setupSeen", "1");
  });
}

function renderAll() {
  state.data = store.getData();
  renderStudentDatalist();
  renderStudentList();
  renderStorageStats();
  els.todayCount.textContent = state.data.lessons.filter(item => item.date === todayString()).length;
  if (state.selectedStudent) renderStudentLessons();
}

function setView(view, updateHash = true) {
  state.view = view;
  els.nav.forEach(button => button.classList.toggle("is-active", button.dataset.view === view));
  els.views.forEach(node => node.classList.toggle("is-active", node.id === `view-${view}`));
  els.pageTitle.textContent = {
    write: "写课堂反馈",
    students: "学生课次库",
    settings: "设置与数据"
  }[view];
  if (updateHash) history.replaceState(null, "", `#${view}`);
  if (view === "students") renderStudentList();
  if (view === "settings") renderStorageStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function addFiles(files) {
  const supported = ["image/png", "image/jpeg", "image/webp", "image/bmp"];
  const valid = files.filter(file => file.type.startsWith("image/") || supported.includes(file.type));
  if (!valid.length) return toast("请选择图片文件", true);
  if (state.images.length + valid.length > 8) {
    return toast("一次最多上传 8 张课堂截图", true);
  }
  setProgress("正在准备截图", "图片会自动压缩，减少上传等待", 5);
  try {
    for (let index = 0; index < valid.length; index++) {
      const file = valid[index];
      const dataUrl = await compressImage(file);
      state.images.push({
        id: makeId("image"),
        name: file.name || `粘贴图片-${index + 1}`,
        dataUrl
      });
      setProgress("正在准备截图", `已处理 ${index + 1} / ${valid.length} 张`, 5 + Math.round((index + 1) / valid.length * 15));
    }
    renderImages();
    setProgress("截图已准备好", "填写课堂补充后就可以生成", 20);
  } catch (error) {
    toast(`图片读取失败：${error.message}`, true);
  } finally {
    els.imageInput.value = "";
  }
}

function handlePaste(event) {
  if (state.view !== "write") return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  const files = [...(event.clipboardData?.items || [])]
    .filter(item => item.kind === "file" && item.type.startsWith("image/"))
    .map(item => item.getAsFile())
    .filter(Boolean);
  if (files.length) {
    event.preventDefault();
    addFiles(files);
  }
}

function renderImages() {
  els.imageCount.textContent = `${state.images.length} 张`;
  els.imageGrid.innerHTML = "";
  state.images.forEach(image => {
    const item = document.createElement("div");
    item.className = "image-item";
    const img = document.createElement("img");
    img.src = image.dataUrl;
    img.alt = image.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "移除这张截图";
    remove.addEventListener("click", () => {
      state.images = state.images.filter(item => item.id !== image.id);
      renderImages();
    });
    item.append(img, remove);
    els.imageGrid.appendChild(item);
  });
}

async function handleGenerate() {
  if (state.busy) return;
  const studentName = els.studentName.value.trim();
  if (!studentName) return toast(els.groupMode.checked ? "请填写组课名称" : "请填写学生姓名", true);
  if (!state.images.length) return toast("请至少上传一张课堂截图", true);
  if (!state.settings.apiKey) {
    openSetupModal();
    return toast("先填写 DeepSeek API Key", true);
  }

  state.busy = true;
  els.generateButton.disabled = true;
  els.generateButton.querySelector("span").textContent = "生成中…";
  try {
    const context = {
      studentName,
      group: els.groupMode.checked,
      course: els.course.value,
      level: els.level.value,
      topicInput: els.topic.value.trim(),
      note: els.teacherNote.value.trim(),
      firstLesson: store.lessonsFor(studentName).length === 0
    };

    setProgress("正在读取课堂截图", "识别题目、板书和方法", 8);
    const analysis = await analyzeImages(state.images, {
      ...context,
      topic: context.topicInput
    }, state.settings, setProgress);

    const topic = context.topicInput || analysis.topic;
    if (!els.topic.value.trim()) els.topic.value = topic;

    setProgress("正在组织课堂反馈", "按本次截图和学生水平生成", 55);
    const feedback = await generateFeedback(analysis, {
      ...context,
      topic
    }, state.settings, setProgress);

    const lesson = {
      id: makeId("lesson"),
      studentName,
      group: context.group,
      date: todayString(),
      course: context.course,
      level: context.level,
      topic,
      teacherNote: context.note,
      modules: analysis.modules,
      feedback,
      createdAt: new Date().toISOString(),
      source: "web"
    };
    store.upsertLesson(lesson);
    state.currentDraft = lesson;
    state.selectedLesson = lesson;
    setProgress("反馈已生成", "已自动保存到学生档案", 100);
    showFeedback(feedback);
    renderAll();
    toast("反馈已生成并保存");
  } catch (error) {
    console.error(error);
    setProgress("生成失败", error.message, 100);
    toast(error.message, true);
  } finally {
    state.busy = false;
    els.generateButton.disabled = false;
    els.generateButton.querySelector("span").textContent = "生成课堂反馈";
  }
}

function showFeedback(text) {
  els.emptyResult.hidden = true;
  els.feedbackEditor.hidden = false;
  els.resultActions.hidden = false;
  els.feedbackEditor.value = text;
  updateCharCount();
  els.feedbackEditor.focus();
}

function resetFeedbackEditor() {
  state.currentDraft = null;
  els.feedbackEditor.value = "";
  els.feedbackEditor.hidden = true;
  els.resultActions.hidden = true;
  els.emptyResult.hidden = false;
  updateCharCount();
}

function updateCharCount() {
  const length = visibleLength(els.feedbackEditor.value);
  els.charCount.textContent = `${length} / 1000`;
  els.charCount.style.color = length > 1000 ? "#ce5b62" : "";
}

function saveFeedbackChanges() {
  if (!state.currentDraft) return toast("先生成一份反馈", true);
  const text = els.feedbackEditor.value.trim();
  if (!text) return toast("反馈正文不能为空", true);
  if (visibleLength(text) > 1000) return toast("反馈超过 1000 字，请先删减", true);
  state.currentDraft = {
    ...state.currentDraft,
    feedback: text,
    updatedAt: new Date().toISOString()
  };
  store.upsertLesson(state.currentDraft);
  renderAll();
  toast("修改已保存到学生档案");
}

function renderStudentDatalist() {
  els.studentListData.innerHTML = "";
  store.studentsWithCounts().forEach(student => {
    const option = document.createElement("option");
    option.value = student.name;
    els.studentListData.appendChild(option);
  });
}

function renderStudentList() {
  const query = els.studentSearch.value.trim().toLowerCase();
  const students = store.studentsWithCounts().filter(student => student.name.toLowerCase().includes(query));
  els.studentCount.textContent = String(students.length);
  els.studentList.innerHTML = "";

  if (!students.length) {
    const blank = document.createElement("div");
    blank.className = "empty-library";
    blank.innerHTML = "<strong>还没有学生档案</strong><p>生成反馈后，这里会自动汇总。</p>";
    els.studentList.appendChild(blank);
    els.emptyLibrary.hidden = false;
    els.lessonContent.hidden = true;
    return;
  }

  if (!students.some(item => item.name === state.selectedStudent)) {
    state.selectedStudent = students[0].name;
  }

  students.forEach(student => {
    const button = document.createElement("button");
    button.className = `student-item ${student.name === state.selectedStudent ? "is-active" : ""}`;
    button.innerHTML = `
      <span class="student-avatar">${escapeHtml(student.group ? "组" : firstChar(student.name))}</span>
      <span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.level)}</small></span>
      <span class="count">${student.count} 次</span>`;
    button.addEventListener("click", () => {
      state.selectedStudent = student.name;
      renderStudentList();
      renderStudentLessons();
    });
    els.studentList.appendChild(button);
  });
  els.emptyLibrary.hidden = true;
  els.lessonContent.hidden = false;
  renderStudentLessons();
}

function renderStudentLessons() {
  const lessons = store.lessonsFor(state.selectedStudent);
  const summaries = state.data.summaries
    .filter(item => item.studentName === state.selectedStudent)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  els.selectedStudentName.textContent = state.selectedStudent;
  els.selectedStudentMeta.textContent = `${lessons.length} 次课 · ${lessons[0]?.level || "稳步提升"}`;
  els.lessonList.innerHTML = "";

  summaries.forEach(summary => {
    const button = lessonButton({
      topic: `阶段总结 · ${summary.date}`,
      date: summary.date,
      course: "阶段总结",
      summary: true
    });
    button.addEventListener("click", () => {
      selectLesson(summary, true);
      markActiveLesson(button);
    });
    els.lessonList.appendChild(button);
  });

  lessons.forEach(lesson => {
    const button = lessonButton(lesson);
    const active = state.selectedLesson?.id === lesson.id;
    if (active) button.classList.add("is-active");
    button.addEventListener("click", () => {
      selectLesson(lesson);
      markActiveLesson(button);
    });
    els.lessonList.appendChild(button);
  });

  const first = summaries[0] || lessons[0];
  if (first) selectLesson(first, Boolean(first.summary));
  else {
    els.detailLevel.textContent = "";
    els.detailTopic.textContent = "暂无课次";
    els.detailMeta.textContent = "";
    els.detailFeedback.textContent = "";
  }
}

function lessonButton(lesson) {
  const button = document.createElement("button");
  button.className = "lesson-item";
  button.innerHTML = `
    <strong>${escapeHtml(lesson.topic)}</strong>
    <small>${escapeHtml(lesson.date)} · ${escapeHtml(lesson.summary ? "阶段总结" : lesson.course)}</small>`;
  return button;
}

function markActiveLesson(button) {
  els.lessonList.querySelectorAll(".lesson-item").forEach(node => node.classList.remove("is-active"));
  button.classList.add("is-active");
}

function selectLesson(lesson, summary = false) {
  state.selectedLesson = { ...lesson, summary };
  els.detailLevel.textContent = summary ? "阶段总结" : lesson.level;
  els.detailTopic.textContent = summary ? "阶段学习总结" : lesson.topic;
  els.detailMeta.textContent = `${lesson.date} · ${lesson.course}`;
  els.detailFeedback.textContent = lesson.feedback;
}

async function handleSummary() {
  const lessons = store.lessonsFor(state.selectedStudent);
  if (lessons.length < 2) return toast("至少需要两次课堂反馈才能生成阶段总结", true);
  if (!state.settings.apiKey) {
    openSetupModal();
    return toast("先填写 DeepSeek API Key", true);
  }
  const button = $("#generate-summary");
  button.disabled = true;
  button.textContent = "总结中…";
  try {
    const feedback = await generateSummary(state.selectedStudent, lessons, state.settings, text => {
      button.textContent = text;
    });
    const summary = {
      id: makeId("summary"),
      studentName: state.selectedStudent,
      date: todayString(),
      course: "阶段总结",
      topic: "阶段总结",
      feedback,
      createdAt: new Date().toISOString()
    };
    store.upsertSummary(summary);
    state.data = store.getData();
    state.selectedLesson = { ...summary, summary: true };
    renderAll();
    renderStudentLessons();
    toast("阶段总结已生成并保存");
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "生成阶段总结";
  }
}

function hydrateSettings() {
  els.apiKey.value = state.settings.apiKey;
  els.apiModel.value = state.settings.model;
  els.apiEndpoint.value = state.settings.endpoint;
  els.modalApiKey.value = state.settings.apiKey;
  els.apiBadge.textContent = state.settings.apiKey ? "已配置" : "未配置";
  els.apiBadge.classList.toggle("is-ok", Boolean(state.settings.apiKey));
}

function saveApiSettings() {
  saveSettings({
    apiKey: els.apiKey.value,
    model: els.apiModel.value,
    endpoint: els.apiEndpoint.value
  });
  toast("API 设置已保存");
}

function saveSettings(settings) {
  state.settings = store.saveSettings(settings);
  hydrateSettings();
}

async function handleTestApi() {
  saveApiSettings();
  const button = $("#test-api");
  button.disabled = true;
  button.textContent = "测试中…";
  try {
    await testConnection(state.settings);
    toast("DeepSeek 连接正常");
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "测试连接";
  }
}

function renderStorageStats() {
  const kb = Math.max(1, Math.round(store.byteSize() / 1024));
  els.dataSize.textContent = `${kb} KB`;
  $("#storage-status").textContent = `${state.data.lessons.length} 条反馈 · 本地保存`;
}

function exportData() {
  const payload = JSON.stringify(store.exportData(), null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `数学教师工作台备份-${todayString()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("全部档案已导出");
}

async function importFiles(files) {
  const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith(".json"));
  if (!jsonFiles.length) return toast("没有找到 JSON 档案", true);
  const objects = [];
  const hints = [];
  for (const file of jsonFiles) {
    try {
      const data = JSON.parse(await file.text());
      objects.push({ data, filename: file.name });
      const parts = (file.webkitRelativePath || "").split("/");
      hints.push(parts.length > 1 ? parts[parts.length - 2] : "");
    } catch {
      // Ignore unrelated JSON files in a selected folder.
    }
  }
  const count = store.importObjects(objects, hints);
  state.data = store.getData();
  renderAll();
  toast(`成功导入 ${count} 条课次`);
}

function openSetupModal() {
  els.modalApiKey.value = state.settings.apiKey;
  if (!els.settingsModal.open) els.settingsModal.showModal();
}

function setProgress(title, detail, percent) {
  els.progressTitle.textContent = title;
  els.progressDetail.textContent = detail;
  els.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast${error ? " is-error" : ""}`;
  node.textContent = message;
  els.toastRegion.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(6px)";
    setTimeout(() => node.remove(), 220);
  }, 3200);
}

async function copyText(text) {
  if (!String(text || "").trim()) return toast("没有可复制的内容", true);
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制到剪贴板");
  } catch {
    toast("浏览器不允许自动复制，请手动选择文字", true);
  }
}

async function pasteFeedback() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return toast("剪贴板里没有文字", true);
    els.feedbackEditor.value = text.replace(/\r\n/g, "\n").trimEnd();
    updateCharCount();
    toast("已用剪贴板文字替换反馈");
  } catch {
    toast("浏览器没有读取剪贴板的权限，请在输入框里按 Ctrl+V", true);
  }
}

function studentLevel(name) {
  return store.lessonsFor(name)[0]?.level || "";
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.84);
}

function firstChar(value) {
  return [...String(value || "学")][0];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
