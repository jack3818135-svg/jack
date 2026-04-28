const STORAGE_KEY = "okrSystemDataV1";

const ORG = {
  managers: [
    { id: "gm", name: "總經理", department: "總經理室" },
    { id: "sales_mgr", name: "業務部主管", department: "業務部" },
    { id: "eng_mgr", name: "工程部主管", department: "工程部" },
    { id: "purchase_mgr", name: "採購部主管", department: "採購部" },
    { id: "mfg_mgr", name: "廠務部主管", department: "廠務部" },
    { id: "qa_mgr", name: "品保部主管", department: "品保部" },
    { id: "fin_mgr", name: "財務部主管", department: "財務部" },
    { id: "mis_mgr", name: "資訊部主管", department: "資訊部" },
    { id: "admin_mgr", name: "管理部主管", department: "管理部" },
    { id: "rnd_mgr", name: "研發部主管", department: "研發部" },
  ],
  employees: [
    { id: "sales_01", name: "王小業", department: "業務部" },
    { id: "eng_01", name: "陳小工", department: "工程部" },
    { id: "purchase_01", name: "林小採", department: "採購部" },
    { id: "mfg_01", name: "張小廠", department: "廠務部" },
    { id: "qa_01", name: "劉小品", department: "品保部" },
    { id: "fin_01", name: "黃小財", department: "財務部" },
    { id: "mis_01", name: "吳小資", department: "資訊部" },
    { id: "admin_01", name: "徐小管", department: "管理部" },
    { id: "rnd_01", name: "郭小研", department: "研發部" },
  ],
};

const CHECKPOINTS = ["Q1", "Q2", "Q3", "Q4", "YearEnd"];

const state = {
  user: null,
  year: 2026,
  data: loadData(),
};

const roleSelect = document.getElementById("roleSelect");
const userSelect = document.getElementById("userSelect");
const loginBtn = document.getElementById("loginBtn");
const loginCard = document.getElementById("loginCard");
const systemCard = document.getElementById("systemCard");
const welcome = document.getElementById("welcome");
const yearSelect = document.getElementById("yearSelect");
const managerPanel = document.getElementById("managerPanel");
const employeePanel = document.getElementById("employeePanel");
const employeeSelect = document.getElementById("employeeSelect");
const functionInput = document.getElementById("functionInput");
const okrBuilder = document.getElementById("okrBuilder");
const employeeOkrList = document.getElementById("employeeOkrList");
const stats = document.getElementById("stats");

initialize();

function initialize() {
  roleSelect.innerHTML = `<option value="manager">主管</option><option value="employee">同仁</option>`;
  roleSelect.addEventListener("change", renderUserOptions);
  renderUserOptions();

  const maxYear = new Date().getFullYear() + 5;
  for (let y = 2026; y <= maxYear; y += 1) {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  }
  yearSelect.value = String(state.year);
  yearSelect.addEventListener("change", () => {
    state.year = Number(yearSelect.value);
    rerenderApp();
  });

  loginBtn.addEventListener("click", doLogin);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("saveOkrBtn").addEventListener("click", saveManagerOkr);
  document.getElementById("saveProgressBtn").addEventListener("click", saveEmployeeProgress);
  document.getElementById("carryBtn").addEventListener("click", carryPreviousYear);
}

function renderUserOptions() {
  const list = roleSelect.value === "manager" ? ORG.managers : ORG.employees;
  userSelect.innerHTML = list
    .map((u) => `<option value="${u.id}">${u.name}（${u.department}）</option>`)
    .join("");
}

function doLogin() {
  const role = roleSelect.value;
  const id = userSelect.value;
  const list = role === "manager" ? ORG.managers : ORG.employees;
  state.user = list.find((u) => u.id === id) || null;
  if (!state.user) return;
  state.user.role = role;
  loginCard.classList.add("hidden");
  systemCard.classList.remove("hidden");
  rerenderApp();
}

function logout() {
  state.user = null;
  systemCard.classList.add("hidden");
  loginCard.classList.remove("hidden");
}

function rerenderApp() {
  welcome.textContent = `${state.user.name}，您好（${state.user.department} / ${state.user.role === "manager" ? "主管" : "同仁"}）`;

  const isManager = state.user.role === "manager";
  managerPanel.classList.toggle("hidden", !isManager);
  employeePanel.classList.toggle("hidden", isManager);

  if (isManager) {
    renderManagerPanel();
  } else {
    renderEmployeePanel();
  }
  renderStats();
}

function renderManagerPanel() {
  const employees = ORG.employees.filter((e) => e.department === state.user.department || state.user.id === "gm");
  employeeSelect.innerHTML = employees.map((e) => `<option value="${e.id}">${e.name}（${e.department}）</option>`).join("");
  employeeSelect.onchange = drawOkrForm;
  drawOkrForm();
}

function drawOkrForm() {
  const employeeId = employeeSelect.value;
  const record = getRecord(state.year, employeeId);
  const okrs = record?.okrs || Array.from({ length: 5 }, (_, i) => ({
    oIndex: i + 1,
    objective: "",
    keyResult: "",
    target: "",
    weight: 20,
  }));

  functionInput.value = record?.functionTag || "";
  okrBuilder.innerHTML = okrs
    .map(
      (okr, i) => `
      <div class="okr-item">
        <h4 class="okr-title">O${i + 1}</h4>
        <div class="grid two">
          <label>Objective
            <input data-field="objective" data-idx="${i}" value="${escapeHtml(okr.objective)}" placeholder="年度目標" />
          </label>
          <label>Key Result
            <input data-field="keyResult" data-idx="${i}" value="${escapeHtml(okr.keyResult)}" placeholder="可量測成果" />
          </label>
          <label>Target
            <input data-field="target" data-idx="${i}" value="${escapeHtml(okr.target)}" placeholder="例如：達成率 95%" />
          </label>
          <label>Weight(%)
            <input type="number" min="0" max="100" data-field="weight" data-idx="${i}" value="${okr.weight ?? 20}" />
          </label>
        </div>
      </div>`
    )
    .join("");
}

function saveManagerOkr() {
  const employeeId = employeeSelect.value;
  const inputs = okrBuilder.querySelectorAll("input[data-field]");
  const grouped = Array.from({ length: 5 }, (_, i) => ({ oIndex: i + 1 }));

  inputs.forEach((input) => {
    const idx = Number(input.dataset.idx);
    const field = input.dataset.field;
    grouped[idx][field] = field === "weight" ? Number(input.value || 0) : input.value.trim();
  });

  const filtered = grouped.filter((g) => g.objective || g.keyResult || g.target);

  upsertRecord(state.year, employeeId, {
    functionTag: functionInput.value.trim() || "未分類",
    managerId: state.user.id,
    okrs: filtered,
    checkpoints: getRecord(state.year, employeeId)?.checkpoints || {},
  });

  alert("已儲存同仁年度 OKR");
  renderStats();
}

function renderEmployeePanel() {
  const record = getRecord(state.year, state.user.id);
  if (!record?.okrs?.length) {
    employeeOkrList.innerHTML = "<p class='hint'>本年度尚未設定 OKR，請主管先建立。</p>";
    return;
  }

  employeeOkrList.innerHTML = record.okrs
    .map((okr, i) => {
      const cp = record.checkpoints?.[i] || {};
      return `
      <div class="okr-item">
        <h4 class="okr-title">O${i + 1}：${escapeHtml(okr.objective)}</h4>
        <p class="kpi">KR：${escapeHtml(okr.keyResult)}｜Target：${escapeHtml(okr.target)}｜權重：${okr.weight}%</p>
        ${CHECKPOINTS.map(
          (label) => `
          <div class="checkpoint">
            <label>${label} 進度（%）
              <input type="number" min="0" max="100" data-okridx="${i}" data-cp="${label}" data-type="progress" value="${cp[label]?.progress ?? ""}" />
            </label>
            <label>${label} 說明
              <textarea data-okridx="${i}" data-cp="${label}" data-type="note">${escapeHtml(cp[label]?.note ?? "")}</textarea>
            </label>
          </div>`
        ).join("")}
      </div>`;
    })
    .join("");
}

function saveEmployeeProgress() {
  const record = getRecord(state.year, state.user.id);
  if (!record) return;

  const checkpoints = record.checkpoints || {};
  const fields = employeeOkrList.querySelectorAll("[data-okridx]");
  fields.forEach((field) => {
    const idx = Number(field.dataset.okridx);
    const cp = field.dataset.cp;
    const type = field.dataset.type;
    checkpoints[idx] = checkpoints[idx] || {};
    checkpoints[idx][cp] = checkpoints[idx][cp] || {};
    checkpoints[idx][cp][type] = type === "progress" ? Number(field.value || 0) : field.value.trim();
  });

  upsertRecord(state.year, state.user.id, {
    ...record,
    checkpoints,
  });

  alert("已儲存檢核進度與年底自評資料");
  renderStats();
}

function renderStats() {
  const yearRecords = state.data[String(state.year)] || {};
  const rows = Object.entries(yearRecords).map(([employeeId, record]) => {
    const emp = ORG.employees.find((e) => e.id === employeeId);
    const okrs = record.okrs || [];
    const score = calcScore(record);
    return {
      name: emp?.name || employeeId,
      department: emp?.department || "-",
      functionTag: record.functionTag || "未分類",
      okrCount: okrs.length,
      score,
    };
  });

  if (!rows.length) {
    stats.innerHTML = "<p class='hint'>本年度尚無資料。</p>";
    return;
  }

  const functionSummary = rows.reduce((acc, row) => {
    acc[row.functionTag] = acc[row.functionTag] || { total: 0, count: 0 };
    acc[row.functionTag].total += row.score;
    acc[row.functionTag].count += 1;
    return acc;
  }, {});

  const summaryHtml = Object.entries(functionSummary)
    .map(([tag, v]) => `<span class="pill">${tag} 平均達標率：${(v.total / v.count).toFixed(1)}%</span>`)
    .join(" ");

  stats.innerHTML = `
    <p>${summaryHtml}</p>
    <table class="stats-table">
      <thead>
        <tr><th>同仁</th><th>部門</th><th>職能</th><th>OKR數</th><th>年度達標率</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td>${row.name}</td><td>${row.department}</td><td>${row.functionTag}</td><td>${row.okrCount}</td><td>${row.score.toFixed(1)}%</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function calcScore(record) {
  if (!record.okrs?.length) return 0;
  let weighted = 0;
  let totalWeight = 0;

  record.okrs.forEach((okr, idx) => {
    const w = Number(okr.weight || 0);
    const finalProgress = Number(record.checkpoints?.[idx]?.YearEnd?.progress || 0);
    weighted += (w * finalProgress) / 100;
    totalWeight += w;
  });

  if (!totalWeight) return 0;
  return (weighted / totalWeight) * 100;
}

function carryPreviousYear() {
  const prevYear = String(state.year - 1);
  const currYear = String(state.year);
  if (state.year <= 2026) {
    alert("2026 為起始年度，無上一年資料可帶入。");
    return;
  }

  const prevRecords = state.data[prevYear];
  if (!prevRecords) {
    alert(`${state.year - 1} 無可帶入資料。`);
    return;
  }

  state.data[currYear] = state.data[currYear] || {};
  Object.entries(prevRecords).forEach(([employeeId, rec]) => {
    if (!state.data[currYear][employeeId]) {
      state.data[currYear][employeeId] = {
        functionTag: rec.functionTag,
        managerId: rec.managerId,
        okrs: rec.okrs,
        checkpoints: {},
      };
    }
  });

  persist();
  alert(`已自 ${state.year - 1} 帶入 ${state.year} 年度 OKR（不含進度）。`);
  rerenderApp();
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function getRecord(year, employeeId) {
  return state.data[String(year)]?.[employeeId];
}

function upsertRecord(year, employeeId, record) {
  const y = String(year);
  state.data[y] = state.data[y] || {};
  state.data[y][employeeId] = record;
  persist();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
