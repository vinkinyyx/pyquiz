/**
 * 4 种塔（= 4 个 Python 概念）
 */
const TowerTypes = {
  arrow: {
    name: '箭塔',
    icon: '🏹',
    concept: 'if/else 条件',
    color: '#fbbf24',
    damage: 30,
    range: 120,
    cooldown: 1500,
    price: 0,        // 初始免费
    upgrades: [
      { gold: 30, damage: 60,  range: 140, cooldown: 1200 },
      { gold: 60, damage: 100, range: 160, cooldown: 900, crit: 0.2 },
    ],
  },
  lightning: {
    name: '闪电塔',
    icon: '⚡',
    concept: 'for/while 循环',
    color: '#60a5fa',
    damage: 20,
    range: 100,
    cooldown: 1200,
    splash: 60,      // 溅射伤害
    price: 50,
    upgrades: [
      { gold: 50, damage: 35,  range: 120, cooldown: 1000, splash: 80 },
      { gold: 80, damage: 55,  range: 140, cooldown: 800,  splash: 100, chain: 2 },
    ],
  },
  ice: {
    name: '冰冻塔',
    icon: '🧊',
    concept: '列表/字典',
    color: '#67e8f9',
    damage: 15,
    range: 110,
    cooldown: 1800,
    slow: 0.5,       // 减速 50%
    slowDuration: 2000,
    price: 80,
    upgrades: [
      { gold: 60, damage: 25, range: 130, cooldown: 1500, slow: 0.4, slowDuration: 3000 },
      { gold: 90, damage: 40, range: 150, cooldown: 1200, slow: 0.3, slowDuration: 4000, freeze: 1000 },
    ],
  },
  fire: {
    name: '火焰塔',
    icon: '🔥',
    concept: '函数/类',
    color: '#fb923c',
    damage: 50,
    range: 90,
    cooldown: 2500,
    dot: 10,         // 持续伤害 10 持续 3 秒
    price: 150,
    upgrades: [
      { gold: 100, damage: 80, range: 110, cooldown: 2200, dot: 15 },
      { gold: 150, damage: 120, range: 130, cooldown: 1800, dot: 25, summon: true },
    ],
  },
};

class Tower {
  constructor(x, y, type = 'arrow') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = TowerTypes[type];
    this.level = 1;
    this.lastShot = 0;
    this.totalDamage = 0;
  }

  upgrade() {
    const upgrade = this.config.upgrades[this.level - 1];
    if (!upgrade) return false;
    this.level++;
    Object.assign(this.config, upgrade);
    return true;
  }

  getUpgradeCost() {
    return this.config.upgrades[this.level - 1]?.gold || 0;
  }

  getDamage() {
    let dmg = this.config.damage;
    if (this.config.crit && Math.random() < this.config.crit) {
      dmg *= 2;
    }
    return dmg;
  }

  canShoot(now) {
    return now - this.lastShot >= this.config.cooldown;
  }

  shoot(monsters, now) {
    if (!this.canShoot(now)) return null;
    // 找范围内的第一个怪物
    const target = monsters.find(m => !m.dead && this.distanceTo(m) <= this.config.range);
    if (!target) return null;

    this.lastShot = now;
    const dmg = this.getDamage();
    this.totalDamage += dmg;

    return {
      fromX: this.x,
      fromY: this.y,
      toX: target.x,
      toY: target.y,
      target,
      damage: dmg,
      splash: this.config.splash,
      slow: this.config.slow,
      slowDuration: this.config.slowDuration,
      freeze: this.config.freeze,
      dot: this.config.dot,
      color: this.config.color,
      icon: this.config.icon,
      isCrit: this.config.crit && dmg > this.config.damage,
    };
  }

  distanceTo(m) {
    return Math.hypot(m.x - this.x, m.y - this.y);
  }

  draw(ctx) {
    // 塔基座
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 18, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // 塔身（emoji）
    ctx.font = `${28 + this.level * 4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.icon, this.x, this.y);
    // 等级标识
    ctx.font = '11px sans-serif';
    ctx.fillStyle = this.config.color;
    ctx.fillText('Lv.' + this.level, this.x, this.y + 28);
  }
}