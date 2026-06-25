/**
 * 战斗主控：连接游戏引擎 + 答题 + 关卡流程
 */
const Battle = {
  level: null,
  currentWave: 0,
  totalWaves: 0,
  questions: [],         // 整个关卡的题库（每波 perWave 题）
  waveQuestions: [],     // 当前波的题
  currentQIndex: 0,
  hp: 10,
  gold: 50,
  score: 0,
  combo: 0,
  maxCombo: 0,
  answered: 0,
  correctCount: 0,
  isAnswering: false,
  timer: null,
  timeLeft: 30,

  init() {
    document.getElementById('btnHome').onclick = () => this.goHome();
    document.getElementById('btnRestart').onclick = () => this.start(this.level);
    document.getElementById('btnNextWave').onclick = () => this.startNextWave();
    document.getElementById('btnRetry').onclick = () => this.start(this.level);
    document.getElementById('btnBackMap').onclick = () => this.goHome();
  },

  start(level) {
    this.level = level;
    this.currentWave = 0;
    this.totalWaves = level.waves;
    this.hp = 10;
    this.gold = 50;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.answered = 0;
    this.correctCount = 0;

    // 抽题
    const totalQ = level.waves * level.perWave;
    this.questions = window.getQuestionsForLevel(level, totalQ);

    document.getElementById('mapScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('battleScreen').style.display = 'block';

    GameEngine.init('battleCanvas');
    GameEngine.start();

    this.updateStats();
    this.startNextWave();
  },

  startNextWave() {
    if (this.currentWave >= this.totalWaves) {
      this.win();
      return;
    }
    this.currentWave++;
    this.currentQIndex = 0;
    this.waveQuestions = this.questions.slice(
      (this.currentWave - 1) * this.level.perWave,
      this.currentWave * this.level.perWave,
    );

    // 生成怪物
    const monsters = this.waveQuestions.map((q, i) => {
      const hpBoost = this.currentWave * 10;
      return new Monster(850, GameEngine.path, i % 3 === 0 ? 'soldier' : 'minion', hpBoost);
    });
    console.log(`[Battle] 第 ${this.currentWave} 波 spawn ${monsters.length} 只怪`);
    GameEngine.spawnWave(monsters);

    document.getElementById('battleTitle').innerText = `第 ${this.level.id} 关 · ${this.level.name}`;
    document.getElementById('monsterStatus').innerText = `🌊 第 ${this.currentWave}/${this.totalWaves} 波 · ${this.waveQuestions.length} 只小怪来袭`;
    document.getElementById('waveBtn').style.display = 'none';
    this.updateStats();

    // 监听：当怪物进入塔范围时触发答题
    this.setupWaveTrigger();
  },

  setupWaveTrigger() {
    // 每 500ms 检查是否需要弹题
    this.triggerTimer = setInterval(() => {
      if (!GameEngine.running) return;
      if (this.isAnswering) return;
      if (this.currentQIndex >= this.waveQuestions.length) return;

      // 找到最前面的怪物
      const frontMonster = GameEngine.monsters
        .filter(m => !m.dead && !m.reached)
        .sort((a, b) => a.x - b.x)[0];

      // 当怪物 x < 700 时弹题（提前让玩家有思考时间）
      if (frontMonster && frontMonster.x < 700) {
        this.showQuestion(this.waveQuestions[this.currentQIndex]);
      }

      // 检查波次是否清完（题目答完 + 怪物清完 或 所有怪都被击杀）
      const allMonstersDeadOrReached = GameEngine.monsters.every(m => m.dead || m.reached);
      if (allMonstersDeadOrReached && this.currentQIndex >= this.waveQuestions.length && !this.isAnswering) {
        clearInterval(this.triggerTimer);
        // 延迟 1.5 秒显示下一波按钮
        setTimeout(() => {
          if (this.currentWave >= this.totalWaves) {
            this.win();
          } else {
            document.getElementById('waveBtn').style.display = 'block';
          }
        }, 1500);
      }

      // 检查是否有怪物到达终点
      if (GameEngine.anyMonsterReached()) {
        GameEngine.removeReachedMonsters();
        this.hp--;
        this.updateStats();
        document.getElementById('battleCanvas').classList.add('shake');
        setTimeout(() => document.getElementById('battleCanvas').classList.remove('shake'), 300);
        if (this.hp <= 0) {
          this.lose();
        }
      }
    }, 500);
  },

  showQuestion(q) {
    if (this.isAnswering) return;
    this.isAnswering = true;
    clearInterval(this.triggerTimer);

    this.timeLeft = 30;
    document.getElementById('quizStem').innerText = q.question_text || q.stem || '（无题干）';
    const opts = q.options || {};
    // 过滤掉非 A/B/C/D 字段（如 option_images）
    const validOpts = Object.entries(opts).filter(([k]) => /^[A-Z]$/.test(k));
    const html = validOpts.map(([k, v]) =>
      `<button class="quiz-option" data-letter="${k}">${k}. ${v}</button>`
    ).join('');
    document.getElementById('quizOptions').innerHTML = html;
    document.getElementById('quizFeedback').className = 'quiz-feedback';
    document.getElementById('quizFeedback').innerText = '';
    document.getElementById('quizPanel').style.display = 'block';

    // 绑定选项
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.onclick = () => {
        if (this.timeLeft <= 0) return;
        clearInterval(this.timer);
        this.submitAnswer(btn.dataset.letter, q);
      };
    });

    // 计时器
    this.timer = setInterval(() => {
      this.timeLeft--;
      document.getElementById('quizTimer').innerText = '⏱️ ' + this.timeLeft;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.submitAnswer(null, q);
      }
    }, 1000);
  },

  submitAnswer(letter, q) {
    const correctAns = q.answer || q.explanation || '';
    const correct = letter === correctAns;
    const correctBtn = document.querySelector(`[data-letter="${correctAns}"]`);

    // 标记选项
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.classList.add('disabled');
      if (btn.dataset.letter === correctAns) btn.classList.add('correct');
      if (btn.dataset.letter === letter && !correct) btn.classList.add('wrong');
    });

    const fb = document.getElementById('quizFeedback');
    if (correct) {
      this.correctCount++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.gold += this.level.monsterGold;
      this.score += 100 + (this.combo >= 3 ? 50 : 0);
      fb.className = 'quiz-feedback show correct';
      fb.innerText = `✅ 答对了！+${this.level.monsterGold} 金币` + (this.combo >= 3 ? ` (连击 x${this.combo})` : '');

      // 击杀当前波的一个怪物（最前面的）
      const front = GameEngine.monsters
        .filter(m => !m.dead && !m.reached)
        .sort((a, b) => a.x - b.x)[0];
      if (front) {
        front.takeDamage(9999);  // 立即击杀
      }

      // 连击特效
      if (this.combo >= 3) {
        this.showCombo(this.combo);
      }
    } else {
      this.combo = 0;
      this.hp = Math.max(0, this.hp - 1);
      fb.className = 'quiz-feedback show wrong';
      fb.innerText = letter === null
        ? `⏱️ 超时！正确答案是 ${correctAns}`
        : `❌ 答错了！正确答案是 ${correctAns}`;
    }
    this.answered++;
    this.updateStats();

    // 1.5 秒后进入下一题
    setTimeout(() => {
      this.isAnswering = false;
      this.currentQIndex++;
      document.getElementById('quizPanel').style.display = 'none';
      if (this.hp <= 0) {
        this.lose();
        return;
      }
      // 击杀所有剩余怪物（确保波次清完）
      GameEngine.monsters.forEach(m => { if (!m.dead) m.hp = 0; m.dead = true; });
      if (this.currentQIndex >= this.waveQuestions.length) {
        // 当前波完成 - 显示下一波按钮
        clearInterval(this.triggerTimer);
        this.triggerTimer = null;
        setTimeout(() => {
          if (this.currentWave >= this.totalWaves) {
            this.win();
          } else {
            document.getElementById('waveBtn').style.display = 'block';
          }
        }, 800);
      } else {
        // 立即弹出下一题
        this.showQuestion(this.waveQuestions[this.currentQIndex]);
      }
    }, 1500);
  },

  showCombo(n) {
    const div = document.createElement('div');
    div.className = 'combo-popup';
    div.innerText = `🔥 COMBO x${n}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
  },

  updateStats() {
    document.getElementById('hpDisplay').innerText = '❤️ ' + this.hp;
    document.getElementById('goldDisplay').innerText = '💰 ' + this.gold;
    document.getElementById('waveDisplay').innerText = '🌊 ' + this.currentWave + '/' + this.totalWaves;
    document.getElementById('levelDisplay').innerText = '⚔️ Lv.' + this.currentWave;
  },

  win() {
    GameEngine.stop();
    clearInterval(this.triggerTimer);
    const stars = this.hp >= 8 ? 3 : (this.hp >= 5 ? 2 : 1);
    const totalGold = this.gold;
    window.GameProgress.completeLevel(this.level.id, this.score);
    document.getElementById('battleScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    document.getElementById('resultTitle').innerText = '🎉 通关成功！';
    document.getElementById('resultStats').innerHTML = `
      ⭐ ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}<br>
      💯 得分：${this.score}<br>
      ✅ 答对：${this.correctCount}/${this.answered}<br>
      🔥 最高连击：x${this.maxCombo}<br>
      💰 剩余金币：${totalGold}<br>
      ❤️ 剩余生命：${this.hp}
    `;
    renderLevelMap();
  },

  lose() {
    GameEngine.stop();
    clearInterval(this.triggerTimer);
    document.getElementById('battleScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    document.getElementById('resultTitle').innerText = '💔 挑战失败';
    document.getElementById('resultStats').innerHTML = `
      😢 不要灰心，再试一次！<br>
      ✅ 答对：${this.correctCount}/${this.answered}<br>
      🔥 最高连击：x${this.maxCombo}<br>
      💡 提示：答错或超时都会扣 1 点生命
    `;
  },

  goHome() {
    GameEngine.stop();
    clearInterval(this.triggerTimer);
    document.getElementById('battleScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('mapScreen').style.display = 'block';
    renderLevelMap();
  },
};

window.Battle = Battle;

/**
 * 渲染关卡地图
 */
function renderLevelMap() {
  const map = document.getElementById('levelMap');
  if (!map) return;
  map.innerHTML = '';
  window.LEVELS.forEach((lvl, i) => {
    const unlocked = lvl.unlocked || (i + 1) <= window.GameProgress.unlockedLevel;
    const stats = window.GameProgress.levelStats[lvl.id];
    const completed = !!stats;
    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '');
    card.innerHTML = `
      <span class="level-icon">${lvl.icon}</span>
      <div class="level-name">第 ${lvl.id} 关 · ${lvl.name}</div>
      <div class="level-desc">${lvl.desc}</div>
      <div class="level-meta">
        📚 ${lvl.waves} 波 × ${lvl.perWave} 题 = ${lvl.waves * lvl.perWave} 道题<br>
        ${completed ? `⭐ ${stats.bestScore} 分` : (unlocked ? '✅ 可挑战' : '🔒 未解锁')}
      </div>
      ${completed ? '<div class="level-badge">已通关</div>' : (unlocked ? '' : '<div class="level-badge">🔒</div>')}
    `;
    if (unlocked) {
      card.onclick = () => window.Battle.start(lvl);
    }
    map.appendChild(card);
  });
}

window.renderLevelMap = renderLevelMap;

// 初始化：渲染地图
document.addEventListener('DOMContentLoaded', () => {
  window.Battle.init();
  renderLevelMap();
});