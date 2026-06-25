/**
 * 怪物类
 */
const MonsterTypes = {
  minion: { icon: '👾', name: '小怪', hp: 30, speed: 0.5, gold: 10 },
  soldier: { icon: '👹', name: '士兵', hp: 60, speed: 0.7, gold: 15 },
  elite: { icon: '👺', name: '精英', hp: 100, speed: 0.4, gold: 25 },
  boss: { icon: '🐲', name: 'BOSS', hp: 300, speed: 0.3, gold: 100 },
};

class Monster {
  constructor(x, path, type = 'minion', hpBoost = 0) {
    this.x = x;
    this.y = path[0].y;
    this.path = path;
    this.pathIndex = 0;
    this.type = type;
    this.config = MonsterTypes[type];
    this.maxHp = this.config.hp + hpBoost;
    this.hp = this.maxHp;
    this.speed = this.config.speed;
    this.gold = this.config.gold;
    this.dead = false;
    this.reached = false;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.frozenUntil = 0;
    this.dotUntil = 0;
    this.dotDps = 0;
    this.dotTick = 0;
  }

  update(dt) {
    if (this.dead || this.reached) return;
    const now = performance.now();

    // 冰冻效果
    if (this.frozenUntil > now) return;
    // 减速效果
    const slowFactor = this.slowUntil > now ? this.slowFactor : 1;
    // 持续伤害
    if (this.dotUntil > now) {
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.hp -= this.dotDps * dt / 1000;
        this.dotTick = 200;
        if (this.hp <= 0) {
          this.dead = true;
          return;
        }
      }
    }
    // 移动
    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const move = this.speed * slowFactor * dt * 0.1;
    if (dist < move) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.reached = true;
      }
    } else {
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }
  }

  takeDamage(dmg, options = {}) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;  // 击杀
    }
    if (options.slow !== undefined) {
      this.slowFactor = options.slow;
      this.slowUntil = performance.now() + (options.slowDuration || 2000);
    }
    if (options.freeze) {
      this.frozenUntil = performance.now() + options.freeze;
    }
    if (options.dot) {
      this.dotDps = options.dot;
      this.dotUntil = performance.now() + 3000;
      this.dotTick = 200;
    }
    return false;
  }

  draw(ctx) {
    if (this.dead) return;
    const now = performance.now();

    // 冰冻状态：蓝色滤镜
    if (this.frozenUntil > now) {
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 12;
    } else if (this.slowUntil > now) {
      ctx.shadowColor = '#a5f3fc';
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.icon, this.x, this.y);
    ctx.shadowBlur = 0;

    // HP 条
    const barW = 30;
    const barH = 4;
    const barY = this.y - 22;
    const hpPct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : (hpPct > 0.25 ? '#fbbf24' : '#f87171');
    ctx.fillRect(this.x - barW / 2, barY, barW * hpPct, barH);
  }
}