// 香港徒步路线应用 - 修复初始化脚本
// 专门解决路线未显示和地图功能损坏的问题

(function() {
    'use strict';
    
    console.log('🔧 香港徒步路线 - 初始化修复脚本已加载');
    
    // 全局错误处理
    window.addEventListener('error', function(e) {
        console.error('❌ 应用错误:', e.error);
    });
    
    // 应用修复管理器
    class AppFixManager {
        constructor() {
            this.attempts = 0;
            this.maxAttempts = 10;
            this.init();
        }
        
        async init() {
            console.log('🚀 开始应用修复初始化...');
            
            // 等待DOM准备就绪
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.startApp();
                });
            } else {
                this.startApp();
            }
        }
        
        startApp() {
            console.log('📱 DOM已准备，开始启动应用...');
            
            try {
                // 检查必需的数据文件
                this.checkDataFiles()
                    .then(() => this.checkDOMElements())
                    .then(() => this.initializeApp())
                    .catch(error => {
                        console.error('❌ 初始化失败:', error);
                        this.handleInitializationError(error);
                    });
            } catch (error) {
                console.error('❌ 应用启动失败:', error);
                this.handleInitializationError(error);
            }
        }
        
        async checkDataFiles() {
            console.log('📊 检查数据文件...');
            
            return new Promise((resolve, reject) => {
                // 检查routes.js是否加载
                if (typeof window.hikingRoutes === 'undefined') {
                    console.warn('⚠️  routes.js未加载，尝试动态加载...');
                    
                    const script = document.createElement('script');
                    script.src = 'data/routes.js';
                    script.onload = () => {
                        console.log('✅ routes.js动态加载成功');
                        resolve();
                    };
                    script.onerror = () => {
                        console.error('❌ routes.js动态加载失败');
                        reject(new Error('路线数据文件加载失败'));
                    };
                    document.head.appendChild(script);
                } else {
                    console.log('✅ routes.js已加载，路线数量:', window.hikingRoutes.length);
                    resolve();
                }
            });
        }
        
        checkDOMElements() {
            console.log('🔍 检查DOM元素...');
            
            const requiredElements = [
                { id: 'map', name: '地图容器' },
                { id: 'routesList', name: '路线列表' },
                { id: 'sidebar', name: '侧边栏' },
                { id: 'searchInput', name: '搜索输入框' },
                { id: 'filterTags', name: '筛选标签' }
            ];
            
            const missingElements = [];
            
            requiredElements.forEach(el => {
                const element = document.getElementById(el.id);
                if (!element) {
                    missingElements.push(el.name);
                    console.error(`❌ 缺少元素: ${el.name} (${el.id})`);
                } else {
                    console.log(`✅ ${el.name} 存在`);
                }
            });
            
            if (missingElements.length > 0) {
                throw new Error(`缺少必需DOM元素: ${missingElements.join(', ')}`);
            }
            
            return Promise.resolve();
        }
        
        initializeApp() {
            console.log('🎯 初始化应用...');
            
            try {
                // 确保全局对象存在
                if (typeof AppState === 'undefined') {
                    throw new Error('AppState对象未定义');
                }
                
                // 加载路线数据
                if (window.hikingRoutes && window.hikingRoutes.length > 0) {
                    AppState.routes = window.hikingRoutes;
                    AppState.filteredRoutes = [...AppState.routes];
                    console.log('✅ 路线数据加载成功，数量:', AppState.routes.length);
                } else {
                    throw new Error('无法获取路线数据');
                }
                
                // 创建应用实例
                if (typeof HikingApp !== 'undefined') {
                    window.hikingApp = new HikingApp();
                    console.log('✅ HikingApp创建成功');
                } else {
                    throw new Error('HikingApp类未定义');
                }
                
                // 手动触发路线渲染（确保路线列表显示）
                setTimeout(() => {
                    this.forceRenderRoutes();
                }, 1000);
                
            } catch (error) {
                console.error('❌ 应用初始化失败:', error);
                throw error;
            }
        }
        
        forceRenderRoutes() {
            console.log('🎨 强制渲染路线列表...');
            
            try {
                const routesList = document.getElementById('routesList');
                if (!routesList) {
                    console.error('❌ 无法找到routesList元素');
                    return;
                }
                
                if (typeof AppState === 'undefined' || !AppState.routes) {
                    console.error('❌ AppState或路线数据未定义');
                    return;
                }
                
                // 清空现有内容
                routesList.innerHTML = '';
                
                // 创建路线项
                AppState.routes.forEach((route, index) => {
                    const routeItem = this.createRouteItem(route);
                    routeItem.style.animationDelay = `${index * 0.05}s`;
                    routeItem.classList.add('fade-in');
                    routesList.appendChild(routeItem);
                });
                
                console.log('✅ 路线列表渲染完成，数量:', AppState.routes.length);
                
                // 显示搜索统计
                this.updateSearchStats();
                
            } catch (error) {
                console.error('❌ 路线渲染失败:', error);
            }
        }
        
        createRouteItem(route) {
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            routeItem.dataset.routeId = route.id;
            routeItem.dataset.difficulty = route.difficulty || '简单';
            
            const rating = Math.floor(Math.random() * 2) + 4; // 4-5星
            const difficulty = this.getDifficulty(route);
            
            // 根据难度等级设置CSS类名
            let difficultyClass = 'easy';
            if (difficulty.level === '中等') difficultyClass = 'medium';
            if (difficulty.level === '困难') difficultyClass = 'hard';
            
            routeItem.innerHTML = `
                <div class="route-header">
                    <h3 class="route-title"><span class="route-number">${route.id.toString().padStart(2, '0')}.</span> ${route.name}</h3>
                    <div class="route-rating">
                        ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                    </div>
                </div>
                <div class="route-meta">
                    <div class="route-meta-item">
                        <span class="difficulty-tag ${difficultyClass}" style="background-color: ${difficulty.color};">
                            ${difficulty.level}
                        </span>
                    </div>
                    <div class="route-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        ${route.location ? route.location.substring(0, 20) + '...' : '位置未知'}
                    </div>
                    <div class="route-meta-item">
                        <i class="fas fa-route"></i>
                        <span class="stat-label">距离:</span>
                        <span class="stat-value">${route.distance || 'N/A'}</span>
                    </div>
                    <div class="route-meta-item">
                        <i class="fas fa-clock"></i>
                        <span class="stat-label">时长:</span>
                        <span class="stat-value">${route.duration || 'N/A'}</span>
                    </div>
                </div>
            `;
            
            routeItem.addEventListener('click', () => {
                this.selectRoute(route.id);
            });
            
            return routeItem;
        }
        
        getDifficulty(route) {
            // 简化的难度计算
            const features = route.features || '';
            const duration = route.duration || '';
            
            if (features.includes('困难') || features.includes('挑战') || duration.includes('3小时') || duration.includes('4小时')) {
                return { level: '困难', color: '#ef4444' };
            } else if (features.includes('中等') || duration.includes('2小时') || duration.includes('2.5小时')) {
                return { level: '中等', color: '#f59e0b' };
            } else {
                return { level: '简单', color: '#10b981' };
            }
        }
        
        selectRoute(routeId) {
            console.log('📍 选择路线:', routeId);
            
            const route = AppState.routes.find(r => r.id === routeId);
            if (!route) {
                console.error('❌ 找不到路线:', routeId);
                return;
            }
            
            // 更新激活状态
            document.querySelectorAll('.route-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const selectedItem = document.querySelector(`[data-route-id="${routeId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }
            
            // 更新状态
            AppState.activeRoute = routeId;
            
            console.log('✅ 路线选择完成:', route.name);
        }
        
        updateSearchStats() {
            const totalRoutes = AppState.routes.length;
            
            // 创建或获取搜索统计元素
            let searchStats = document.querySelector('.search-stats');
            if (!searchStats) {
                searchStats = document.createElement('div');
                searchStats.className = 'search-stats';
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.parentNode) {
                    searchInput.parentNode.appendChild(searchStats);
                }
            }
            
            if (searchStats) {
                searchStats.innerHTML = `共 <span class="results-count">${totalRoutes}</span> 条路线`;
                searchStats.style.display = 'flex';
                searchStats.classList.add('visible');
            }
        }
        
        handleInitializationError(error) {
            console.error('❌ 初始化错误:', error);
            
            this.attempts++;
            
            if (this.attempts < this.maxAttempts) {
                console.log(`🔄 尝试重新初始化 (${this.attempts}/${this.maxAttempts})...`);
                setTimeout(() => {
                    this.startApp();
                }, 2000);
            } else {
                console.error('❌ 多次初始化失败，显示错误页面');
                this.showErrorPage(error);
            }
        }
        
        showErrorPage(error) {
            const routesList = document.getElementById('routesList');
            if (routesList) {
                routesList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <h3>❌ 应用加载失败</h3>
                        <p>错误信息: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0078A8; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            重新加载
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // 启动修复管理器
    window.appFixManager = new AppFixManager();
    
    console.log('✅ 香港徒步路线 - 修复初始化脚本加载完成');
    
})();