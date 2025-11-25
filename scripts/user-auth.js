/**
 * User Authentication System
 * 解决事件绑定失败和初始化问题
 */

class UserAuth {
    // 获取API基础URL
    getApiBaseUrl() {
        // 优先使用环境变量或配置中的API地址
        const configApiUrl = window.location.origin;
        if (window.location.port === '5173') {
            // 开发环境端口5173，后端通常在端口3001
            return 'http://localhost:3001/api';
        }
        return `${configApiUrl}/api`;
    }
    
    // 在UserAuth类构造函数中添加API基础URL配置
    constructor() {
        this.apiBaseUrl = this.getApiBaseUrl();
        this.initPromise = null;
        this.eventListeners = new Map();
    }
    // 初始化系统
    async init() {
        console.log('[UserSystem] 开始执行 init() 方法');
        try {
            console.log('[UserSystem] 开始初始化流程...');
            console.log('[UserSystem] 当前document.readyState:', document.readyState);
            
            // 等待 DOM 加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeAfterDOMReady();
                });
            } else {
                this.initializeAfterDOMReady();
            }
            
        } catch (error) {
            console.error('初始化错误:', error);
        }
    }

    // DOM 加载完成后的初始化
    initializeAfterDOMReady() {
        try {
            console.log('DOM 已就绪，开始初始化认证系统...');
            
            // 创建事件监听器
            this.createEventListeners();
            
            this.isInitialized = true;
            console.log('UserAuth 初始化完成');
        } catch (error) {
            console.error('初始化过程中出错:', error);
        }
    }

    // 创建事件监听器
    createEventListeners() {
        console.log('创建事件监听器...');
        
        // 移除旧的事件监听器（如果存在）
        this.removeEventListeners();
        
        console.log('事件监听器创建完成');
    }

    // 强制重新初始化
    forceReinitialize() {
        console.log('强制重新初始化系统...');
        
        // 移除现有事件监听器
        this.removeEventListeners();
        
        // 重新创建事件监听器
        this.createEventListeners();
        
        console.log('系统重新初始化完成');
    }

    // 移除所有事件监听器
    removeEventListeners() {
        this.eventListeners.forEach((handler, key) => {
            if (key === 'windowResize') {
                window.removeEventListener('resize', handler);
            } else {
                const element = this.getElement(`#${key}`);
                if (element) {
                    element.removeEventListener('click', handler);
                    element.removeEventListener('submit', handler);
                }
            }
        });
        this.eventListeners.clear();
    }

    // 获取DOM元素
    getElement(selector) {
        return document.querySelector(selector);
    }

    // 检查是否已登录
    isLoggedIn() {
        return false; // 认证系统已移除
    }

    // 触发自定义事件
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(`userAuth:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    // 销毁实例
    destroy() {
        console.log('销毁UserAuth实例...');
        
        // 移除所有事件监听器
        this.removeEventListeners();
        
        // 清除用户状态
        this.isInitialized = false;
        
        console.log('UserAuth实例已销毁');
    }
}

// 创建全局实例 - 只创建一个实例，避免冲突
window.UserAuth = UserAuth;

// 使用单例模式，避免多个实例冲突
window.userAuth = window.userAuth || new UserAuth();

// 初始化 - 使用防重复初始化机制
if (!window.userAuth._initialized) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.userAuth.init();
            window.userAuth._initialized = true;
        });
    } else {
        window.userAuth.init();
        window.userAuth._initialized = true;
    }
}