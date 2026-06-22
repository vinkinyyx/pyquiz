// === Python 等级考试刷题应用 ===

// === 全局状态 ===
const State = {
  allQuestions: [],         // 全部题目
  filteredQuestions: [],    // 当前筛选后的题目
  currentIndex: 0,          // 当前题号
  mode: null,               // 'sequential' | 'random' | 'exam' | 'wrongbook' | 'detail'
  selectedOption: null,     // 用户当前选择的
  answered: false,          // 是否已提交
  examAnswers: {},          // 模拟考试答案
  examStartTime: null,
  filters: {
    level: 'all',           // 'all' | '一级' | '二级' | '三级'
    paperType: 'all',       // 'all' | '客观题' | '编程题'
    questionType: 'all',    // 'all' | '单选题' | '判断题' | '编程题'
    knowledge: null,        // 知识点字符串
    difficulty: 'all',
  },
  // localStorage 持久化
  wrongbook: [],            // 错题 id 列表
  stats: { answered: 0, correct: 0 },
};

// === localStorage ===
const LS_KEY_WRONG = 'pyquiz_wrongbook';
const LS_KEY_STATS = 'pyquiz_stats';

function loadFromLS() {
  try {
    State.wrongbook = JSON.parse(localStorage.getItem(LS_KEY_WRONG) || '[]');
    State.stats = JSON.parse(localStorage.getItem(LS_KEY_STATS) || '{"answered":0,"correct":0}');
  } catch (e) {
    State.wrongbook = [];
    State.stats = { answered: 0, correct: 0 };
  }
}

function saveWrongbook() {
  localStorage.setItem(LS_KEY_WRONG, JSON.stringify(State.wrongbook));
}

function saveStats() {
  localStorage.setItem(LS_KEY_STATS, JSON.stringify(State.stats));
}

// === 题目数据加载 ===
async function loadQuestions() {
  // questions.js 暴露 window.QUESTIONS
  if (typeof window.QUESTIONS === 'undefined') {
    showToast('❌ 题库加载失败');
    return;
  }
  State.allQuestions = window.QUESTIONS;
  console.log(`✅ 加载 ${State.allQuestions.length} 道题`);
}

// === 工具函数 ===
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// === 图片放大 Modal ===
function showImageModal(src, alt) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
    <div class="image-modal-content">
      <img src="${src}" alt="${escapeHtml(alt)}" />
      <button class="image-modal-close">✕</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('image-modal-close')) {
      modal.remove();
    }
  });
}

function updateStatsBar() {
  document.getElementById('statAnswered').textContent = State.stats.answered;
  document.getElementById('statCorrect').textContent = State.stats.correct;
  document.getElementById('statWrong').textContent = State.wrongbook.length;
  document.getElementById('wrongCount').textContent = State.wrongbook.length;
  const rate = State.stats.answered > 0
    ? Math.round(State.stats.correct / State.stats.answered * 100) + '%'
    : '--';
  document.getElementById('statRate').textContent = rate;
}

// === 筛选逻辑 ===
function applyFilters() {
  const f = State.filters;
  State.filteredQuestions = State.allQuestions.filter(q => {
    if (f.level !== 'all' && q.level !== f.level) return false;
    if (f.paperType !== 'all' && q.paper_type !== f.paperType) return false;
    if (f.questionType !== 'all' && q.question_type !== f.questionType) return false;
    if (f.difficulty !== 'all' && q.difficulty !== f.difficulty) return false;
    if (f.knowledge) {
      const kp = q.knowledge_points;
      const kpList = Array.isArray(kp) ? kp : (typeof kp === 'string' ? [kp] : []);
      if (!kpList.includes(f.knowledge)) return false;
    }
    return true;
  });
}

// === 渲染：首页 ===
function renderHome() {
  State.mode = null;
  const main = document.getElementById('main');
  const total = State.allQuestions.length;

  // 统计各类型
  const byType = {};
  State.allQuestions.forEach(q => {
    const k = `${q.level}-${q.question_type}`;
    byType[k] = (byType[k] || 0) + 1;
  });

  main.innerHTML = `
    <div class="welcome">
      <h1>🐍 Python 等级考试刷题</h1>
      <p>全国青少年软件编程等级考试 · 在线题库</p>

      <div class="quick-stats">
        <div class="quick-stat">
          <strong>${total}</strong>
          <span>题目总数</span>
        </div>
        <div class="quick-stat">
          <strong>${byType['一级-单选题'] || 0}</strong>
          <span>一级单选题</span>
        </div>
        <div class="quick-stat">
          <strong>${byType['二级-单选题'] || 0}</strong>
          <span>二级单选题</span>
        </div>
        <div class="quick-stat">
          <strong>${byType['三级-单选题'] || 0}</strong>
          <span>三级单选题</span>
        </div>
        <div class="quick-stat">
          <strong>${State.allQuestions.filter(q => q.question_type === '编程题').length}</strong>
          <span>编程题</span>
        </div>
      </div>

      <div class="mode-grid">
        <button class="mode-card" data-mode="sequential">
          <div class="icon">📚</div>
          <h3>顺序刷题</h3>
          <p>按题号顺序逐题练习</p>
        </button>
        <button class="mode-card" data-mode="random">
          <div class="icon">🎲</div>
          <h3>随机刷题</h3>
          <p>打乱顺序随机抽题</p>
        </button>
        <button class="mode-card" data-mode="exam">
          <div class="icon">⏱️</div>
          <h3>模拟考试</h3>
          <p>随机 20 题，计时 30 分钟</p>
        </button>
        <button class="mode-card" data-mode="wrongbook">
          <div class="icon">📖</div>
          <h3>错题本 (${State.wrongbook.length})</h3>
          <p>复习所有错题</p>
        </button>
      </div>
    </div>
  `;

  // 绑定模式按钮
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      if (mode === 'wrongbook') {
        renderWrongbook();
      } else {
        renderFilters(mode);
      }
    });
  });
}

// === 渲染：筛选条件 ===
function renderFilters(mode) {
  State.mode = mode;
  const main = document.getElementById('main');

  // 收集所有知识点（兼容字符串/数组两种格式）
  const allKP = new Set();
  State.allQuestions.forEach(q => {
    const kp = q.knowledge_points;
    if (Array.isArray(kp)) kp.forEach(k => allKP.add(k));
    else if (typeof kp === 'string' && kp.trim()) allKP.add(kp.trim());
  });
  const kpList = Array.from(allKP).sort();

  main.innerHTML = `
    <h2 style="margin-bottom:20px;font-size:22px;">⚙️ 选择刷题范围</h2>

    <div class="filters">
      <div class="filters-row">
        <label>级别：</label>
        <button class="filter-btn ${State.filters.level==='all'?'active':''}" data-f="level" data-v="all">全部</button>
        <button class="filter-btn ${State.filters.level==='一级'?'active':''}" data-f="level" data-v="一级">一级</button>
        <button class="filter-btn ${State.filters.level==='二级'?'active':''}" data-f="level" data-v="二级">二级</button>
        <button class="filter-btn ${State.filters.level==='三级'?'active':''}" data-f="level" data-v="三级">三级</button>
      </div>
      <div class="filters-row">
        <label>试卷类型：</label>
        <button class="filter-btn ${State.filters.paperType==='all'?'active':''}" data-f="paperType" data-v="all">全部</button>
        <button class="filter-btn ${State.filters.paperType==='客观题'?'active':''}" data-f="paperType" data-v="客观题">客观题</button>
        <button class="filter-btn ${State.filters.paperType==='编程题'?'active':''}" data-f="paperType" data-v="编程题">编程题</button>
      </div>
      <div class="filters-row">
        <label>题型：</label>
        <button class="filter-btn ${State.filters.questionType==='all'?'active':''}" data-f="questionType" data-v="all">全部</button>
        <button class="filter-btn ${State.filters.questionType==='单选题'?'active':''}" data-f="questionType" data-v="单选题">单选题</button>
        <button class="filter-btn ${State.filters.questionType==='判断题'?'active':''}" data-f="questionType" data-v="判断题">判断题</button>
        <button class="filter-btn ${State.filters.questionType==='编程题'?'active':''}" data-f="questionType" data-v="编程题">编程题</button>
      </div>
      <div class="filters-row">
        <label>难度：</label>
        <button class="filter-btn ${State.filters.difficulty==='all'?'active':''}" data-f="difficulty" data-v="all">全部</button>
        <button class="filter-btn ${State.filters.difficulty==='简单'?'active':''}" data-f="difficulty" data-v="简单">简单</button>
        <button class="filter-btn ${State.filters.difficulty==='中等'?'active':''}" data-f="difficulty" data-v="中等">中等</button>
        <button class="filter-btn ${State.filters.difficulty==='困难'?'active':''}" data-f="difficulty" data-v="困难">困难</button>
      </div>
      <div class="filters-row">
        <label>知识点：</label>
        <button class="filter-btn ${State.filters.knowledge===null?'active':''}" data-f="knowledge" data-v="">全部</button>
        ${kpList.slice(0, 12).map(kp => `
          <button class="filter-btn ${State.filters.knowledge===kp?'active':''}" data-f="knowledge" data-v="${escapeHtml(kp)}">${escapeHtml(kp)}</button>
        `).join('')}
      </div>
    </div>

    <div id="filterResult" style="margin-top:20px;"></div>
  `;

  // 绑定筛选按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.f;
      const value = btn.dataset.v;
      if (field === 'knowledge') {
        State.filters.knowledge = value || null;
      } else {
        State.filters[field] = value;
      }
      renderFilters(mode);
    });
  });

  // 计算筛选结果
  applyFilters();
  const resultEl = document.getElementById('filterResult');
  resultEl.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:30px;text-align:center;">
      <p style="color:var(--text-secondary);margin-bottom:16px;">已筛选 <strong style="color:var(--accent-bright);font-size:24px;">${State.filteredQuestions.length}</strong> 道题</p>
      <button class="btn btn-primary" id="btnStart" ${State.filteredQuestions.length === 0 ? 'disabled' : ''}>
        ${mode === 'exam' ? '⏱️ 开始模拟考试' : '🚀 开始刷题'}
      </button>
    </div>
  `;

  document.getElementById('btnStart').addEventListener('click', () => {
    if (mode === 'exam') {
      // 模拟考试：随机 20 题
      State.filteredQuestions = [...State.filteredQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);
      State.examAnswers = {};
      State.examStartTime = Date.now();
    } else if (mode === 'random') {
      State.filteredQuestions.sort(() => Math.random() - 0.5);
    }
    State.currentIndex = 0;
    State.selectedOption = null;
    State.answered = false;
    renderQuestion();
  });
}

// === 渲染：单题 ===
function renderQuestion() {
  if (State.currentIndex >= State.filteredQuestions.length) {
    renderDone();
    return;
  }
  State.selectedOption = null;
  State.answered = false;
  const q = State.filteredQuestions[State.currentIndex];
  const main = document.getElementById('main');
  const total = State.filteredQuestions.length;
  const isLast = State.currentIndex === total - 1;

  const isProgramming = q.question_type === '编程题';

  // 选项渲染
  const optionsHtml = isProgramming
    ? '<div class="empty" style="padding:20px;">编程题请直接看答案参考</div>'
    : Object.entries(q.options || {}).map(([k, v]) => `
        <div class="option" data-letter="${k}">
          <span class="opt-letter">${k}</span>
          <span class="opt-text">${escapeHtml(v)}</span>
          ${q.option_images && q.option_images[k]
? `<img class="opt-image" src="images/${q.option_images[k]}" alt="选项 ${k} 图形" />`
            : ''}
        </div>
      `).join('');

  main.innerHTML = `
    <div class="question-card">
      <div class="q-meta">
        <span class="q-no">第 ${State.currentIndex + 1} / ${total} 题</span>
        <span>${q.level} · ${q.year}.${String(q.month).padStart(2,'0')} · ${q.question_type}</span>
      </div>
      <div class="q-tags">
        ${(Array.isArray(q.knowledge_points) ? q.knowledge_points : (q.knowledge_points || '').split(',').filter(Boolean)).slice(0,3).map(kp => `<span class="q-tag">${escapeHtml(kp)}</span>`).join('')}
        ${q.difficulty ? `<span class="q-tag">${escapeHtml(q.difficulty)}</span>` : ''}
      </div>

      <div class="q-text" style="margin-top:16px;">${escapeHtml(q.stem)}</div>

      <div class="options" id="optionsContainer">
        ${optionsHtml}
      </div>

      <div class="feedback" id="feedback"></div>

      ${isProgramming ? `
        <div class="code-block" style="display:none;" id="progAnswer">
          <div class="code-header">📋 参考答案</div>
          <pre class="code-content"><code>${escapeHtml(q.answer || '（无答案）')}</code></pre>
        </div>
      ` : ''}

      <div class="q-actions">
        <button class="btn btn-secondary" id="btnSkip">⏭️ 跳过</button>
        ${isProgramming ? `<button class="btn btn-primary" id="btnShowCode">查看参考答案</button>` : '<button class="btn btn-primary" id="btnSubmit" disabled>提交答案</button>'}
        <button class="btn btn-primary" id="btnNext" style="display:none;">${isLast ? '查看结果' : '下一题 →'}</button>
      </div>
    </div>
  `;

  // 绑定选项
  if (!isProgramming) {
    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (State.answered) return;
        document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        State.selectedOption = opt.dataset.letter;
        document.getElementById('btnSubmit').disabled = false;
      });
    });
  }

  // 提交
  document.getElementById('btnSubmit').addEventListener('click', () => submitAnswer(q));
  document.getElementById('btnSkip').addEventListener('click', () => {
    if (State.mode === 'exam') State.examAnswers[q.id] = null;
    nextQuestion();
  });
  document.getElementById('btnNext').addEventListener('click', () => nextQuestion());
  if (isProgramming) {
    document.getElementById('btnShowCode').addEventListener('click', () => {
      const el = document.getElementById('progAnswer');
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    });
    // 编程题不需要"提交"
    document.getElementById('btnSubmit').style.display = 'none';
  }

  // 图片点击放大
  document.querySelectorAll('.opt-image').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();  // 防止冒泡到 option 点击
      showImageModal(img.src, img.alt);
    });
  });

  // 模拟考试时记录开始时间
  if (State.mode === 'exam') {
    if (!State.examAnswers[q.id]) State.examAnswers[q.id] = undefined;
  }

  // 键盘快捷键
  document.onkeydown = (e) => {
    if (isProgramming) {
      if (e.key === 'Enter') nextQuestion();
      return;
    }
    if (!State.answered) {
      if (['A','B','C','D'].includes(e.key.toUpperCase())) {
        const opt = document.querySelector(`.option[data-letter="${e.key.toUpperCase()}"]`);
        if (opt) opt.click();
      }
      if (e.key === 'Enter' && State.selectedOption) {
        submitAnswer(q);
      }
    } else {
      if (e.key === 'Enter') nextQuestion();
    }
  };
}

// === 提交答案 ===
function submitAnswer(q) {
  if (State.answered) return;
  if (State.mode === 'exam') State.examAnswers[q.id] = State.selectedOption;

  State.answered = true;
  const correctAnswer = q.answer;
  const isCorrect = State.selectedOption === correctAnswer;

  State.stats.answered++;
  if (isCorrect) State.stats.correct++;
  saveStats();

  // 错题入库
  if (!isCorrect && correctAnswer) {
    if (!State.wrongbook.includes(q.id)) State.wrongbook.push(q.id);
    saveWrongbook();
  }

  // 标记选项
  document.querySelectorAll('.option').forEach(opt => {
    const letter = opt.dataset.letter;
    if (letter === correctAnswer) opt.classList.add('correct');
    else if (letter === State.selectedOption && !isCorrect) opt.classList.add('wrong');
    opt.classList.add('disabled');
  });

  // 反馈
  const feedback = document.getElementById('feedback');
  feedback.classList.add('show', isCorrect ? 'correct' : 'wrong');
  feedback.innerHTML = `
    <div class="feedback-title">
      ${isCorrect ? '✅ 答对了！' : `❌ 答错了！正确答案：${correctAnswer}`}
    </div>
    ${q.explanation ? `<div class="feedback-explain">💡 ${escapeHtml(q.explanation)}</div>` : ''}
  `;

  // 切换按钮
  document.getElementById('btnSubmit').style.display = 'none';
  document.getElementById('btnNext').style.display = 'inline-block';
  document.getElementById('btnNext').focus();

  updateStatsBar();
}

// === 下一题 ===
function nextQuestion() {
  State.currentIndex++;
  if (State.mode === 'exam' && State.currentIndex >= State.filteredQuestions.length) {
    renderDone();
    return;
  }
  renderQuestion();
}

// === 完成界面 ===
function renderDone() {
  State.mode = 'done';
  const total = State.filteredQuestions.length;
  let correct = 0;
  let answered = 0;

  if (State.mode === 'done' || true) {
    // 计算本次成绩（重新遍历）
    // 简化处理：用 stats.answered 和 stats.correct 不准，重算
  }

  // 用 exam 模式特殊处理
  if (Object.keys(State.examAnswers).length > 0) {
    State.filteredQuestions.forEach(q => {
      const userAns = State.examAnswers[q.id];
      if (userAns) {
        answered++;
        if (userAns === q.answer) correct++;
      }
    });
  }

  const rate = answered > 0 ? Math.round(correct / answered * 100) : 0;
  const duration = State.examStartTime ? Math.round((Date.now() - State.examStartTime) / 1000) : 0;

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="done-card">
      <h2>🎉 ${State.mode === 'exam' ? '考试结束' : '本轮完成'}！</h2>
      <div class="score">${rate}%</div>
      <p style="color:var(--text-secondary);">正确率</p>

      <div class="done-stats">
        <div class="ds"><strong>${answered}</strong><em>已答题数</em></div>
        <div class="ds"><strong>${correct}</strong><em>答对</em></div>
        <div class="ds"><strong>${answered - correct}</strong><em>答错</em></div>
        <div class="ds"><strong>${duration > 0 ? duration + 's' : '-'}</strong><em>用时</em></div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:30px;">
        <button class="btn btn-primary" id="btnReview">📝 复习错题</button>
        <button class="btn btn-secondary" id="btnAgain">🔄 再来一轮</button>
        <button class="btn btn-secondary" id="btnHome">🏠 返回首页</button>
      </div>
    </div>
  `;

  document.getElementById('btnReview').addEventListener('click', () => {
    if (Object.keys(State.examAnswers).length > 0) {
      // 复习本次错题
      State.filteredQuestions = State.filteredQuestions.filter(q => {
        const ua = State.examAnswers[q.id];
        return ua && ua !== q.answer;
      });
      if (State.filteredQuestions.length > 0) {
        State.currentIndex = 0;
        renderQuestion();
        return;
      }
    }
    renderWrongbook();
  });
  document.getElementById('btnAgain').addEventListener('click', () => {
    if (State.mode === 'done') {
      // 重新刷当前筛选
      State.currentIndex = 0;
      renderQuestion();
    }
  });
  document.getElementById('btnHome').addEventListener('click', renderHome);
}

// === 错题本 ===
function renderWrongbook() {
  State.mode = 'wrongbook';
  const main = document.getElementById('main');

  if (State.wrongbook.length === 0) {
    main.innerHTML = `
      <div class="empty">
        <div class="icon">📭</div>
        <h2>错题本是空的</h2>
        <p style="margin-top:12px;">答错的题目会自动加入错题本</p>
        <button class="btn btn-primary" style="margin-top:24px;" onclick="renderHome()">🏠 返回首页</button>
      </div>
    `;
    return;
  }

  const wrongQs = State.allQuestions.filter(q => State.wrongbook.includes(q.id));
  main.innerHTML = `
    <h2 style="margin-bottom:20px;">📖 错题本 (${wrongQs.length} 题)</h2>
    <div class="wrongbook-list">
      ${wrongQs.map(q => `
        <div class="wrongbook-item" data-qid="${q.id}">
          <div class="wb-q">${escapeHtml(q.question_text.substring(0, 120))}${q.question_text.length > 120 ? '...' : ''}</div>
          <div class="wb-meta">
            <span>📅 ${q.level} ${q.year}.${String(q.month).padStart(2,'0')}</span>
            <span>📝 ${q.question_type}</span>
            <span>✅ 正确答案: ${q.answer || '?'}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:24px;text-align:center;">
      <button class="btn btn-primary" id="btnPractice">🚀 开始练习错题</button>
      <button class="btn btn-secondary" id="btnClear">🗑️ 清空错题本</button>
    </div>
  `;

  document.querySelectorAll('.wrongbook-item').forEach(item => {
    item.addEventListener('click', () => {
      const qid = parseInt(item.dataset.qid);
      State.filteredQuestions = wrongQs;
      State.currentIndex = wrongQs.findIndex(q => q.id === qid);
      renderQuestion();
    });
  });

  document.getElementById('btnPractice').addEventListener('click', () => {
    State.filteredQuestions = [...wrongQs].sort(() => Math.random() - 0.5);
    State.currentIndex = 0;
    renderQuestion();
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    if (confirm('确定清空错题本？')) {
      State.wrongbook = [];
      saveWrongbook();
      renderWrongbook();
      updateStatsBar();
    }
  });
}

// === 顶部按钮 ===
function bindTopActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'home') renderHome();
      else if (action === 'wrongbook') renderWrongbook();
      else if (action === 'reset') {
        if (confirm('确定重置所有进度（错题本+统计）？')) {
          State.wrongbook = [];
          State.stats = { answered: 0, correct: 0 };
          saveWrongbook();
          saveStats();
          updateStatsBar();
          renderHome();
          showToast('✅ 进度已重置');
        }
      }
    });
  });
}

// === 启动 ===
async function init() {
  loadFromLS();
  updateStatsBar();
  bindTopActions();
  await loadQuestions();
  renderHome();
}

document.addEventListener('DOMContentLoaded', init);