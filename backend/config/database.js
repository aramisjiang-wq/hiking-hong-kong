// 使用内存数据库模拟，避免需要任何外部依赖
require('dotenv').config();

// 内存数据库
const memoryDB = {
  users: [],
  nextId: 1
};

// 模拟数据库查询函数
const runQuery = (sql, params = []) => {
  // 简化的SQL解析和执行
  if (sql.includes('INSERT INTO users')) {
    // 插入用户
    const user = {
      id: memoryDB.nextId++,
      username: params[0],
      email: params[1],
      password: params[2],
      full_name: params[3] || '',
      bio: params[4] || '',
      location: params[5] || '',
      hiking_experience: params[6] || 'beginner',
      role: 'user',
      is_active: 1,
      email_verified: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryDB.users.push(user);
    return { rows: [user], rowCount: 1 };
  }
  
  if (sql.includes('SELECT') && sql.includes('WHERE username = $1 OR email = $2')) {
    // 按用户名或邮箱查找用户
    const username = params[0];
    const email = params[1];
    const user = memoryDB.users.find(u => u.username === username || u.email === email);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  if (sql.includes('SELECT') && sql.includes('WHERE id = $1')) {
    // 按ID查找用户
    const id = params[0];
    const user = memoryDB.users.find(u => u.id === id);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  if (sql.includes('SELECT') && sql.includes('WHERE email = $1')) {
    // 按邮箱查找用户
    const email = params[0];
    const user = memoryDB.users.find(u => u.email === email);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  // 默认返回空结果
  return { rows: [], rowCount: 0 };
};

// 创建一个兼容pg Pool接口的对象
const pool = {
  query: async (sql, params = []) => {
    console.log('📊 执行数据库查询:', sql.substring(0, 50) + '...');
    return runQuery(sql, params);
  },
  connect: async () => {
    console.log('🔌 建立数据库连接');
    return {
      query: async (sql, params = []) => runQuery(sql, params),
      release: () => console.log('🔌 释放数据库连接')
    };
  },
  end: () => console.log('📊 数据库连接已关闭')
};

// 测试数据库连接
const testConnection = async () => {
  try {
    console.log('✅ 内存数据库初始化成功');
    console.log('🔧 数据库模式: 内存模式 (无需外部数据库服务)');
    console.log('📊 初始用户数量:', memoryDB.users.length);
  } catch (err) {
    console.error('❌ 内存数据库初始化失败:', err.message);
  }
};

// 健康检查函数
const healthCheck = async () => {
  try {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: 1,
      idleConnections: 1,
      userCount: memoryDB.users.length
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
};

module.exports = {
  pool,
  testConnection,
  healthCheck
};