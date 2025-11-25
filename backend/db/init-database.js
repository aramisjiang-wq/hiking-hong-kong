const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库连接配置（使用管理员权限）
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hiking_hong_kong',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * 执行SQL文件
 * @param {string} filePath SQL文件路径
 * @param {Pool} pool 数据库连接池
 */
async function executeSQLFile(filePath, pool) {
  try {
    console.log(`📄 执行SQL文件: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 分割SQL语句并执行
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        await pool.query(statement);
      }
    }
    
    console.log(`✅ SQL文件执行成功: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`❌ SQL文件执行失败: ${filePath}`, error.message);
    throw error;
  }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabaseExists() {
  try {
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'hiking_hong_kong']
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('检查数据库失败:', error.message);
    return false;
  }
}

/**
 * 创建数据库
 */
async function createDatabase() {
  const dbName = process.env.DB_NAME || 'hiking_hong_kong';
  
  try {
    console.log(`🏗️ 创建数据库: ${dbName}`);
    
    // 连接到postgres数据库来创建新数据库
    const tempPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    
    await tempPool.query(`CREATE DATABASE "${dbName}"`);
    await tempPool.end();
    
    console.log(`✅ 数据库创建成功: ${dbName}`);
    return true;
    
  } catch (error) {
    console.error('❌ 数据库创建失败:', error.message);
    
    if (error.code === '42P04') {
      console.log('📝 数据库已存在，跳过创建步骤');
      return true;
    }
    
    throw error;
  }
}

/**
 * 初始化数据库（执行迁移和种子数据）
 */
async function initDatabase() {
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 1. 检查并创建数据库
    const dbExists = await checkDatabaseExists();
    if (!dbExists) {
      await createDatabase();
    } else {
      console.log('📝 数据库已存在，跳过创建步骤');
    }
    
    // 2. 执行数据库迁移
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`🔄 找到 ${migrationFiles.length} 个迁移文件`);
      
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        await executeSQLFile(filePath, adminPool);
      }
    } else {
      console.log('⚠️ 迁移目录不存在，跳过迁移步骤');
    }
    
    // 3. 执行种子数据
    const seedsDir = path.join(__dirname, 'seeds');
    if (fs.existsSync(seedsDir)) {
      const seedFiles = fs
        .readdirSync(seedsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`🌱 找到 ${seedFiles.length} 个种子文件`);
      
      for (const file of seedFiles) {
        const filePath = path.join(seedsDir, file);
        await executeSQLFile(filePath, adminPool);
      }
    } else {
      console.log('⚠️ 种子目录不存在，跳过种子步骤');
    }
    
    console.log('🎉 数据库初始化完成！');
    
    // 4. 验证初始化结果
    await validateInitialization();
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

/**
 * 验证数据库初始化结果
 */
async function validateInitialization() {
  try {
    console.log('🔍 验证数据库初始化结果...');
    
    const checks = [
      { query: 'SELECT COUNT(*) as count FROM users', name: 'users' },
      { query: 'SELECT COUNT(*) as count FROM routes', name: 'routes' },
      { query: 'SELECT COUNT(*) as count FROM achievements', name: 'achievements' },
      { query: 'SELECT COUNT(*) as count FROM badges', name: 'badges' },
      { query: 'SELECT COUNT(*) as count FROM user_routes', name: 'user_routes' }
    ];
    
    for (const check of checks) {
      const result = await adminPool.query(check.query);
      const count = parseInt(result.rows[0].count);
      console.log(`📊 ${check.name} 表: ${count} 条记录`);
    }
    
    console.log('✅ 数据库验证完成');
    
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🏔️ 香港远足路线数据库管理工具

使用方法:
  node init-database.js [command]

命令:
  init        初始化数据库（执行迁移和种子数据）
  reset       重置数据库（删除所有数据并重新初始化）
  check       检查数据库连接状态
  help        显示此帮助信息

环境变量:
  DB_HOST=localhost      数据库主机
  DB_PORT=5432          数据库端口
  DB_NAME=hiking_hong_kong  数据库名称
  DB_USER=postgres      数据库用户名
  DB_PASSWORD=password  数据库密码

示例:
  node init-database.js init      # 初始化数据库
  node init-database.js check     # 检查连接状态
  node init-database.js reset     # 重置数据库
  `);
}

/**
 * 检查数据库连接
 */
async function checkConnection() {
  try {
    console.log('🔍 检查数据库连接状态...');
    
    const result = await adminPool.query('SELECT NOW() as now, version() as version');
    
    console.log('✅ 数据库连接正常');
    console.log(`📅 当前时间: ${result.rows[0].now}`);
    console.log(`🗄️ PostgreSQL版本: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    // 检查表是否存在
    const tables = ['users', 'routes', 'achievements', 'badges', 'user_routes'];
    for (const table of tables) {
      const check = await adminPool.query(
        "SELECT to_regclass('public." + table + "') as exists"
      );
      const exists = check.rows[0].exists !== null;
      console.log(`📋 ${table} 表: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    }
    
  } catch (error) {
    console.error('❌ 数据库连接检查失败:', error.message);
    process.exit(1);
  }
}

/**
 * 重置数据库
 */
async function resetDatabase() {
  try {
    console.log('⚠️  即将重置数据库，这将删除所有数据！');
    console.log('按 Ctrl+C 取消，或继续执行...');
    
    // 等待5秒
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔄 开始重置数据库...');
    
    // 删除所有表
    const tables = [
      'user_badges', 'badges', 'user_achievements', 'achievements', 
      'user_routes', 'routes', 'users'
    ];
    
    for (const table of tables) {
      await adminPool.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
      console.log(`🗑️  删除表: ${table}`);
    }
    
    // 重新初始化
    await initDatabase();
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', error.message);
    process.exit(1);
  }
}

// 命令行接口
const command = process.argv[2] || 'help';

switch (command) {
  case 'init':
    initDatabase()
      .then(() => {
        console.log('✨ 数据库初始化完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 初始化失败:', error.message);
        process.exit(1);
      });
    break;
    
  case 'check':
    checkConnection()
      .then(() => process.exit(0))
      .catch((error) => process.exit(1));
    break;
    
  case 'reset':
    resetDatabase()
      .then(() => {
        console.log('✨ 数据库重置完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 重置失败:', error.message);
        process.exit(1);
      });
    break;
    
  case 'help':
  default:
    showHelp();
    process.exit(0);
    break;
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭数据库连接...');
  await adminPool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭数据库连接...');
  await adminPool.end();
  process.exit(0);
});