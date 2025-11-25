const { pool } = require('../config/database');

class Route {
  constructor(routeData) {
    this.id = routeData.id;
    this.name = routeData.name;
    this.description = routeData.description;
    this.difficulty = routeData.difficulty;
    this.distance_km = routeData.distance_km;
    this.estimated_time = routeData.estimated_time;
    this.start_location = routeData.start_location;
    this.end_location = routeData.end_location;
    this.elevation_gain = routeData.elevation_gain;
    this.route_type = routeData.route_type || 'loop'; // loop, point_to_point, out_and_back
    this.accessibility = routeData.accessibility || 'moderate';
    this.tags = routeData.tags;
    this.coordinates = routeData.coordinates;
    this.waypoints = routeData.waypoints;
    this.seasonal_info = routeData.seasonal_info;
    this.equipment_needed = routeData.equipment_needed;
    this.safety_tips = routeData.safety_tips;
    this.transportation = routeData.transportation;
    this.images = routeData.images;
    this.avg_rating = routeData.avg_rating || 0;
    this.review_count = routeData.review_count || 0;
    this.completion_count = routeData.completion_count || 0;
    this.created_at = routeData.created_at;
    this.updated_at = routeData.updated_at;
  }

  // 获取所有路线（支持分页和筛选）
  static async findAll(filters = {}, limit = 20, offset = 0) {
    try {
      let query = 'SELECT * FROM routes WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) FROM routes WHERE 1=1';
      const values = [];
      let paramCount = 1;

      // 构建筛选条件
      if (filters.difficulty) {
        query += ` AND difficulty = $${paramCount}`;
        countQuery += ` AND difficulty = $${paramCount}`;
        values.push(filters.difficulty);
        paramCount++;
      }

      if (filters.distance_min || filters.distance_max) {
        if (filters.distance_min) {
          query += ` AND distance_km >= $${paramCount}`;
          countQuery += ` AND distance_km >= $${paramCount}`;
          values.push(filters.distance_min);
          paramCount++;
        }
        if (filters.distance_max) {
          query += ` AND distance_km <= $${paramCount}`;
          countQuery += ` AND distance_km <= $${paramCount}`;
          values.push(filters.distance_max);
          paramCount++;
        }
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount + 1} OR tags ILIKE $${paramCount + 2})`;
        countQuery += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount + 1} OR tags ILIKE $${paramCount + 2})`;
        values.push(searchTerm, searchTerm, searchTerm);
        paramCount += 3;
      }

      if (filters.tags) {
        const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        query += ` AND tags && $${paramCount}`;
        countQuery += ` AND tags && $${paramCount}`;
        values.push(tagsArray);
        paramCount++;
      }

      // 排序
      const sortBy = filters.sortBy || 'name';
      const sortOrder = filters.sortOrder || 'ASC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // 分页
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);
      paramCount += 2;

      // 执行查询
      const [routesResult, countResult] = await Promise.all([
        pool.query(query, values),
        pool.query(countQuery, values.slice(0, -2)) // 移除limit和offset参数
      ]);

      const routes = routesResult.rows.map(row => new Route(row));
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        routes,
        pagination: {
          total: totalCount,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(totalCount / limit),
          limit,
          hasMore: offset + routes.length < totalCount
        }
      };

    } catch (error) {
      console.error('获取路线列表失败:', error);
      throw error;
    }
  }

  // 根据ID查找路线
  static async findById(id) {
    try {
      const query = 'SELECT * FROM routes WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] ? new Route(result.rows[0]) : null;
    } catch (error) {
      console.error('查找路线失败:', error);
      throw error;
    }
  }

  // 根据名称查找路线
  static async findByName(name) {
    try {
      const query = 'SELECT * FROM routes WHERE name ILIKE $1';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows.length > 0 ? result.rows.map(row => new Route(row)) : [];
    } catch (error) {
      console.error('查找路线失败:', error);
      throw error;
    }
  }

  // 获取用户完成的路线
  static async getUserCompletedRoutes(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT r.*, ur.completed_at, ur.rating, ur.review, ur.duration_minutes, ur.photos
        FROM routes r
        JOIN user_routes ur ON r.id = ur.route_id
        WHERE ur.user_id = $1 AND ur.status = 'completed'
        ORDER BY ur.completed_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows.map(row => ({
        ...new Route(row),
        completed_at: row.completed_at,
        user_rating: row.rating,
        user_review: row.review,
        duration_minutes: row.duration_minutes,
        photos: row.photos
      }));
    } catch (error) {
      console.error('获取用户完成路线失败:', error);
      throw error;
    }
  }

  // 获取所有路线（支持分页和筛选）- 控制器调用版本
  static async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        difficulty,
        region,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      const offset = (page - 1) * limit;
      const filters = {};

      if (difficulty) filters.difficulty = difficulty;
      if (search) filters.search = search;
      
      // 模拟地区筛选（假设数据库中有region字段）
      if (region) filters.region = region;

      const result = await this.findAll(filters, limit, offset);
      
      return {
        routes: result.routes,
        pagination: result.pagination
      };

    } catch (error) {
      console.error('获取路线列表失败:', error);
      throw error;
    }
  }

  // 搜索路线
  static async searchRoutes(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search
      } = options;

      const offset = (page - 1) * limit;
      const filters = { search };

      const result = await this.findAll(filters, limit, offset);
      
      return {
        routes: result.routes,
        pagination: result.pagination
      };

    } catch (error) {
      console.error('搜索路线失败:', error);
      throw error;
    }
  }

  // 获取推荐路线（基于用户完成的历史）
  static async getRecommended(options = {}) {
    try {
      const { userId, limit = 5 } = options;
      
      // 如果没有用户ID，返回热门路线
      if (!userId) {
        return await this.getPopularRoutes(limit);
      }

      const routes = await this.getRecommendedRoutes(userId, limit);
      return routes;

    } catch (error) {
      console.error('获取推荐路线失败:', error);
      throw error;
    }
  }

  // 获取热门路线
  static async getPopular(options = {}) {
    try {
      const { limit = 5, timeRange = 'all' } = options;
      
      const query = `
        SELECT * FROM routes 
        ORDER BY completion_count DESC, avg_rating DESC
        LIMIT $1
      `;
      const result = await pool.query(query, [limit]);
      return result.rows.map(row => new Route(row));
    } catch (error) {
      console.error('获取热门路线失败:', error);
      throw error;
    }
  }

  // 检查用户是否已完成某条路线
  static async isUserCompletedRoute(userId, routeId) {
    try {
      const query = `
        SELECT id FROM user_routes 
        WHERE user_id = $1 AND route_id = $2 AND status = 'completed'
      `;
      const result = await pool.query(query, [userId, routeId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('检查用户完成状态失败:', error);
      throw error;
    }
  }

  // 标记路线为已完成
  static async markAsCompleted(userId, routeId, completionData = {}) {
    try {
      const { completion_data = {}, notes = null, rating = null } = completionData;
      
      const query = `
        INSERT INTO user_routes (user_id, route_id, status, completion_data, review, rating, completed_at)
        VALUES ($1, $2, 'completed', $3, $4, $5, NOW())
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        userId,
        routeId,
        JSON.stringify(completion_data),
        notes,
        rating
      ]);

      if (result.rows.length === 0) {
        throw new Error('标记完成失败');
      }

      return result.rows[0];
    } catch (error) {
      console.error('标记路线完成失败:', error);
      throw error;
    }
  }

  // 取消路线完成状态
  static async unmarkAsCompleted(userId, routeId) {
    try {
      const query = `
        DELETE FROM user_routes 
        WHERE user_id = $1 AND route_id = $2 AND status = 'completed'
        RETURNING id
      `;
      
      const result = await pool.query(query, [userId, routeId]);
      
      if (result.rows.length === 0) {
        throw new Error('未找到完成记录');
      }

      return result.rows[0];
    } catch (error) {
      console.error('取消路线完成状态失败:', error);
      throw error;
    }
  }

  // 获取用户完成的路线（控制器版本，支持分页）
  static async getUserCompletedRoutes(options = {}) {
    try {
      const { userId, page = 1, limit = 10 } = options;
      
      const offset = (page - 1) * limit;
      const routes = await this.getUserCompletedRoutes(userId, limit, offset);
      
      return {
        routes,
        pagination: {
          total: routes.length, // 简化处理，实际应该获取总数
          page,
          pages: Math.ceil(routes.length / limit),
          limit
        }
      };

    } catch (error) {
      console.error('获取用户完成路线失败:', error);
      throw error;
    }
  }

  // 获取路线统计信息
  static async getRouteStats(routeId) {
    try {
      const query = `
        SELECT 
          avg_rating,
          review_count,
          completion_count
        FROM routes 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [routeId]);
      
      if (result.rows.length === 0) {
        throw new Error('路线不存在');
      }

      return result.rows[0];
    } catch (error) {
      console.error('获取路线统计失败:', error);
      throw error;
    }
  }

  // 获取路线评论
  static async getRouteComments(options = {}) {
    try {
      const { routeId, page = 1, limit = 10 } = options;
      
      const offset = (page - 1) * limit;
      const route = new Route({ id: routeId });
      const comments = await route.getReviews(limit, offset);
      
      return {
        comments,
        pagination: {
          total: comments.length, // 简化处理
          page,
          pages: Math.ceil(comments.length / limit),
          limit
        }
      };

    } catch (error) {
      console.error('获取路线评论失败:', error);
      throw error;
    }
  }

  // 更新路线统计信息
  async updateStats() {
    try {
      // 计算平均评分和评论数
      const statsQuery = `
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(*) as review_count
        FROM user_routes 
        WHERE route_id = $1 AND rating IS NOT NULL
      `;
      
      const completionQuery = `
        SELECT COUNT(*) as completion_count
        FROM user_routes 
        WHERE route_id = $1 AND status = 'completed'
      `;

      const [statsResult, completionResult] = await Promise.all([
        pool.query(statsQuery, [this.id]),
        pool.query(completionQuery, [this.id])
      ]);

      const avgRating = statsResult.rows[0].avg_rating || 0;
      const reviewCount = parseInt(statsResult.rows[0].review_count) || 0;
      const completionCount = parseInt(completionResult.rows[0].completion_count) || 0;

      // 更新路线数据
      const updateQuery = `
        UPDATE routes 
        SET avg_rating = $1, review_count = $2, completion_count = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [avgRating, reviewCount, completionCount, this.id]);
      const updatedRoute = new Route(result.rows[0]);
      
      // 更新当前实例
      Object.assign(this, updatedRoute);
      
      return this;

    } catch (error) {
      console.error('更新路线统计失败:', error);
      throw error;
    }
  }

  // 获取路线评论
  async getReviews(limit = 20, offset = 0) {
    try {
      const query = `
        SELECT ur.*, u.username, u.avatar_url
        FROM user_routes ur
        JOIN users u ON ur.user_id = u.id
        WHERE ur.route_id = $1 AND ur.review IS NOT NULL
        ORDER BY ur.completed_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [this.id, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('获取路线评论失败:', error);
      throw error;
    }
  }

  // 转换为JSON格式
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      difficulty: this.difficulty,
      distance_km: this.distance_km,
      estimated_time: this.estimated_time,
      start_location: this.start_location,
      end_location: this.end_location,
      elevation_gain: this.elevation_gain,
      route_type: this.route_type,
      accessibility: this.accessibility,
      tags: this.tags,
      coordinates: this.coordinates,
      waypoints: this.waypoints,
      seasonal_info: this.seasonal_info,
      equipment_needed: this.equipment_needed,
      safety_tips: this.safety_tips,
      transportation: this.transportation,
      images: this.images,
      avg_rating: this.avg_rating,
      review_count: this.review_count,
      completion_count: this.completion_count,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Route;