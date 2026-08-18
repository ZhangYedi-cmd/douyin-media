/* Pipeline Console · 共享交互层
   全局搜索（内存索引 G2）/ 手动刷新（G3 的手动钮）/ toast / 已读标记（L1，localStorage） */

/* ─── 内存搜索索引：slug / 标题 / backlog id（G2）─── */
const SEARCH_INDEX = [
  { t: "EP20 上下文工程，比提示词工程重要在哪", s: "2026-07-10-context-engineering · ideated", href: "detail.html", k: "内容" },
  { t: "EP19 MCP 三分钟讲明白", s: "2026-07-09-mcp-explained · drafting", href: "detail.html", k: "内容" },
  { t: "EP18 Agent 记忆系统怎么搭", s: "2026-07-04-agent-memory · review", href: "detail.html", k: "内容" },
  { t: "审核台", s: "待我审核 · 已通过待发布 · 发布失败", href: "review.html", k: "操作" },
  { t: "EP17 为什么你的 RAG 检索不准", s: "2026-07-05-rag-retrieval · scheduled", href: "detail.html", k: "内容" },
  { t: "EP16 一条视频的自动化流水线", s: "2026-07-03-pipeline-automation · approved", href: "detail.html", k: "内容" },
  { t: "EP15 大模型降价战说明什么", s: "2026-07-01-price-war · published", href: "detail.html", k: "内容" },
  { t: "EP14 抖音算法喜欢什么视频", s: "2026-06-29-douyin-algo · published", href: "detail.html", k: "内容" },
  { t: "EP13 AI 编程工具横评", s: "2026-06-27-ai-coding-tools · published", href: "detail.html", k: "内容" },
  { t: "T-042 AI 眼镜会取代手机吗", s: "backlog · idea · score 8.7", href: "backlog.html", k: "选题" },
  { t: "T-041 RAG 已死？百万上下文之后", s: "backlog · idea · score 8.2", href: "backlog.html", k: "选题" },
  { t: "T-038 向量数据库还有必要吗", s: "backlog · idea · score 7.9", href: "backlog.html", k: "选题" },
  { t: "T-035 Agent 记忆系统怎么搭", s: "backlog · picked → EP18", href: "backlog.html", k: "选题" },
];

function odInitSearch() {
  const input = document.getElementById("gsearch");
  const pop = document.getElementById("gsearchPop");
  if (!input || !pop) return;

  let sel = -1;
  const render = (q) => {
    const hits = SEARCH_INDEX.filter((r) =>
      (r.t + " " + r.s).toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
    if (!q) { pop.hidden = true; return; }
    pop.hidden = false;
    sel = -1;
    pop.innerHTML = hits.length
      ? hits.map((r) => `<a href="${r.href}"><span>${r.t}</span><small>${r.s}</small></a>`).join("")
      : `<div class="empty">没有匹配「${q}」的内容或选题</div>`;
  };

  input.addEventListener("input", () => render(input.value.trim()));
  input.addEventListener("keydown", (e) => {
    const items = [...pop.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle("sel", i === sel));
    } else if (e.key === "Enter" && sel >= 0 && items[sel]) {
      location.href = items[sel].href;
    } else if (e.key === "Escape") {
      pop.hidden = true; input.blur();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".gsearch")) pop.hidden = true;
  });
  /* ⌘K / Ctrl+K 聚焦搜索（桌面应用键盘习惯） */
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); input.focus(); input.select();
    }
  });
}

/* ─── 手动刷新（原型内模拟：重解析 4 个数据源）─── */
function odInitRefresh() {
  const btn = document.getElementById("refreshBtn");
  const time = document.getElementById("refreshTime");
  if (!btn) return;
  const stamp = () => new Date().toTimeString().slice(0, 8);
  if (time) time.innerHTML = `SSE 已连接<br>更新于 ${stamp()}`;
  btn.addEventListener("click", () => {
    btn.classList.add("loading");
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove("loading");
      btn.disabled = false;
      if (time) time.innerHTML = `SSE 已连接<br>更新于 ${stamp()}`;
      odToast("已重新解析 content / backlog / harness / pipeline 4 个数据源");
    }, 650);
  });
}

/* ─── Toast ─── */
let _toastTimer = null;
function odToast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add("on"));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("on"), 2400);
}

/* ─── 报告已读标记（铁律 3：只存看板本地，不写仓库）─── */
const READ_KEY = "console.readReports";
function odGetRead() {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); }
  catch { return []; }
}
function odIsRead(id) { return odGetRead().includes(id); }
function odToggleRead(id) {
  const list = odGetRead();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  localStorage.setItem(READ_KEY, JSON.stringify(list));
  return list.includes(id);
}

/* ─── 复制到剪贴板（L1 安全动作）─── */
function odCopy(text, doneMsg) {
  const done = () => odToast(doneMsg || "已复制到剪贴板（仅复制，不执行）");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
    done();
  }
}

/* ─── 侧边栏「治理线」未读数全站同步 ─── */
const UNREAD_REPORT_IDS = [
  "rpt-2026-07-10-retro-EP14",
  "rpt-2026-07-09-retro-EP15",
  "rpt-2026-07-07-backlog-gardener",
];
function odSyncNavUnread() {
  const el = document.getElementById("navUnread");
  if (el) el.textContent = UNREAD_REPORT_IDS.filter((id) => !odIsRead(id)).length;
}

document.addEventListener("DOMContentLoaded", () => {
  odInitSearch();
  odInitRefresh();
  odSyncNavUnread();
});
