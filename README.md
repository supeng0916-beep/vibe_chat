# VibeChat

VibeChat 是一个 AI 驱动的情绪社交 Web 应用：用户输入当下心情，系统分析情绪标签、效价 valence、唤醒度 arousal 和强度，再用 VA 情绪向量匹配同频匿名用户，进入实时匿名聊天。

## 🌐 线上演示

- 前端（Vercel）：**https://vibe-chat-psi.vercel.app**
- 后端 API（Render）：https://vibechat-api-jx7z.onrender.com

> 后端为 Render 免费档，闲置约 15 分钟会休眠，首次访问需等待 ~30-50 秒唤醒。演示前可先打开 `https://vibechat-api-jx7z.onrender.com/api/health` 预热。

## 功能

- 情绪输入与 AI/降级词典分析，返回标签、解释、关键词、强度、正负向和情绪颜色。
- OpenAI 标准接口与 Anthropic 标准接口双适配，通过环境变量切换。
- 情绪匹配使用加权 VA 最近邻距离，避免“只展示标签但不影响匹配”。
- 匿名身份、房间、消息持久化到 SQLite。
- WebSocket 实时聊天，单人演示时自动进入 AI 陪伴兜底房间。
- 前端完整流程：输入、情绪星图、匹配等待、匿名聊天和破冰建议。
- 情绪色交互星空背景：粒子会跟随鼠标产生光场、连线高亮和点击涟漪，让“情绪星图”贯穿整个体验。

## 技术栈

- 后端：FastAPI、SQLModel、SQLite、OpenAI SDK、Anthropic SDK、WebSocket
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、Zustand、Framer Motion
- 部署建议：Vercel 前端 + Render 后端

## 本地运行

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 填写 `.env` 中的 key。`.env` 已被 `.gitignore` 排除，不会提交到 git。

3. 启动后端：

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/python -m pip install -r requirements.txt
$env:PYTHONPATH="."
../.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

4. 启动前端：

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:3000`。

## LLM 配置

### OpenAI 标准接口

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_BASE_URL` 可指向兼容 OpenAI 标准接口的网关。

### Anthropic 标准接口

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-haiku-4-5
```

`ANTHROPIC_BASE_URL` 可指向兼容 Anthropic Messages 协议（`/v1/messages`）的网关；留默认即走官方 API。

> 提示：若本机已导出 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`（例如通过代理运行 Claude Code），后端会在检测到项目 `.env` 时主动清除这些会冲突的系统级变量，确保以 `.env` 为准。

切换模式只需改 `LLM_PROVIDER=openai|anthropic` 后重启后端，`GET /api/config` 会实时反映当前生效的接口与模型。

如果 API Key 缺失或外部 API 异常，后端会自动走本地中文情绪词典降级链，并返回 `degraded=true`，保证演示流程不中断。

## 部署

- 后端：Render 使用 `backend/Dockerfile`，配置 `FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app`。
- 前端：Vercel 部署 `frontend` 目录，配置：

```env
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-render-api.onrender.com
```

线上演示地址：https://vibe-chat-psi.vercel.app

## 100 字以内产品介绍

VibeChat 将一段心情解析为情绪坐标，用相似情绪向量匹配同频匿名者，并在安全兜底的实时聊天室里开始对话。它让 AI 情绪识别真正参与社交匹配，而不只是贴标签。
