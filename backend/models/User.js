const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.full_name = userData.full_name;
    this.avatar_url = userData.avatar_url;
    this.bio = userData.bio;
    this.location = userData.location;
    this.hiking_experience = userData.hiking_experience || 'beginner';
    this.role = userData.role || 'user';
    this.is_active = userData.is_active !== false;
    this.email_verified = userData.email_verified || false;
    this.last_login = userData.last_login;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // 创建新用户
  static async create(userData) {
    try {
      const { username, email, password, full_name, bio, location, hiking_experience } = userData;
      
      // 检查用户名和邮箱是否已存在
      const existingUser = await this.findByUsernameOrEmail(username, email);
      if (existingUser) {
        throw new Error(existingUser.username === username ? 
          '用户名已存在' : '邮箱已被注册');
      }

      // 加密密码
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users (username, email, password, full_name, bio, location, hiking_experience)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, username, email, full_name, bio, location, hiking_experience, role, is_active, email_verified, created_at, updated_at
      `;

      const values = [username, email, hashedPassword, full_name || '', bio || '', location || '', hiking_experience || 'beginner'];
      
      const result = await pool.query(query, values);
      return new User(result.rows[0]);

    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  // 根据用户名或邮箱查找用户
  static async findByUsernameOrEmail(username, email) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE username = $1 OR email = $2
      `;
      const result = await pool.query(query, [username, email]);
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 根据ID查找用户
  static async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 根据邮箱查找用户
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 验证密码
  async validatePassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('密码验证失败:', error);
      return false;
    }
  }

  // 更新用户信息
  async update(updateData) {
    try {
      const allowedFields = ['full_name', 'bio', 'location', 'hiking_experience', 'avatar_url'];
      const updates = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updates.length === 0) {
        throw new Error('没有有效的更新字段');
      }

      updates.push(`updated_at = NOW()`);
      values.push(this.id);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return new User(result.rows[0]);

    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  // 更新最后登录时间
  async updateLastLogin() {
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW()
        WHERE id = $1
        RETURNING last_login
      `;
      await pool.query(query, [this.id]);
      this.last_login = new Date();
    } catch (error) {
      console.error('更新登录时间失败:', error);
    }
  }

  // 获取用户统计信息
  async getStats() {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM user_routes WHERE user_id = $1) as completed_routes,
          (SELECT COUNT(*) FROM user_achievements WHERE user_id = $1) as achievements_count,
          (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as badges_count
      `;
      const result = await pool.query(query, [this.id]);
      return result.rows[0];
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return { completed_routes: 0, achievements_count: 0, badges_count: 0 };
    }
  }

  // 公开用户信息（不包含密码）
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      full_name: this.full_name,
      avatar_url: this.avatar_url,
      bio: this.bio,
      location: this.location,
      hiking_experience: this.hiking_experience,
      role: this.role,
      is_active: this.is_active,
      email_verified: this.email_verified,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // 删除用户（软删除）
  async delete() {
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(query, [this.id]);
      this.is_active = false;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }
}

module.exports = User;