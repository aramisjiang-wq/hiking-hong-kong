/**
 * 徒步路线显示修复脚本
 * 专门解决路线列表不显示的问题
 */

(function() {
    'use strict';

    console.log('🔧 路线显示修复脚本启动');

    // 确保 DOM 就绪
    function waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // 等待数据加载
    function waitForData() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkData = () => {
                attempts++;
                
                if (window.hikingRoutes && Array.isArray(window.hikingRoutes) && window.hikingRoutes.length > 0) {
                    console.log('✅ 路线数据已加载，共', window.hikingRoutes.length, '条');
                    resolve(window.hikingRoutes);
                    return;
                }
                
                // 尝试动态加载数据
                if (attempts === 10 && !window.hikingRoutes) {
                    console.log('🔄 尝试动态加载路线数据...');
                    loadRoutesScript();
                }
                
                if (attempts >= maxAttempts) {
                    console.error('❌ 路线数据加载超时');
                    reject(new Error('路线数据加载失败'));
                    return;
                }
                
                setTimeout(checkData, 200);
            };
            
            checkData();
        });
    }

    // 动态加载路线数据脚本
    function loadRoutesScript() {
        const script = document.createElement('script');
        script.src = 'data/routes.js';
        script.onload = () => {
            console.log('✅ 路线数据脚本加载成功');
        };
        script.onerror = () => {
            console.error('❌ 路线数据脚本加载失败');
        };
        document.head.appendChild(script);
    }

    // 强制渲染路线列表
    function renderRoutesForce(routes) {
        console.log('🎨 开始强制渲染路线列表...');
        
        const routesList = document.getElementById('routesList');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        if (!routesList) {
            console.error('❌ 找不到 routesList 容器');
            return false;
        }

        // 隐藏加载状态
        if (loadingState) {
            loadingState.style.display = 'none';
        }

        // 清空现有内容
        routesList.innerHTML = '';

        if (!routes || routes.length === 0) {
            console.log('⚠️ 没有路线数据可渲染');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            routesList.style.display = 'none';
            return true;
        }

        // 隐藏空状态
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        routesList.style.display = 'flex';

        console.log('📋 开始创建路线卡片，共', routes.length, '条');

        // 逐个创建路线卡片
        routes.forEach((route, index) => {
            const routeCard = createRouteCard(route, index);
            routesList.appendChild(routeCard);
        });

        console.log('✅ 路线列表渲染完成，共', routes.length, '条路线');
        return true;
    }

    // 创建单个路线卡片
    function createRouteCard(route, index) {
        const card = document.createElement('div');
        card.className = 'route-item';
        card.dataset.routeId = route.id;
        
        // 获取难度等级和样式
        const difficulty = route.difficulty || '简单';
        const difficultyClass = getDifficultyClass(difficulty);
        const difficultyColor = getDifficultyColor(difficulty);

        // 生成评分
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5星
        
        card.innerHTML = `
            <div class="route-header">
                <h3 class="route-title">
                    <span class="route-number">${route.id.toString().padStart(2, '0')}.</span>
                    ${route.name || '未命名路线'}
                </h3>
                <div class="route-rating">
                    ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>
            </div>
            <div class="route-meta">
                <div class="route-meta-item">
                    <span class="difficulty-tag ${difficultyClass}" style="background-color: ${difficultyColor};">
                        ${difficulty}
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
            <div class="route-description">
                ${route.features ? route.features.substring(0, 100) + '...' : '路线特色信息待补充'}
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => {
            console.log('🎯 点击了路线:', route.name, '(ID:', route.id, ')');
            handleRouteClick(route);
        });

        // 添加进入动画
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);

        return card;
    }

    // 处理路线点击事件
    function handleRouteClick(route) {
        // 移除其他卡片的激活状态
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });

        // 添加当前卡片的激活状态
        const currentCard = document.querySelector(`[data-route-id="${route.id}"]`);
        if (currentCard) {
            currentCard.classList.add('active');
        }

        // 显示路线详情（如果需要）
        console.log('📍 显示路线详情:', route.name);
        
        // 可以在这里添加地图定位、侧边栏显示等逻辑
        if (window.hikingApp && window.hikingApp.routeManager) {
            window.hikingApp.routeManager.selectRoute(route.id);
        }
    }

    // 获取难度等级CSS类名
    function getDifficultyClass(difficulty) {
        switch (difficulty) {
            case '困难': return 'hard';
            case '中等': return 'medium';
            default: return 'easy';
        }
    }

    // 获取难度等级颜色
    function getDifficultyColor(difficulty) {
        switch (difficulty) {
            case '困难': return '#dc3545';
            case '中等': return '#ffc107';
            default: return '#28a745';
        }
    }

    // 主修复函数
    async function fixRoutesDisplay() {
        try {
            console.log('🔧 开始修复路线显示...');
            
            // 等待 DOM 和数据就绪
            await waitForDOM();
            await waitForData();
            
            // 获取路线数据
            const routes = window.hikingRoutes;
            if (!routes || routes.length === 0) {
                throw new Error('没有可用的路线数据');
            }

            // 强制渲染路线列表
            const success = renderRoutesForce(routes);
            
            if (success) {
                console.log('✅ 路线显示修复完成');
                
                // 添加全局函数，方便调试
                window.forceRenderRoutes = () => renderRoutesForce(window.hikingRoutes);
                window.debugRoutes = () => {
                    console.log('🔍 路线数据调试信息:');
                    console.log('- 路线总数:', window.hikingRoutes.length);
                    console.log('- 前3条路线:', window.hikingRoutes.slice(0, 3));
                    console.log('- routesList元素:', document.getElementById('routesList'));
                    console.log('- 路线卡片数量:', document.querySelectorAll('.route-item').length);
                };
                
                return true;
            } else {
                throw new Error('路线渲染失败');
            }
            
        } catch (error) {
            console.error('❌ 路线显示修复失败:', error);
            return false;
        }
    }

    // 自动启动修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixRoutesDisplay);
    } else {
        // 如果 DOM 已经就绪，立即执行
        setTimeout(fixRoutesDisplay, 500);
    }

    // 暴露全局修复函数
    window.fixRoutesDisplay = fixRoutesDisplay;
    
    console.log('🛠️ 路线显示修复脚本已准备就绪');

})();