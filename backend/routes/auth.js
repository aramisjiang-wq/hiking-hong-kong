const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 速率限制配置
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP在15分钟内最多5次请求
  message: {
    error: 'Too Many Requests',
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 限制每个IP在1小时内最多10次注册请求（开发阶段增加限制）
  message: {
    error: 'Too Many Registration Attempts',
    message: '注册尝试次数过多，请1小时后再试'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 限制每个IP在15分钟内最多10次登录请求
  message: {
    error: 'Too Many Login Attempts',
    message: '登录尝试次数过多，请15分钟后再试'
  }
});

// 验证规则
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码长度至少需要8个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('个人简介不能超过500个字符'),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('位置信息不能超过100个字符'),
  
  body('hiking_experience')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('徒步经验水平无效')
];

const loginValidation = [
  body('username_or_email')
    .notEmpty()
    .withMessage('用户名或邮箱不能为空'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

const usernameParamValidation = [
  param('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线')
];

const emailParamValidation = [
  param('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail()
];

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', registerLimiter, registerValidation, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', loginLimiter, loginValidation, authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新令牌
 * @access  Private
 */
router.post('/refresh', authenticateToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/auth/check/username/:username
 * @desc    检查用户名是否可用
 * @access  Public
 */
router.get('/check/username/:username', usernameParamValidation, authController.checkUsername);

/**
 * @route   GET /api/auth/check/email/:email
 * @desc    检查邮箱是否可用
 * @access  Public
 */
router.get('/check/email/:email', emailParamValidation, authController.checkEmail);

module.exports = router;