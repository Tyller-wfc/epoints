# 🏛️ ePoints 效能协同系统 - 项目技术架构设计文档

针对 **50 人以内的敏捷团队**，架构设计的第一优先级是**极低的运维成本、一键式部署、极高的开发效率**。

为此，我们放弃了复杂的微服务、分布式消息队列（Kafka）、容器编排（K8s）等高成本方案，选用**“单体全栈 + 关系型数据库”**的经典敏捷架构。这套架构在一台普通的 **1核2G/2核4G 云服务器**上即可流畅运行。

---

## 🏛️ 1. 总体架构设计 (前后端分离 / 单体分层)

系统采用前后端分离的单体架构设计，具体逻辑拓扑如下：

```mermaid
graph TD
    %% 客户端
    Client[Web 浏览器 / 移动端 H5] -->|HTTP 请求 / CORS| NestApp[NestJS 单体后端服务 :3000]
    
    %% 服务内部架构
    subgraph NestApp [NestJS 单体服务]
        EpointsController[API 控制路由] --> EpointsService[核心业务逻辑层]
        DatabaseSeed[数据库初始化种子服务]
        
        subgraph Entities [TypeORM 实体映射]
            UserEntity[User]
            MissionEntity[Mission]
            RewardEntity[Reward]
            TicketEntity[Ticket]
            DutyEntity[Duty]
            FeedEntity[Feed]
        end
        
        EpointsService --> Entities
    end
    
    %% 外部推送
    EpointsService -->|异步 Fetch Push (no-cors)| ChatBot[飞书/企业微信/钉钉群机器人]
    
    %% 数据存储
    Entities -->|MySQL 8.0 物理存储| MySQLDB[(MySQL 8.0 数据库 :3306)]
```

---

## 🛠️ 2. 技术栈选型

| 架构分层 | 技术选型 | 选用理由 |
| :--- | :--- | :--- |
| **前端开发** | React + Lucide Icons + Vanilla CSS + Vite | 轻量化，构建速度极快，交互反馈灵敏。 |
| **后端语言** | **NestJS (TypeScript)** | Node.js 现代企业级框架，结构严谨，开发效率极高，方便敏捷修改。 |
| **数据库** | **MySQL 8.0** | 关系型数据库。50人团队的数据量仅需单表，单机完全能扛起每秒数千次查询。 |
| **ORM 框架** | **TypeORM (MySQL Driver)** | 数据库定义代码化（Code-First），支持启动自动建表（synchronize: true），极大减少建表维护成本。 |
| **即时通讯** | 飞书 / 企业微信群机器人 Webhook | 轻量通知。当系统触发红色警报故障申报时，通过群机器人的 Webhook 发送卡片进行即时艾特排障。 |
| **部署与运维**| **Docker Compose** | 编写一个 Docker 配置文件，一键拉起 NestJS 服务和 MySQL，小白也能轻松发布。 |

---

## 💾 3. 积分流水与防刷设计

为了保证积分发放不乱账，涉及积分的操作均受事务保护：
1. 当用户完成任务或被处以扣分惩罚时，系统将通过 MySQL 原子事务保证：
   - 增加/扣减 `users.points_balance` 积分余额；
   - 更新 `users.points_earned_lifetime` 累计积分；
   - 写入 `feed` 日志表生成审计流水。
2. **防刷校验**：在后端接口层面限制了高价值任务的提审状态，只有处于 `Pending Verification` 的任务才能被主管审核通过，限制同一人重复领用并虚报成果。

---

## 📦 4. 生产部署一键拉起规划 (`docker-compose.yml`)

对于 50 人团队，推荐在一台单机云服务器上使用 **Docker Compose** 进行容器化一键部署：

```yaml
version: '3.8'

services:
  # MySQL 8.0 数据库服务
  db:
    image: mysql:8.0
    container_name: epoints-db
    restart: always
    environment:
      MYSQL_DATABASE: epoints
      MYSQL_ROOT_PASSWORD: my-secret-pw
    ports:
      - "3306:3306"
    volumes:
      - db-data:/var/lib/mysql

  # NestJS 后端 API 服务
  server:
    build: ./server
    container_name: epoints-server
    restart: always
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: my-secret-pw
    depends_on:
      - db

  # Frontend Nginx 静态文件服务器
  frontend:
    build: .
    container_name: epoints-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  db-data:
```
