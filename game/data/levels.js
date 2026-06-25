/**
 * Python 之塔 - 5 个关卡配置
 * 每个关卡从题库中按知识点抽取题目
 */
window.LEVELS = [
  {
    id: 1,
    name: '变量森林',
    icon: '🌲',
    desc: '学习 Python 变量与基础数据类型',
    knowledge: ['变量', '数据类型'],
    waves: 5,
    perWave: 4,
    monsterHp: 30,
    monsterGold: 10,
    monsterExp: 5,
    unlocked: true,
  },
  {
    id: 2,
    name: '条件山谷',
    icon: '⛰️',
    desc: '掌握 if/else 条件判断',
    knowledge: ['运算符', '条件判断'],
    waves: 5,
    perWave: 4,
    monsterHp: 50,
    monsterGold: 15,
    monsterExp: 8,
    unlocked: false,
  },
  {
    id: 3,
    name: '数据海岸',
    icon: '🌊',
    desc: '熟练使用列表、字符串、字典',
    knowledge: ['列表', '字符串操作', '字典', '元组'],
    waves: 5,
    perWave: 4,
    monsterHp: 70,
    monsterGold: 20,
    monsterExp: 10,
    unlocked: false,
  },
  {
    id: 4,
    name: '函数圣殿',
    icon: '🏛️',
    desc: '学习函数定义与调用',
    knowledge: ['函数', '异常处理', '循环'],
    waves: 5,
    perWave: 4,
    monsterHp: 90,
    monsterGold: 25,
    monsterExp: 12,
    unlocked: false,
  },
  {
    id: 5,
    name: 'BOSS 之塔',
    icon: '👑',
    desc: '综合实战，挑战编程之王',
    knowledge: [],   // 全部混合
    waves: 6,
    perWave: 5,
    monsterHp: 120,
    monsterGold: 30,
    monsterExp: 15,
    unlocked: false,
  },
];

/**
 * 从题库中根据知识点抽取题目
 */
window.getQuestionsForLevel = function(level, count) {
  if (!window.QUESTIONS || !window.QUESTIONS.length) return [];

  let pool = window.QUESTIONS;
  // 关卡 5 用全部，其他按知识点过滤
  if (level.knowledge && level.knowledge.length > 0) {
    const filtered = pool.filter(q => {
      const kp = Array.isArray(q.knowledge_points) ? q.knowledge_points : [];
      return level.knowledge.some(k => kp.some(p => (p || '').includes(k)));
    });
    if (filtered.length >= count) pool = filtered;
  }
  // 只用单选题（编程题不适合塔防战斗的快速答题节奏）
  pool = pool.filter(q => q.question_type === '单选题' || q.question_type === '判断题');
  // 随机抽
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

/**
 * 玩家进度
 */
window.GameProgress = {
  unlockedLevel: 1,  // 已解锁到第几关
  levelStats: {},    // {1: {stars: 3, bestScore: 100}, ...}

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('pyquiz_game_progress') || '{}');
      this.unlockedLevel = saved.unlockedLevel || 1;
      this.levelStats = saved.levelStats || {};
    } catch (e) {}
  },
  save() {
    localStorage.setItem('pyquiz_game_progress', JSON.stringify({
      unlockedLevel: this.unlockedLevel,
      levelStats: this.levelStats,
    }));
  },
  completeLevel(levelId, score) {
    if (!this.levelStats[levelId] || score > this.levelStats[levelId].bestScore) {
      this.levelStats[levelId] = { bestScore: score, completedAt: Date.now() };
    }
    if (levelId >= this.unlockedLevel && levelId < 5) {
      this.unlockedLevel = levelId + 1;
    }
    this.save();
  },
};
window.GameProgress.load();