# ePoints 效能协同与保障管理系统

ePoints 是面向企业内部团队的任务协作、即时积分激励和技术保障平台。管理人员可以发布任务、匹配专业领域成员并通过企业微信通知团队；成员可在手机上查看单个任务并快速认领，完成后提交成果审核。系统同时提供 On-Call 故障响应、福利兑换、人员与角色管理等能力。

## 主要功能

- 账号登录与 JWT 会话，区分管理员和普通成员权限。
- 任务发布、专业领域匹配、企业微信通知、任务认领、成果提交与审核。
- 企业微信消息中的手机认领链接，仅展示当前任务详情和认领按钮。
- 任务与故障附件上传、图片预览和文件下载，文件存储在 MinIO。
- 角色、任务领域、主辅关系和人员可用状态管理。
- Critical 故障告警、On-Call 自动分派、MTTA/MTTR 统计和积分结算。
- 福利商品维护、积分兑换、库存扣减和发放记录。
- 企业微信机器人配置、接收人预览、手机号提醒和测试消息。

## 技术架构

| 模块 | 技术 |
| --- | --- |
| Web 前端 | React 19、Vite 8、Vanilla CSS、Lucide React |
| API 服务 | NestJS 11、TypeScript、TypeORM |
| 数据库 | MySQL 8 |
| 文件存储 | MinIO |
| 身份认证 | JWT、bcrypt |
| 消息通知 | 企业微信群机器人 Webhook |

前端开发服务器将 `/api` 代理到 `http://localhost:3000`，因此浏览器和手机只需访问 Vite 的一个入口地址。

## 目录结构

```text
epoints/
├─ src/                    React 前端
│  ├─ components/         页面与业务组件
│  ├─ data/mockData.js    API 客户端（历史文件名）
│  └─ utils/              前端工具函数
├─ server/                 NestJS 后端
│  ├─ scripts/            数据库迁移脚本
│  └─ src/entities/       TypeORM 实体
├─ doc/                    架构、规则、数据库和企业微信文档
└─ vite.config.js          开发服务器及 API 代理配置
```

## 环境要求

- Node.js 20 或更高版本
- npm
- MySQL 8.0
- MinIO
- 可选：企业微信群机器人 Webhook

## 快速开始

### 1. 安装依赖

```bash
git clone https://github.com/Tyller-wfc/epoints.git
cd epoints
npm install
cd server
npm install
```

### 2. 配置后端

复制示例配置并填写实际值：

```bash
cd server
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

主要环境变量：

| 变量 | 说明 |
| --- | --- |
| `DB_HOST`、`DB_PORT` | MySQL 地址和端口 |
| `DB_USER`、`DB_PASSWORD` | MySQL 用户名和密码 |
| `DB_NAME` | 数据库名，默认 `epoints` |
| `JWT_SECRET` | JWT 签名密钥 |
| `MINIO_ENDPOINT` | MinIO HTTP 地址 |
| `MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY` | MinIO 凭据 |
| `MINIO_BUCKET` | 附件桶名称 |
| `PII_ENCRYPTION_KEY` | 手机号等信息的加密密钥 |
| `PUBLIC_WEB_URL` | 企业微信认领链接的前端地址，可留空使用请求来源 |

`.env` 已加入 `.gitignore`，不要提交实际凭据。

### 3. 初始化数据库

创建数据库并执行基础 SQL：

```bash
mysql -u root -p < doc/db_setup.sql
```

已有数据库升级时，在 `server` 目录依次执行：

```bash
npm run migrate:auth
npm run migrate:attachments
npm run migrate:roles
npm run migrate:avatars
npm run migrate:user-refs
```

`migrate:single-owner` 会清理其他成员，仅用于将旧演示数据收敛为单一管理员，不应在正常团队环境执行。

### 4. 启动服务

后端：

```bash
cd server
npm run start:dev
```

前端（另一个终端）：

```bash
cd epoints
npm run dev
```

浏览器访问 [http://localhost:5173](http://localhost:5173)。Vite 默认监听 `0.0.0.0`，同一局域网内的手机可使用开发电脑的 IP 地址访问，例如 `http://192.168.1.20:5173`。

初始化演示账号为 `u2`，密码为 `demo123`。首次登录后应立即在人员管理中修改凭据。

## 企业微信手机认领

1. 在企业微信群中添加群机器人并复制 Webhook。
2. 管理员进入“控制台”，保存 Webhook 和需要提醒的手机号。
3. 将 `PUBLIC_WEB_URL` 配置为手机可访问的地址，例如局域网地址或临时公网隧道地址。
4. 管理员发布任务后，机器人发送 Markdown 消息和“立即认领任务”链接。
5. 成员首次在企业微信内置浏览器登录，后续点击链接直接进入单任务详情页。
6. 成员点击页面底部“立即认领任务”，成功后任务进入 `In Progress`。

使用局域网地址时，手机必须与开发电脑处于同一网络。临时公网地址变化后，需要更新 `PUBLIC_WEB_URL` 并重启后端。更详细配置见 [企业微信通知说明](doc/wecom_notification.md)。

## 常用命令

前端：

```bash
npm run dev
npm run build
npm run lint
```

后端：

```bash
npm run start:dev
npm run build
npm test -- --runInBand
npm run test:e2e
```

## 验证流程

提交代码前建议执行：

```bash
npm run build
npm run lint
cd server
npm run build
npm test -- --runInBand
```

## 相关文档

- [系统架构](doc/architecture.md)
- [数据库初始化](doc/db_setup.sql)
- [角色与任务领域](doc/role_domain_system.md)
- [企业微信通知](doc/wecom_notification.md)
- [积分与业务规则](doc/rules_guide.md)

## 注意事项

- 当前项目以内部团队部署为目标，生产使用前应配置 HTTPS、可靠的公网入口和独立密钥。
- 数据库 `synchronize` 已关闭，实体变更必须通过迁移脚本落库。
- 企业微信群机器人只负责发送通知；用户身份仍由 ePoints 登录会话识别。
- 多实例部署时应进一步增强认领操作的数据库并发控制。
