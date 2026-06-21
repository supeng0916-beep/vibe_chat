# VibeChat 项目实施方案（交接最终版）

> AI 驱动的情绪社交 Web 应用 · FastAPI + Next.js 前后端分离
> 本文件是给编程 agent 的权威实施依据，可直接据此开发。

---

## 0. 一句话产品

用户输入一段当下心情 → AI 把文字解析成**情绪向量（效价 valence × 唤醒度 arousal）** → 系统按情绪空间最近邻**自动匹配同频陌生人** → 进入**实时匿名聊天**。情绪以「情绪星图」可视化，全程围绕情绪展开。

---

## 1. 背景与评分约束（必须时刻对齐）

赛题：基于情绪识别的匿名社交应用。评审维度与权重：

| 维度 | 权重 | 关键 |
|---|---|---|
| 功能性 | 40% | 情绪识别 / 匹配 / 匿名聊天 / 线上演示全实现，核心流程稳定 |
| 技术性 | 40% | **OpenAI + Anthropic 双标准适配**、前后端架构合理、异常处理、部署完成度 |
| 用户体验 | 20% | UI 美观、交互顺畅、情绪表达准确、匿名社交氛围 |

**致命扣分项（设计/实现时主动规避）**：
1. 无线上演示地址或无法访问。
2. 只支持 OpenAI 或只支持 Anthropic。
3. **情绪分析与匹配逻辑脱节**（只展示标签但不影响匹配）—— 本项目用 VA 向量从根上规避。
4. 匿名聊天无法真实收发消息。

**制胜核心**：让「情绪」成为匹配的**真实数学依据**（VA 向量最近邻），并用情绪星图把它可视化、可演示。

---

## 2. 已确认的关键决策

- 技术栈（硬性）：**FastAPI + Next.js，前后端分离**。
- 交付策略：**分阶段**——先跑通必做闭环保证「可稳定演示」，再叠加亮点。
- 架构：**轻量优先**——FastAPI 内存态 ConnectionManager + 匹配队列 + SQLite；代码保留 Redis 抽象接口讲扩展性。
- 部署：**Vercel（前端）+ Render（后端，支持 WebSocket 长连接）**。
- LLM：**OpenAI + Anthropic 双 Key 均可用**，两套适配真实切换演示。

---

## 3. 技术栈

**后端** `/backend`
- Python 3.12 + FastAPI + Uvicorn
- WebSocket（Starlette 原生）
- Pydantic v2 + pydantic-settings
- `openai` 官方 SDK（`base_url` 可覆盖 → 兼容任意 OpenAI 标准网关）
- `anthropic` 官方 SDK（forced tool-use 做结构化输出）
- SQLModel + SQLite（持久化层抽象，便于换 Postgres）
- 依赖：推荐 `uv`（或 `requirements.txt`）

**前端** `/frontend`
- Next.js 15（App Router）+ TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion（`motion`）+ AnimatePresence
- Zustand（全局状态：session / emotion / match / ws）
- 原生 WebSocket 客户端（自动重连）
- 情绪星图：手写 SVG + motion（不引重型图表库）

**部署**：前端 Vercel，后端 Render，环境变量注入 Key。

---

## 4. 系统架构

```
[Next.js / Vercel]  ──HTTPS REST──►  [FastAPI / Render]
       │                                   │
       └──────── WSS WebSocket ────────────┤
                                           ├── EmotionService（双 LLM 适配器 + 结构化输出 + 降级链）
                                           ├── MatchingEngine（VA 加权最近邻 + 队列 + 兜底阶梯）
                                           ├── ConnectionManager（内存态，Redis-ready 接口）
                                           └── SQLite（session/emotion/room/member/message）
```

---

## 5. 情绪模型与 LLM Prompt 设计（数据地基）

整个产品消费同一份结构化输出，质量第一优先。

### 5.1 EmotionResult Schema（Pydantic，单一事实源）

```python
class EmotionResult(BaseModel):
    reasoning: str            # LLM 内部推理（CoT，提升数值可靠性；前端不展示）
    primary_emotion: str      # 主情绪标签（中文，如 焦虑/喜悦/孤独/平静）
    secondary_emotions: list[str]   # 复合情绪，可空
    valence: float            # 效价 -1(极痛苦) ~ 0(中性) ~ +1(极愉悦)
    arousal: float            # 唤醒度 0(昏睡平静) ~ 1(极度激动)
    intensity: float          # 情绪强度 0~1
    polarity: Literal["positive","negative","neutral"]
    keywords: list[str]       # 情绪关键词
    color: str                # 情绪色 hex（驱动 UI 氛围色）
    emotion_emoji: str        # 单个 emoji（驱动星点/头像）
    explanation: str          # 简短解释 ≤50 字（前端展示）
    safety_flag: bool         # 极端负面/自伤危机信号
    degraded: bool = False    # 是否走了降级链（由服务层置位，非 LLM 输出）
```

`(valence, arousal)` 即情绪坐标，是匹配 + 可视化 + 配色的共同来源。

### 5.2 情绪 → VA 象限锚点（写进 prompt 给 LLM 锚定）

| 象限 | valence | arousal | 代表情绪 | 星图区域 |
|---|---|---|---|---|
| 右上 高能正向 | + | 高 | 兴奋、惊喜、雀跃 | 兴奋广场 🔆 |
| 左上 高能负向 | − | 高 | 焦虑、愤怒、恐慌 | 焦虑风暴 ⚡ |
| 左下 低能负向 | − | 低 | 低落、孤独、疲惫 | 低落深海 🌊 |
| 右下 低能正向 | + | 低 | 平静、放松、满足 | 平静海湾 🌙 |

### 5.3 Prompt 策略（保证 VA 数值可靠 + 可复现）
- **先推理再打分**：`reasoning` 字段在前，强制 CoT。
- **明确锚点定义**写进 system prompt（上表 + valence/arousal 端点语义）。
- **结构化强约束**：OpenAI 用 `response_format` JSON Schema(`strict:true`)；Anthropic 用 forced tool-use；**两端共用同一份从 Pydantic 导出的 JSON Schema**。
- `temperature=0`，演示可复现。
- 中文 prompt + 中文 few-shot 示例，标签输出中文。

---

## 6. 双 LLM 适配器（技术分关键 + 硬性要求）

目录 `backend/app/llm/`：
- `base.py`：抽象基类 `LLMProvider`
  - `analyze_emotion(text) -> EmotionResult`
  - `generate(system: str, prompt: str, stream: bool) -> str | AsyncIterator[str]`（破冰/陪伴用）
- `openai_provider.py`：`openai` SDK，结构化输出 `response_format` JSON Schema；读 `OPENAI_BASE_URL`
- `anthropic_provider.py`：`anthropic` SDK，结构化输出 forced tool-use（emotion schema 作为 tool）
- `factory.py`：按 `LLM_PROVIDER` 返回对应实现（单例）
- `fallback.py`：**降级链** —— LLM 调用失败 → 重试 1 次 → 仍失败走本地词典启发式情绪分析（中文情绪词 lexicon 估算 VA），置 `degraded=true`

降级链保证「外部 LLM API 异常时产品不崩」，直接命中「可稳定演示」要求。

### 环境变量（README 必须写明）
```
LLM_PROVIDER=openai                          # openai | anthropic，一行切换
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1    # 可指向任意兼容网关
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
FRONTEND_ORIGIN=https://<your-app>.vercel.app   # CORS
DATABASE_URL=sqlite:///./vibechat.db
MATCH_TIMEOUT_SECONDS=15
```

---

## 7. 匹配引擎（让情绪真实驱动匹配）

`backend/app/matching/engine.py`，内存态。

**距离度量**（VA 加权欧氏距离）：
```
dist = sqrt( w_v·(v1−v2)² + w_a·(a1−a2)² )      w_v=1.0, w_a=0.7
```
效价权重高于唤醒度——「同样负面」比「同样激动」更重要。

**匹配模式**：
- `similar`（默认）：队列中 `dist` 最小且达阈值者。
- `complementary`（Phase 2）：valence 相反、arousal 相近者（「开心的人陪低落的人」）。

**兜底阶梯**（必做要求 + 保证单人可演示，永不卡等待页）：
```
0–8s    严格匹配  dist ≤ 0.35   （找最懂你的人）
8–15s   放宽匹配  dist ≤ 0.60
>15s    二选一兜底：
          ① 进入所在 VA 象限的「同频房间」（多人）
          ② 唤起 AI 情绪陪伴 bot（扮演情绪相近的匿名者）
```
含防饥饿 / 渐进放宽，体现工程严谨。

**演示辅助**：保留 mock 用户注入机制（dev 端点或脚本），单人即可演示完整双人聊天。

---

## 8. 实时聊天（WebSocket）

`backend/app/ws/manager.py`：
- `ConnectionManager` 抽象接口（`connect / disconnect / send_to_room / broadcast`），当前内存实现，注释标明 Redis Pub/Sub 替换点。
- WS 路由 `WS /ws/{session_id}`，事件类型：
  - `message`（聊天消息）
  - `system`（match_found / partner_joined / partner_left）
  - `typing`（输入中）
  - `emotion`（对方情绪徽章数据）
- 消息持久化 SQLite，进房加载历史。
- 心跳保活（应对代理 60–300s 空闲断连）。

---

## 9. 匿名身份与配色

- **昵称**：`形容词 + 时间/自然意象 + 动物`，本地词库随机，如「深夜的鲸鱼」「微醺的山雀」「清晨的水母」。
- **头像**：`emotion_emoji` 或动物 emoji + 情绪色圆形渐变底。
- **主题色**：session 主题色 = 当前情绪 `color`；界面氛围色随情绪微调（焦虑冷紫 / 平静青 / 低落深蓝 / 兴奋暖橙）。

---

## 10. AI 陪伴 / 破冰 / 安全边界

- **破冰**（`POST /api/conversation/icebreaker`）：基于**双方情绪**生成一句开场白，证明 AI 把情绪用于对话。例：「你们都带着点深夜的疲惫，先聊聊今天最累的瞬间？」
- **陪伴 bot**（兜底）：system prompt 注入「你是情绪坐标接近 (v,a) 的匿名网友，用同频语气自然聊天，不暴露 AI 身份」，响应走流式。
- **安全边界**：`safety_flag=true` 时聊天页顶部展示温和求助提示条（含心理援助热线），不打断对话。

---

## 11. 数据模型（SQLModel / SQLite）

- `Session`：id, anon_nickname, avatar, theme_color, created_at
- `EmotionProfile`：id, session_id, raw_text, valence, arousal, intensity, primary_emotion, secondary_emotions(JSON), keywords(JSON), color, emotion_emoji, explanation, safety_flag, degraded, created_at
- `Room`：id, mode(similar/complementary/room/ai), status(active/closed), created_at
- `RoomMember`：room_id, session_id, emotion_profile_id
- `Message`：id, room_id, session_id, content, created_at
- （Phase 2）情绪轨迹直接派生自 EmotionProfile 历史

---

## 12. 后端 API 契约

REST（前缀 `/api`）：

| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/api/session` | — | `{session_id, nickname, avatar, theme_color}` |
| POST | `/api/emotion/analyze` | `{session_id, text}` | `EmotionResult`（含 `degraded`） |
| POST | `/api/match` | `{session_id, mode}` | `{status: "matched"\|"waiting", room_id?}` |
| GET | `/api/match/status` | `?session_id` | `{status, room_id?}`（WS 不可用时轮询兜底） |
| GET | `/api/rooms/{room_id}/messages` | — | `Message[]` |
| GET | `/api/rooms/{room_id}/members` | — | 成员匿名信息 + 情绪徽章 |
| POST | `/api/conversation/icebreaker` | `{room_id}` | `{text}` |
| GET | `/api/emotion/history` | `?session_id` | `EmotionProfile[]`（Phase 2） |
| GET | `/api/config` | — | `{provider, model}`（演示双适配） |
| GET | `/api/health` | — | `{status:"ok"}`（部署防休眠预热） |

WebSocket：`WS /ws/{session_id}` —— 收发 message / typing / system / emotion。

CORS：放行 `FRONTEND_ORIGIN`。

---

## 13. 前端流程与页面

1. **情绪输入页** `/`：大输入框「此刻，你想说点什么？」，进场动效，提交调 `analyze`。
2. **情绪结果页** `/emotion`：主/复合标签、强度条、正负向、关键词、情绪氛围色渐变；情绪星图点亮「你」这颗星；CTA「寻找同频的人」+ 模式选择。
3. **匹配等待页** `/matching`：星图动画，其它匿名星点漂移，匹配成功一颗近星滑入连线；超时走兜底（同频房间 / AI 陪伴），有清晰文案。
4. **匿名聊天页** `/chat/[roomId]`：消息气泡（AnimatePresence 进场）、对方情绪徽章、会话状态、输入中提示、情绪色主题；`safety_flag` 时顶部求助条；破冰建议按钮。
5. **情绪轨迹页** `/history`（Phase 2）：历史情绪曲线 / 星图回顾。

全局：Zustand 存 session/emotion/ws；`lib/ws.ts` 封装自动重连 + 事件分发；`lib/api.ts` 读 `NEXT_PUBLIC_API_URL`。

---

## 14. 情绪星图动画编排（UX 分核心 / 视频高光镜头）

坐标映射：valence → X（左负右正），arousal → Y（下静上动），画布为深色星空。
- **结果页**：你的情绪化作一颗星，从中心点亮、呼吸脉动，颜色=`color`，落在对应象限，象限标签淡入。
- **匹配页**：背景匿名星点缓慢漂移；匹配成功，最近的星沿光线轨迹（`pathLength` 动画）滑向你并连成发光线 →「找到同频的人」，spring 物理 + 光晕做足仪式感。
- **聊天页**：星图缩成右上角徽章，两颗连线星常驻，提示「你们的情绪坐标」。

技术：SVG `<circle>`/`<line>` + motion，轻量可控。

---

## 15. 分阶段执行计划

### Phase 0 — 脚手架
- 建 `/backend` `/frontend` 两套工程；根目录 `README.md`、各自 `.env.example`、后端 `Dockerfile`/`render.yaml`。
- 后端：app 工厂、CORS、`/api/health`、SQLModel 初始化、settings。
- 前端：Next.js 15 + Tailwind + shadcn 初始化、`lib/api.ts`、Zustand store、布局与主题。

### Phase 1 — 必做闭环（功能性 40%，先保证可稳定演示）
1. 双 LLM 适配器 + `EmotionResult` schema + 降级链。
2. `POST /api/session`、`POST /api/emotion/analyze` + 落库。
3. 匹配引擎 similar 模式 + 内存队列 + 兜底阶梯（先做 AI 陪伴兜底，单人可演示）。
4. WebSocket：ConnectionManager、收发消息、持久化、进房加载历史。
5. 前端四页贯通：输入 → 结果 → 匹配 → 聊天，真实收发。
6. `GET /api/config`；验证 OpenAI / Anthropic 切换均可跑通。
> 里程碑：双标准各跑一遍，完整闭环可连续演示。

### Phase 2 — 差异化亮点（技术分 + UX 分）
- 情绪星图可视化（结果页 + 匹配页核心视觉）。
- 互补匹配 / 同频房间模式。
- AI 破冰 `icebreaker`。
- 安全边界求助条。
- 情绪轨迹历史页。
- 文案 / 配色 / 动效统一到「情绪社交」气质。

### Phase 3 — 部署 + 交付物（规避头号扣分项）
- 后端部署 Render（环境变量 + 防休眠 health ping）。
- 前端部署 Vercel（`NEXT_PUBLIC_API_URL` 指向 Render）。
- 打通线上 CORS / WSS、跑通线上完整流程。
- **README**：功能、技术栈、运行方式、**OpenAI 与 Anthropic 两种模式配置（环境变量、模型名、启动方式）**、演示地址、测试说明。
- 100 字产品介绍；3–6 分钟演示视频脚本（输入→识别→匹配→聊天→线上访问）。
- 准备 mock 用户 / 双标签页方案，保证视频可连续跑通。

---

## 16. 关键文件结构

```
backend/
  app/
    main.py                # app 工厂、路由挂载、CORS、WS 挂载
    config.py              # pydantic-settings 环境变量
    db.py                  # SQLModel engine/session
    models.py              # Session/EmotionProfile/Room/RoomMember/Message
    schemas.py             # EmotionResult 等 IO schema（JSON Schema 导出源）
    llm/
      base.py  openai_provider.py  anthropic_provider.py  factory.py  fallback.py
    matching/engine.py     # VA 加权最近邻 + 队列 + 兜底阶梯
    ws/manager.py          # ConnectionManager（Redis-ready 抽象）
    services/              # emotion / identity（昵称头像）/ conversation（破冰陪伴）
    routers/ session.py emotion.py match.py chat.py config.py
    data/ lexicon.py nicknames.py    # 降级词典 + 昵称词库
  requirements.txt / pyproject.toml
  Dockerfile / render.yaml
  .env.example
frontend/
  app/ (page.tsx, emotion/page.tsx, matching/page.tsx, chat/[roomId]/page.tsx, history/page.tsx)
  components/ (EmotionCard, EmotionMap, ChatRoom, MessageBubble, EmotionBadge, SafetyBanner ...)
  lib/ (api.ts, ws.ts, store.ts, types.ts)
  .env.example
README.md
PROJECT_PLAN.md            # 本文件
```

---

## 17. 端到端验证

**本地**
1. 后端 `uvicorn app.main:app --reload`，前端 `npm run dev`。
2. `LLM_PROVIDER=openai` 跑：输入 → 结构化情绪 → 匹配 → 聊天收发。
3. 切 `LLM_PROVIDER=anthropic` 重启再跑，确认双标准可用、`/api/config` 正确。
4. 写错 API Key，确认降级链生效、前端有清晰错误/降级提示。
5. 两个浏览器标签页验证真实双人匿名聊天；单人用 AI 陪伴兜底验证。

**线上**
6. 访问 Vercel 地址跑通完整流程，确认 WSS / CORS / 防休眠正常。
7. 按 README 验证两种 LLM 模式在线上均可切换运行。

**关键回归点**：不同情绪必须匹配到不同对象/房间——情绪标签实际影响匹配结果，杜绝「分析与匹配脱节」。

---

## 18. 给编程 agent 的实施建议

- 严格前后端分离，前端只通过 `NEXT_PUBLIC_API_URL` + WS 与后端通信，不耦合。
- `EmotionResult` 的 JSON Schema 从 Pydantic 模型导出，OpenAI / Anthropic 两端复用，避免双份维护。
- 先把 Phase 1 闭环跑通再做 Phase 2 视觉，任何时候保持「可演示」状态。
- 所有外部调用（LLM）都要有 try/except + 降级，演示稳定性优先。
- WebSocket 客户端务必做自动重连，应对 Render 免费档休眠唤醒。
