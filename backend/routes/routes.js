const express = require('express');
const { query, param, body } = require('express-validator');
const routeController = require('../controllers/routeController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 查询验证规则
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('difficulty').optional().isIn(['easy', 'moderate', 'hard', 'expert']).withMessage('难度级别无效'),
  query('region').optional().isIn(['hong_kong_island', 'kowloon', 'new_territories', 'outlying_islands']).withMessage('地区无效'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('搜索关键词长度必须在1-100个字符之间'),
  query('sortBy').optional().isIn(['name', 'difficulty', 'completion_count', 'average_rating', 'created_at']).withMessage('排序字段无效'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('排序方向无效')
];

// 参数验证规则
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('路线ID必须为正整数')
];

const userIdParamValidation = [
  param('userId').isInt({ min: 1 }).withMessage('用户ID必须为正整数')
];

const searchQueryValidation = [
  query('query').notEmpty().withMessage('搜索关键词不能为空')
];

// 完成路线数据验证
const completionDataValidation = [
  body('completion_data').optional().isObject().withMessage('完成数据必须为对象'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('笔记不能超过1000个字符'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('评分必须在1-5之间')
];

/**
 * @route   GET /api/routes
 * @desc    获取所有路线（支持分页和筛选）
 * @access  Public
 */
router.get('/', queryValidation, routeController.getRoutes);

/**
 * @route   GET /api/routes/:id
 * @desc    根据ID获取单个路线
 * @access  Public
 */
router.get('/:id', idParamValidation, routeController.getRouteById);

/**
 * @route   GET /api/routes/search
 * @desc    根据名称搜索路线
 * @access  Public
 */
router.get('/search', searchQueryValidation, queryValidation, routeController.searchRoutes);

/**
 * @route   GET /api/routes/recommended
 * @desc    获取推荐路线
 * @access  Public
 */
router.get('/recommended', optionalAuth, routeController.getRecommendedRoutes);

/**
 * @route   GET /api/routes/popular
 * @desc    获取热门路线
 * @access  Public
 */
router.get('/popular', routeController.getPopularRoutes);

/**
 * @route   GET /api/routes/user/:userId/completed
 * @desc    获取用户完成的路线
 * @access  Private
 */
router.get('/user/:userId/completed', authenticateToken, userIdParamValidation, queryValidation, routeController.getUserCompletedRoutes);

/**
 * @route   POST /api/routes/:id/complete
 * @desc    标记路线为已完成
 * @access  Private
 */
router.post('/:id/complete', authenticateToken, idParamValidation, completionDataValidation, routeController.markRouteAsCompleted);

/**
 * @route   DELETE /api/routes/:id/complete
 * @desc    取消路线完成状态
 * @access  Private
 */
router.delete('/:id/complete', authenticateToken, idParamValidation, routeController.unmarkRouteAsCompleted);

/**
 * @route   GET /api/routes/:id/check-completion
 * @desc    检查用户是否已完成某条路线
 * @access  Private
 */
router.get('/:id/check-completion', authenticateToken, idParamValidation, routeController.checkUserCompleted);

/**
 * @route   GET /api/routes/:id/stats
 * @desc    获取路线统计信息
 * @access  Public
 */
router.get('/:id/stats', idParamValidation, routeController.getRouteStats);

/**
 * @route   GET /api/routes/:id/comments
 * @desc    获取路线评论
 * @access  Public
 */
router.get('/:id/comments', idParamValidation, queryValidation, routeController.getRouteComments);

module.exports = router;