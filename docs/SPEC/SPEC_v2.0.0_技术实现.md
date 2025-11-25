# 技术规范文档 (SPEC)
## 香港徒步路线应用 - 用户系统技术实现

**文档版本**: v1.0  
**创建日期**: 2025-11-25  
**创建者**: AI架构师  
**审核人**: 待定  
**技术栈**: Node.js + Express + PostgreSQL + React + Vite  

---

## 📋 文档概览

### 文档信息
- **项目名称**: 香港徒步路线应用
- **版本号**: v2.0.0
- **文档类型**: 技术规范文档 (SPEC)
- **目标读者**: 开发团队、测试团队、运维团队

### 技术栈选择
| 层级 | 技术选型 | 版本要求 | 理由 |
|------|----------|----------|------|
| 前端框架 | React | 18.x | 成熟稳定，生态丰富 |
| 构建工具 | Vite | 5.x | 快速构建，开发体验好 |
| 后端框架 | Node.js + Express | 18.x + 4.x | 轻量级，易扩展 |
| 数据库 | PostgreSQL | 15.x | 关系型数据库，功能强大 |
| 认证机制 | JWT | 最新版 | 无状态，便于扩展 |
| 部署平台 | 云服务器 | - | 成本可控，弹性扩展 |

---

## 🏗️ 系统架构设计

### 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  React SPA  │  移动端H5  │  平板端  │  桌面端响应式                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        应用网关层 (API Gateway)                      │
├─────────────────────────────────────────────────────────────┤
│  负载均衡  │  SSL终止  │  限流控制  │  请求日志  │  跨域处理             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层 (Business Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  用户服务  │  路线服务  │  成就服务  │  推荐服务  │  文件服务              │
│  (Auth)   │  (Routes)  │  (Badges)  │  (AI)     │  (Upload)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据持久层 (Data Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis Cache  │  文件存储  │  搜索索引                     │
└─────────────────────────────────────────────────────────────┘
```

### 微服务拆分策略
1. **用户认证服务** (auth-service)
   - 用户注册/登录/登出
   - JWT Token管理
   - 用户信息CRUD

2. **路线管理服务** (routes-service)  
   - 路线信息管理
   - 用户标记CRUD
   - 路线统计

3. **成就系统服务** (badges-service)
   - 成就规则引擎
   - 成就授予逻辑
   - 排行榜生成

4. **推荐服务** (recommendation-service)
   - 用户行为分析
   - 路线推荐算法
   - 个性化内容

5. **文件上传服务** (upload-service)
   - 图片上传处理
   - 文件格式验证
   - CDN分发

---

## 🗄️ 数据库设计

### 数据库架构
```sql
-- 创建数据库
CREATE DATABASE hiking_hongkong;
CREATE USER hiking_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE hiking_hongkong TO hiking_user;
```

### 核心表结构设计

#### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    location VARCHAR(100),
    hiking_experience_level INTEGER DEFAULT 1 CHECK (hiking_experience_level BETWEEN 1 AND 5),
    total_distance DECIMAL(10,2) DEFAULT 0,
    total_completed_routes INTEGER DEFAULT 0,
    total_hiking_time INTEGER DEFAULT 0, -- 单位：分钟
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### 2. 路线表 (routes)
```sql
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    distance DECIMAL(8,2) NOT NULL, -- 公里
    estimated_duration INTEGER NOT NULL, -- 分钟
    elevation_gain INTEGER, -- 米
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    route_coordinates JSONB, -- GeoJSON格式
    route_points JSONB, -- 详细路径点
    tags TEXT[], -- 标签数组
    season_best VARCHAR(50), -- 推荐季节
    weather_requirements TEXT,
    equipment_needed TEXT,
    safety_notes TEXT,
    transportation_info TEXT,
    image_urls TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_routes_difficulty ON routes(difficulty_level);
CREATE INDEX idx_routes_distance ON routes(distance);
CREATE INDEX idx_routes_tags ON routes USING GIN(tags);
CREATE INDEX idx_routes_featured ON routes(is_featured);
CREATE INDEX idx_routes_rating ON routes(average_rating DESC);
```

#### 3. 用户路线标记表 (user_route_marks)
```sql
CREATE TABLE user_route_marks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    mark_status VARCHAR(20) NOT NULL CHECK (mark_status IN ('completed', 'planned', 'favorited')),
    completion_date DATE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    review_photos TEXT[], -- 照片URLs
    actual_duration INTEGER, -- 实际用时(分钟)
    actual_distance DECIMAL(8,2), -- 实际距离
    weather_conditions VARCHAR(50),
    difficulty_feedback INTEGER CHECK (difficulty_feedback BETWEEN 1 AND 5),
    would_recommend BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, route_id)
);

-- 创建索引
CREATE INDEX idx_user_marks_user_id ON user_route_marks(user_id);
CREATE INDEX idx_user_marks_route_id ON user_route_marks(route_id);
CREATE INDEX idx_user_marks_status ON user_route_marks(mark_status);
CREATE INDEX idx_user_marks_completion ON user_route_marks(completion_date);
```

#### 4. 成就定义表 (badges)
```sql
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    badge_code VARCHAR(50) UNIQUE NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    badge_icon VARCHAR(255) NOT NULL,
    badge_color VARCHAR(7) NOT NULL, -- 十六进制颜色
    category VARCHAR(50) NOT NULL, -- 'distance', 'count', 'special', 'social'
    requirement_type VARCHAR(50) NOT NULL, -- 'routes_completed', 'total_distance', 'perfect_ratings'
    requirement_value INTEGER NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE, -- 隐藏成就
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_sort_order ON badges(sort_order);
```

#### 5. 用户成就表 (user_badges)
```sql
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_value INTEGER DEFAULT 0, -- 当前进度
    is_fully_earned BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, badge_id)
);

-- 创建索引
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
```

---

## 🔌 API 设计规范

### RESTful API 设计原则
1. **资源导向**: 使用名词表示资源，动词表示操作
2. **HTTP 方法**: GET(读取), POST(创建), PUT(更新), DELETE(删除)
3. **状态码**: 使用标准HTTP状态码
4. **版本控制**: URL路径版本控制 `/api/v1/`

### 通用响应格式
```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        timestamp: string;
        requestId: string;
    };
}
```

### 认证相关 API

#### 1. 用户注册
```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123",
    "username": "hiker_user",
    "displayName": "徒步爱好者"
}
```

#### 2. 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```

#### 3. 刷新Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer {refresh_token}
```

### 路线管理 API

#### 1. 获取路线列表
```http
GET /api/v1/routes?page=1&limit=20&difficulty=2&tags=海景,难度适中&sort=popularity
```

#### 2. 标记路线状态
```http
POST /api/v1/routes/{route_id}/marks
Authorization: Bearer {access_token}
Content-Type: application/json

{
    "status": "completed",
    "completionDate": "2025-01-15",
    "rating": 5,
    "review": "完美的徒步体验!",
    "actualDuration": 180,
    "actualDistance": 12.3,
    "weatherConditions": "晴天",
    "wouldRecommend": true
}
```

---

## 🔐 安全设计规范

### 认证与授权

#### JWT Token 设计
```typescript
interface JWTPayload {
    userId: number;
    email: string;
    username: string;
    iat: number; // 签发时间
    exp: number; // 过期时间
    tokenVersion: number; // Token版本，用于强制登出
}
```

#### 密码安全策略
```javascript
// 密码强度要求
const passwordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventReuse: 5 // 不允许重复使用最近5个密码
};

// 密码加密配置
const bcryptConfig = {
    saltRounds: 12, // 强度设置为12，平衡安全性和性能
    pepper: process.env.PASSWORD_PEPPER // 使用pepper增加安全性
};
```

### 数据安全

#### 数据加密策略
```javascript
// 敏感数据加密
const encryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
};

// 需要加密的字段
const sensitiveFields = [
    'email',
    'phone',
    'realName',
    'identityCard',
    'location'
];
```

#### 输入验证与防护

```javascript
// 输入清理
const sanitizeInput = (input) => {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// 输出转义
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
```

---

## 📱 前端架构设计

### 技术栈选择
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Redux Toolkit + RTK Query
- **路由**: React Router v6
- **UI组件**: 自定义组件库 + Headless UI
- **样式**: Tailwind CSS + CSS Modules
- **地图**: Leaflet + React-Leaflet
- **图表**: Chart.js + React-Chartjs-2
- **图标**: Heroicons + Lucide React
- **动画**: Framer Motion

### 项目结构
```
src/
├── components/           # 通用组件
│   ├── ui/              # UI基础组件
│   ├── forms/           # 表单组件
│   ├── layout/          # 布局组件
│   └── common/          # 业务通用组件
├── pages/               # 页面组件
├── hooks/              # 自定义Hooks
├── services/           # API服务
├── store/              # Redux状态管理
├── utils/              # 工具函数
├── types/              # TypeScript类型定义
└── styles/             # 样式文件
```

---

## 🧪 测试策略

### 后端测试

#### 单元测试示例
```typescript
// routes/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';

describe('Auth API', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });
    
    afterAll(async () => {
        await cleanupTestDatabase();
    });
    
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                username: 'testuser',
                displayName: '测试用户'
            };
            
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.user.username).toBe(userData.username);
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });
        
        it('should reject duplicate email registration', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                username: 'testuser2',
                displayName: '测试用户2'
            };
            
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(409);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
        });
    });
});
```

---

## 🚀 部署方案

### Docker容器化

#### Dockerfile - 后端
```dockerfile
# 后端应用Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境镜像
FROM node:18-alpine AS production

# 安装 dumb-init
RUN apk add --no-cache dumb-init

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeapp -u 1001

WORKDIR /app

# 复制构建产物
COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/package*.json ./

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 切换到应用用户
USER nodeapp

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

#### Dockerfile - 前端
```dockerfile
# 前端应用Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境镜像 - Nginx
FROM nginx:alpine AS production

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 环境变量配置
```bash
# .env.example
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hiking_hongkong
DB_USER=hiking_user
DB_PASSWORD=your_secure_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# CORS配置
CORS_ORIGIN=https://yourdomain.com
```

---

## 📋 实施时间表

| 阶段 | 任务 | 时间 | 交付物 |
|------|------|------|--------|
| 阶段1 | 后端API开发 | 2周 | 用户认证、路线管理API |
| 阶段2 | 前端界面开发 | 2周 | 登录注册、用户中心界面 |
| 阶段3 | 集成测试 | 1周 | 完整功能测试报告 |
| 阶段4 | 部署上线 | 1周 | 生产环境部署 |

---

*本文档为技术规范文档，包含详细的实现细节和开发指导。*