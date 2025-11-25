-- 香港远足路线应用 - 数据库迁移脚本 v1.0.0
-- 创建时间: 2024-11-24
-- 描述: MVP版本核心数据表结构

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========== 用户表 ==========
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    location VARCHAR(100),
    hiking_experience VARCHAR(20) DEFAULT 'beginner' CHECK (hiking_experience IN ('beginner', 'intermediate', 'advanced', 'expert')),
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ========== 路线表 ==========
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'extreme')),
    distance_km DECIMAL(5,2) NOT NULL CHECK (distance_km > 0),
    estimated_time INTEGER NOT NULL, -- 分钟
    start_location VARCHAR(200),
    end_location VARCHAR(200),
    elevation_gain INTEGER DEFAULT 0, -- 米
    route_type VARCHAR(20) DEFAULT 'loop' CHECK (route_type IN ('loop', 'point_to_point', 'out_and_back')),
    accessibility VARCHAR(20) DEFAULT 'moderate' CHECK (accessibility IN ('easy', 'moderate', 'difficult', 'extreme')),
    tags TEXT[], -- PostgreSQL数组类型
    coordinates JSONB, -- 路线坐标点
    waypoints JSONB, -- 关键点信息
    seasonal_info TEXT,
    equipment_needed TEXT[],
    safety_tips TEXT[],
    transportation TEXT,
    images TEXT[],
    avg_rating DECIMAL(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 全文本搜索向量
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('chinese', name || ' ' || COALESCE(description, ''))
    ) STORED
);

-- 路线表索引
CREATE INDEX IF NOT EXISTS idx_routes_difficulty ON routes(difficulty);
CREATE INDEX IF NOT EXISTS idx_routes_distance ON routes(distance_km);
CREATE INDEX IF NOT EXISTS idx_routes_rating ON routes(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_routes_completion ON routes(completion_count DESC);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_tags ON routes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_routes_search ON routes USING GIN(search_vector);

-- ========== 用户路线关联表 ==========
CREATE TABLE IF NOT EXISTS user_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- 实际用时
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    photos TEXT[], -- 用户上传的照片URLs
    notes TEXT, -- 个人笔记
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    weather_conditions VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 复合唯一约束: 每个用户对每条路线只有一个记录
    UNIQUE(user_id, route_id)
);

-- 用户路线表索引
CREATE INDEX IF NOT EXISTS idx_user_routes_user ON user_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_route ON user_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_status ON user_routes(status);
CREATE INDEX IF NOT EXISTS idx_user_routes_completed ON user_routes(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_routes_user_status ON user_routes(user_id, status);

-- ========== 成就表 ==========
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL, -- 成就达成条件
    icon_url VARCHAR(500),
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    points INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 成就表索引
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- ========== 用户成就关联表 ==========
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress JSONB DEFAULT '{}', -- 进度信息
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 复合唯一约束: 每个用户对每个成就只有一个记录
    UNIQUE(user_id, achievement_id)
);

-- 用户成就表索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- ========== 徽章表 ==========
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    requirements JSONB, -- 徽章获取条件
    badge_type VARCHAR(20) DEFAULT 'completion' CHECK (badge_type IN ('completion', 'milestone', 'special', 'seasonal')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 徽章表索引
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_sort ON badges(sort_order);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

-- ========== 用户徽章关联表 ==========
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    awarded_by UUID REFERENCES users(id), -- 奖励者（管理员）
    is_featured BOOLEAN DEFAULT false, -- 是否在个人资料中置顶显示
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 复合唯一约束: 每个用户对每个徽章只有一个记录
    UNIQUE(user_id, badge_id)
);

-- 用户徽章表索引
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON user_badges(user_id, is_featured);

-- ========== 触发器函数 ==========

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_routes_updated_at BEFORE UPDATE ON user_routes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ========== 性能优化视图 ==========

-- 用户统计视图
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.hiking_experience,
    u.created_at,
    COUNT(DISTINCT ur.route_id) FILTER (WHERE ur.status = 'completed') as completed_routes,
    COUNT(DISTINCT ur.route_id) FILTER (WHERE ur.status IN ('planned', 'in_progress')) as planned_routes,
    COALESCE(AVG(ur.rating) FILTER (WHERE ur.rating IS NOT NULL), 0) as avg_rating_given,
    COUNT(DISTINCT ua.achievement_id) as achievements_earned,
    COUNT(DISTINCT ub.badge_id) as badges_earned,
    COALESCE(SUM(r.completion_count) FILTER (WHERE ur.status = 'completed'), 0) as total_route_completions
FROM users u
LEFT JOIN user_routes ur ON u.id = ur.user_id
LEFT JOIN routes r ON ur.route_id = r.id
LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.is_completed = true
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.full_name, u.hiking_experience, u.created_at;

-- 热门路线视图
CREATE OR REPLACE VIEW popular_routes AS
SELECT 
    r.*,
    COALESCE(stats.completion_count, 0) as total_completions,
    COALESCE(stats.avg_rating, 0) as community_rating,
    COALESCE(stats.review_count, 0) as community_reviews
FROM routes r
LEFT JOIN (
    SELECT 
        route_id,
        COUNT(*) as completion_count,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating IS NOT NULL) as review_count
    FROM user_routes 
    WHERE status = 'completed'
    GROUP BY route_id
) stats ON r.id = stats.route_id
WHERE r.is_active = true
ORDER BY 
    CASE WHEN r.completion_count > 0 THEN 1 ELSE 0 END DESC,
    r.completion_count DESC,
    r.avg_rating DESC;

-- ========== 注释 ==========
COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON TABLE routes IS '远足路线信息表';
COMMENT ON TABLE user_routes IS '用户路线进度和记录表';
COMMENT ON TABLE achievements IS '成就定义表';
COMMENT ON TABLE user_achievements IS '用户成就进度表';
COMMENT ON TABLE badges IS '徽章定义表';
COMMENT ON TABLE user_badges IS '用户徽章表';

COMMENT ON COLUMN users.hiking_experience IS '徒步经验等级：beginner, intermediate, advanced, expert';
COMMENT ON COLUMN routes.difficulty IS '路线难度等级：easy, moderate, hard, extreme';
COMMENT ON COLUMN routes.accessibility IS '无障碍程度：easy, moderate, difficult, extreme';
COMMENT ON COLUMN routes.tags IS '路线标签数组，用于筛选和搜索';
COMMENT ON COLUMN routes.coordinates IS '路线坐标点JSON格式';
COMMENT ON COLUMN user_routes.status IS '用户路线状态：planned, in_progress, completed, abandoned';
COMMENT ON COLUMN user_routes.difficulty_rating IS '用户对该路线难度的个人评价（1-5分）';
COMMENT ON COLUMN achievements.criteria IS '成就达成条件JSON格式';
COMMENT ON COLUMN badges.requirements IS '徽章获取条件JSON格式';