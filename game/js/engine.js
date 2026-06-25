/**
 * 游戏引擎 - Canvas 渲染 + 主循环
 */
const GameEngine = {
  canvas: null,
  ctx: null,
  towers: [],
  monsters: [],
  projectiles: [],   // 箭矢/闪电等飞行物
  effects: [],       // 受击数字飘字
  path: [],
  running: false,
  lastTime: 0,
  animationId: null,
  waveMonsters: [],  // 当前波剩余怪物队列
  spawnTimer: 0,
  spawnInterval: 1200,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    // 默认路径：自右向左
    this.path = [
      { x: 850, y: 100 },
      { x: 700, y: 100 },
      { x: 700, y: 200 },
      { x: 200, y: 200 },
      { x: 200, y: 300 },
      { x: 50,  y: 300 },
    ];
    // 默认放置 1 个箭塔
    this.towers = [
      new Tower(450, 150, 'arrow'),
    ];
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  },

  stop() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  },

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  },

  update(dt) {
    // 生成怪物
    if (this.waveMonsters.length > 0 && this.spawnTimer <= 0) {
      const m = this.waveMonsters.shift();
      this.monsters.push(m);
      this.spawnTimer = this.spawnInterval;
    }
    if (this.spawnTimer > 0) this.spawnTimer -= dt;

    // 怪物更新
    this.monsters.forEach(m => m.update(dt));

    // 移除死/到达的怪物
    this.monsters = this.monsters.filter(m => !m.dead);

    // 塔射击
    const now = performance.now();
    this.towers.forEach(t => {
      const shot = t.shoot(this.monsters, now);
      if (shot) {
        this.projectiles.push({
          ...shot,
          x: shot.fromX,
          y: shot.fromY,
          targetHp: shot.target.hp,
          progress: 0,
        });
      }
    });

    // 弹道更新
    this.projectiles = this.projectiles.filter(p => {
      p.progress += dt / 300;  // 300ms 飞行
      if (p.progress >= 1) {
        // 命中
        if (!p.target.dead) {
          p.target.takeDamage(p.damage, {
            slow: p.slow,
            slowDuration: p.slowDuration,
            freeze: p.freeze,
            dot: p.dot,
          });
          this.effects.push({
            x: p.target.x, y: p.target.y - 20,
            text: '-' + p.damage + (p.isCrit ? '💥' : ''),
            color: p.color,
            life: 800,
          });
          if (p.splash) {
            // 溅射到附近怪物
            this.monsters.forEach(m => {
              if (m !== p.target && !m.dead) {
                const d = Math.hypot(m.x - p.target.x, m.y - p.target.y);
                if (d < p.splash) {
                  m.takeDamage(p.damage * 0.5);
                }
              }
            });
          }
        }
        return false;
      }
      return true;
    });

    // 特效更新
    this.effects = this.effects.filter(e => {
      e.y -= dt * 0.02;
      e.life -= dt;
      return e.life > 0;
    });
  },

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 画路径
    ctx.strokeStyle = '#6b4d8a';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();
    // 路径发光
    ctx.strokeStyle = 'rgba(157, 108, 217, 0.3)';
    ctx.lineWidth = 30;
    ctx.stroke();

    // 终点标记
    const end = this.path[this.path.length - 1];
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', end.x, end.y + 5);

    // 怪物
    this.monsters.forEach(m => m.draw(ctx));

    // 塔
    this.towers.forEach(t => t.draw(ctx));

    // 弹道
    this.projectiles.forEach(p => {
      const x = p.fromX + (p.toX - p.fromX) * p.progress;
      const y = p.fromY + (p.toY - p.fromY) * p.progress;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.icon, x, y);
    });

    // 飘字
    this.effects.forEach(e => {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = e.color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, e.life / 400);
      ctx.fillText(e.text, e.x, e.y);
    });
    ctx.globalAlpha = 1;
  },

  // 添加波次怪物
  spawnWave(monsters) {
    this.waveMonsters = monsters;
    this.spawnTimer = 0;
  },

  isWaveCleared() {
    return this.waveMonsters.length === 0 && this.monsters.length === 0;
  },

  anyMonsterReached() {
    return this.monsters.some(m => m.reached);
  },

  removeReachedMonsters() {
    this.monsters = this.monsters.filter(m => !m.reached);
  },
};

window.GameEngine = GameEngine;