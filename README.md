# 🐍 Python 等级考试刷题站 (pyquiz)

> 1561 道真题 · 在线刷题 · 错题本 · 模拟考试 · 支持图形选项

## ✨ 功能特性

| 功能 | 说明 |
|---|---|
| 📚 **顺序刷题** | 按题号顺序逐题练习 |
| 🎲 **随机刷题** | 打乱顺序随机抽题 |
| ⏱️ **模拟考试** | 随机 20 题，计时 30 分钟 |
| 📖 **错题本** | 复习所有错题 |
| 🖼️ **图形选项** | turtle 绘图题自动显示图像选项 |
| 💾 **本地存储** | 进度和错题本存 localStorage |
| ⌨️ **键盘快捷键** | A/B/C/D 选答案，Enter 提交，N 下一题 |
| 📱 **响应式** | 手机/电脑都能用 |

## 🚀 在线访问

**GitHub Pages**: https://vinkinyyx.github.io/pyquiz/

## 📊 题库数据

- 总题数：**1561 道**
- 一级单选题：377 道
- 二级单选题：377 道
- 三级单选题：388 道
- 判断题：419 道
- 覆盖年份：2021.03 - 2022.12
- 题目来源：全国青少年软件编程（Python）等级考试

## 🏗️ 技术栈

- **纯前端**：HTML + CSS + 原生 JavaScript
- **无后端**：所有数据本地存储 + jsDelivr CDN
- **题库加载**：jsDelivr CDN（`data/questions.js`）
- **无依赖**：不需任何 npm install

## 📁 目录结构

```
pyquiz/
├── index.html              # 入口
├── css/
│   └── main.css            # 样式
├── js/
│   └── app.js              # 主逻辑（22KB）
├── data/
│   └── questions.js        # 1561 道题（1MB）
└── images/
    └── options/            # 图形题选项图片（58 张）
```

## 🔧 本地运行

```bash
# Python 3
python3 -m http.server 8504

# 或 Node.js
npx http-server -p 8504

# 浏览器打开
open http://localhost:8504/
```

## 🎯 题库数据来源

题库来自《中国电子学会青少年软件编程等级考试（Python）》公开真题。

## 📝 License

MIT License - 公开题库仅供学习交流使用。