const { validationResult } = require('express-validator');
const Route = require('../models/Route');
const { authenticateToken, optionalAuth, checkRole } = require('../middleware/auth');

/**
 * 获取所有路线（支持分页和筛选）
 */
const getRoutes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      difficulty,
      region,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      difficulty,
      region,
      search,
      sortBy,
      sortOrder
    };

    const result = await Route.getAll(options);

    res.json({
      routes: result.routes,
      pagination: result.pagination,
      filters: {
        difficulty,
        region,
        search
      },
      sort: {
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('获取路线列表失败:', error);
    res.status(500).json({
      error: 'Failed to Get Routes',
      message: '获取路线列表失败'
    });
  }
};

/**
 * 根据ID获取单个路线
 */
const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const route = await Route.findById(parseInt(id));
    
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    res.json({
      route
    });

  } catch (error) {
    console.error('获取路线详情失败:', error);
    res.status(500).json({
      error: 'Failed to Get Route',
      message: '获取路线详情失败'
    });
  }
};

/**
 * 根据名称搜索路线
 */
const searchRoutes = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search Query Required',
        message: '请提供搜索关键词'
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: query.trim()
    };

    const result = await Route.searchRoutes(options);

    res.json({
      routes: result.routes,
      pagination: result.pagination,
      searchQuery: query
    });

  } catch (error) {
    console.error('搜索路线失败:', error);
    res.status(500).json({
      error: 'Search Failed',
      message: '搜索路线失败'
    });
  }
};

/**
 * 获取推荐路线
 */
const getRecommendedRoutes = async (req, res) => {
  try {
    const { userId, limit = 5 } = req.query;
    
    const options = {
      limit: parseInt(limit),
      userId
    };

    const routes = await Route.getRecommended(options);

    res.json({
      routes,
      count: routes.length
    });

  } catch (error) {
    console.error('获取推荐路线失败:', error);
    res.status(500).json({
      error: 'Failed to Get Recommended Routes',
      message: '获取推荐路线失败'
    });
  }
};

/**
 * 获取热门路线
 */
const getPopularRoutes = async (req, res) => {
  try {
    const { limit = 5, timeRange = 'all' } = req.query;
    
    const options = {
      limit: parseInt(limit),
      timeRange
    };

    const routes = await Route.getPopular(options);

    res.json({
      routes,
      count: routes.length,
      timeRange
    });

  } catch (error) {
    console.error('获取热门路线失败:', error);
    res.status(500).json({
      error: 'Failed to Get Popular Routes',
      message: '获取热门路线失败'
    });
  }
};

/**
 * 获取用户完成的路线
 */
const getUserCompletedRoutes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // 检查权限：只能查看自己的数据，或管理员可以查看任何用户的数据
    if (parseInt(userId) !== req.user?.userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied',
        message: '无权访问此用户数据'
      });
    }

    const options = {
      userId: parseInt(userId),
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await Route.getUserCompletedRoutes(options);

    res.json({
      routes: result.routes,
      pagination: result.pagination,
      userId: parseInt(userId)
    });

  } catch (error) {
    console.error('获取用户完成路线失败:', error);
    res.status(500).json({
      error: 'Failed to Get User Completed Routes',
      message: '获取用户完成路线失败'
    });
  }
};

/**
 * 标记路线为已完成
 */
const markRouteAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { completion_data, notes, rating } = req.body;
    
    const routeId = parseInt(id);
    const userId = req.user.userId;

    // 验证评分范围
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Invalid Rating',
        message: '评分必须在1-5之间'
      });
    }

    // 检查路线是否存在
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    // 检查是否已经完成过
    const isCompleted = await Route.isUserCompletedRoute(userId, routeId);
    if (isCompleted) {
      return res.status(409).json({
        error: 'Already Completed',
        message: '您已经完成过这条路线'
      });
    }

    // 标记为已完成
    await Route.markAsCompleted(userId, routeId, {
      completion_data,
      notes,
      rating
    });

    // 获取更新后的统计信息
    const updatedStats = await Route.getRouteStats(routeId);

    res.json({
      message: '路线完成状态更新成功！恭喜完成这条路线！',
      routeId,
      stats: updatedStats
    });

  } catch (error) {
    console.error('标记路线完成失败:', error);
    
    if (error.message.includes('已标记完成')) {
      return res.status(409).json({
        error: 'Already Completed',
        message: '您已经完成过这条路线'
      });
    }

    res.status(500).json({
      error: 'Failed to Mark Route as Completed',
      message: '标记路线完成失败'
    });
  }
};

/**
 * 取消路线完成状态
 */
const unmarkRouteAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    
    const routeId = parseInt(id);
    const userId = req.user.userId;

    // 检查路线是否存在
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    // 检查是否真的完成了
    const isCompleted = await Route.isUserCompletedRoute(userId, routeId);
    if (!isCompleted) {
      return res.status(404).json({
        error: 'Not Completed',
        message: '您还没有完成过这条路线'
      });
    }

    // 取消完成状态
    await Route.unmarkAsCompleted(userId, routeId);

    // 获取更新后的统计信息
    const updatedStats = await Route.getRouteStats(routeId);

    res.json({
      message: '路线完成状态已取消',
      routeId,
      stats: updatedStats
    });

  } catch (error) {
    console.error('取消路线完成状态失败:', error);
    res.status(500).json({
      error: 'Failed to Unmark Route',
      message: '取消路线完成状态失败'
    });
  }
};

/**
 * 检查用户是否已完成某条路线
 */
const checkUserCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const routeId = parseInt(id);
    const targetUserId = userId ? parseInt(userId) : req.user.userId;

    // 检查权限
    if (targetUserId !== req.user?.userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied',
        message: '无权检查此用户的完成状态'
      });
    }

    // 检查路线是否存在
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    const isCompleted = await Route.isUserCompletedRoute(targetUserId, routeId);

    res.json({
      routeId,
      userId: targetUserId,
      completed: isCompleted
    });

  } catch (error) {
    console.error('检查用户完成状态失败:', error);
    res.status(500).json({
      error: 'Failed to Check Completion Status',
      message: '检查用户完成状态失败'
    });
  }
};

/**
 * 获取路线统计信息
 */
const getRouteStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const routeId = parseInt(id);

    // 检查路线是否存在
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    const stats = await Route.getRouteStats(routeId);

    res.json({
      routeId,
      stats
    });

  } catch (error) {
    console.error('获取路线统计失败:', error);
    res.status(500).json({
      error: 'Failed to Get Route Stats',
      message: '获取路线统计失败'
    });
  }
};

/**
 * 获取路线评论
 */
const getRouteComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const routeId = parseInt(id);

    // 检查路线是否存在
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        error: 'Route Not Found',
        message: '路线不存在'
      });
    }

    const options = {
      routeId,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await Route.getRouteComments(options);

    res.json({
      routeId,
      comments: result.comments,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('获取路线评论失败:', error);
    res.status(500).json({
      error: 'Failed to Get Route Comments',
      message: '获取路线评论失败'
    });
  }
};

module.exports = {
  getRoutes,
  getRouteById,
  searchRoutes,
  getRecommendedRoutes,
  getPopularRoutes,
  getUserCompletedRoutes,
  markRouteAsCompleted,
  unmarkRouteAsCompleted,
  checkUserCompleted,
  getRouteStats,
  getRouteComments
};