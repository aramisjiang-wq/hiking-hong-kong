const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * 用户注册
 */
const register = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { username, email, password, full_name, bio, location, hiking_experience } = req.body;

    // 检查密码强度
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password Too Weak',
        message: '密码长度至少需要8个字符'
      });
    }

    // 创建用户
    const user = await User.create({
      username,
      email,
      password,
      full_name,
      bio,
      location,
      hiking_experience
    });

    // 生成JWT令牌
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const userInfo = user.toJSON();

    res.status(201).json({
      message: '注册成功！欢迎加入香港远足大家庭！',
      user: userInfo,
      token
    });

  } catch (error) {
    console.error('用户注册失败:', error);

    // 处理特定错误
    if (error.message.includes('用户名已存在')) {
      return res.status(409).json({
        error: 'Username Already Exists',
        message: '用户名已被使用，请选择其他用户名'
      });
    }

    if (error.message.includes('邮箱已被注册')) {
      return res.status(409).json({
        error: 'Email Already Exists', 
        message: '邮箱已被注册，请使用其他邮箱或尝试登录'
      });
    }

    res.status(500).json({
      error: 'Registration Failed',
      message: '注册失败，请稍后重试'
    });
  }
};

/**
 * 用户登录
 */
const login = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { username_or_email, password } = req.body;

    // 查找用户（通过用户名或邮箱）
    let user = await User.findByUsernameOrEmail(username_or_email, username_or_email);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: '用户名或邮箱不存在'
      });
    }

    // 检查用户是否激活
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: '账户已被禁用，请联系管理员'
      });
    }

    // 验证密码
    const isPasswordValid = await user.validatePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: '密码错误'
      });
    }

    // 更新最后登录时间
    await user.updateLastLogin();

    // 生成JWT令牌
    const token = generateToken(user);

    // 获取用户统计信息
    const stats = await user.getStats();

    // 返回用户信息（不包含密码）
    const userInfo = user.toJSON();

    res.json({
      message: '登录成功！',
      user: {
        ...userInfo,
        stats
      },
      token
    });

  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({
      error: 'Login Failed',
      message: '登录失败，请稍后重试'
    });
  }
};

/**
 * 获取当前用户信息
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: '用户不存在'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: '账户已被禁用'
      });
    }

    // 获取用户统计信息
    const stats = await user.getStats();
    
    const userInfo = {
      ...user.toJSON(),
      stats
    };

    res.json({
      user: userInfo
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      error: 'Failed to Get User Info',
      message: '获取用户信息失败'
    });
  }
};

/**
 * 刷新用户令牌
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: '用户不存在'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: '账户已被禁用'
      });
    }

    // 生成新的JWT令牌
    const newToken = generateToken(user);

    res.json({
      message: '令牌刷新成功',
      token: newToken
    });

  } catch (error) {
    console.error('刷新令牌失败:', error);
    res.status(500).json({
      error: 'Token Refresh Failed',
      message: '令牌刷新失败'
    });
  }
};

/**
 * 登出
 */
const logout = async (req, res) => {
  try {
    // 在实际生产环境中，可以将令牌加入黑名单
    // 这里简化处理，实际应该使用Redis等存储令牌黑名单
    
    res.json({
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: '登出失败'
    });
  }
};

/**
 * 验证用户名是否可用
 */
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'Invalid Username',
        message: '用户名长度必须在3-20个字符之间'
      });
    }

    // 检查用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        error: 'Invalid Username Format',
        message: '用户名只能包含字母、数字和下划线'
      });
    }

    const user = await User.findByUsernameOrEmail(username, '');
    
    res.json({
      username,
      available: !user,
      message: user ? '用户名已被使用' : '用户名可用'
    });

  } catch (error) {
    console.error('检查用户名失败:', error);
    res.status(500).json({
      error: 'Check Failed',
      message: '检查用户名失败'
    });
  }
};

/**
 * 验证邮箱是否可用
 */
const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: '邮箱格式不正确'
      });
    }

    const user = await User.findByEmail(email);
    
    res.json({
      email,
      available: !user,
      message: user ? '邮箱已被注册' : '邮箱可用'
    });

  } catch (error) {
    console.error('检查邮箱失败:', error);
    res.status(500).json({
      error: 'Check Failed',
      message: '检查邮箱失败'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  checkUsername,
  checkEmail
};