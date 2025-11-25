/**
 * 徒步路线列表修复验证脚本
 */

(function() {
    'use strict';

    console.log('🔍 路线列表修复验证脚本启动');

    // 检查页面状态
    function checkPageStatus() {
        console.log('=== 页面状态检查 ===');
        
        // 检查 DOM 元素
        const routesList = document.getElementById('routesList');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        console.log('1. DOM 元素检查:');
        console.log('- routesList:', routesList ? '✅ 存在' : '❌ 不存在');
        console.log('- loadingState:', loadingState ? '✅ 存在' : '❌ 不存在');
        console.log('- emptyState:', emptyState ? '✅ 存在' : '❌ 不存在');
        
        if (routesList) {
            console.log('- routesList 样式:', window.getComputedStyle(routesList).display);
            console.log('- routesList 内容长度:', routesList.innerHTML.length);
            console.log('- 路线卡片数量:', routesList.querySelectorAll('.route-item').length);
        }
        
        return {
            routesList: routesList,
            loadingState: loadingState,
            emptyState: emptyState
        };
    }

    // 检查路线数据
    function checkRouteData() {
        console.log('\n=== 路线数据检查 ===');
        
        if (window.hikingRoutes) {
            console.log('✅ window.hikingRoutes 存在');
            console.log('- 路线数量:', window.hikingRoutes.length);
            console.log('- 第一条路线:', window.hikingRoutes[0]?.name || '未知');
            console.log('- 数据类型:', typeof window.hikingRoutes);
            console.log('- 是否为数组:', Array.isArray(window.hikingRoutes));
            
            return true;
        } else {
            console.log('❌ window.hikingRoutes 不存在');
            
            // 尝试动态加载
            console.log('🔄 尝试动态加载路线数据...');
            loadRoutesData();
            return false;
        }
    }

    // 动态加载路线数据
    function loadRoutesData() {
        const script = document.createElement('script');
        script.src = 'data/routes.js';
        script.onload = () => {
            console.log('✅ 路线数据脚本加载成功');
            console.log('重新检查数据:', window.hikingRoutes ? '成功' : '仍然失败');
            if (window.hikingRoutes) {
                console.log('- 加载后路线数量:', window.hikingRoutes.length);
            }
        };
        script.onerror = () => {
            console.error('❌ 路线数据脚本加载失败');
        };
        document.head.appendChild(script);
    }

    // 检查修复脚本状态
    function checkFixScripts() {
        console.log('\n=== 修复脚本检查 ===');
        
        console.log('- fix_app_initialization.js 加载:', typeof window.fixAppInit !== 'undefined' ? '是' : '未知');
        console.log('- routes_display_fix.js 加载:', typeof window.fixRoutesDisplay !== 'undefined' ? '是' : '未知');
        
        // 检查是否已强制渲染
        console.log('- 已渲染路线数:', document.querySelectorAll('.route-item').length);
    }

    // 执行手动修复
    function forceFix() {
        console.log('\n=== 执行手动修复 ===');
        
        if (!checkRouteData()) {
            console.log('❌ 路线数据缺失，无法修复');
            return;
        }
        
        const elements = checkPageStatus();
        
        if (!elements.routesList) {
            console.log('❌ 路线列表容器不存在，无法修复');
            return;
        }
        
        // 手动创建路线卡片
        const routes = window.hikingRoutes;
        const routesList = elements.routesList;
        
        console.log('🎨 开始手动创建路线卡片...');
        
        // 清空容器
        routesList.innerHTML = '';
        
        // 隐藏加载和空状态
        if (elements.loadingState) {
            elements.loadingState.style.display = 'none';
        }
        if (elements.emptyState) {
            elements.emptyState.style.display = 'none';
        }
        
        // 显示容器
        routesList.style.display = 'flex';
        
        // 创建路线卡片
        routes.forEach((route, index) => {
            const card = createRouteCard(route, index);
            routesList.appendChild(card);
        });
        
        console.log('✅ 手动修复完成，创建了', routes.length, '个路线卡片');
        
        return true;
    }

    // 创建路线卡片（简化版）
    function createRouteCard(route, index) {
        const card = document.createElement('div');
        card.className = 'route-item';
        card.dataset.routeId = route.id;
        
        const difficulty = route.difficulty || '简单';
        const difficultyColor = getDifficultyColor(difficulty);
        
        card.innerHTML = `
            <div class="route-header">
                <h3 class="route-title">
                    <span class="route-number">${route.id.toString().padStart(2, '0')}.</span>
                    ${route.name || '未命名路线'}
                </h3>
            </div>
            <div class="route-meta">
                <div class="route-meta-item">
                    <span class="difficulty-tag" style="background-color: ${difficultyColor}; padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px;">
                        ${difficulty}
                    </span>
                </div>
                <div class="route-meta-item">
                    ${route.location ? route.location.substring(0, 30) + '...' : '位置未知'}
                </div>
            </div>
            <div class="route-stats">
                <div class="route-stat-item">
                    <i class="fas fa-route"></i>
                    <span class="stat-label">距离:</span>
                    <span class="stat-value">${route.distance || 'N/A'}</span>
                </div>
                <div class="route-stat-item">
                    <i class="fas fa-clock"></i>
                    <span class="stat-label">时长:</span>
                    <span class="stat-value">${route.duration || 'N/A'}</span>
                </div>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', () => {
            console.log('🎯 点击路线:', route.name);
        });
        
        return card;
    }

    // 获取难度颜色
    function getDifficultyColor(difficulty) {
        switch (difficulty) {
            case '困难': return '#dc3545';
            case '中等': return '#ffc107';
            default: return '#28a745';
        }
    }

    // 显示总结信息
    function showSummary() {
        console.log('\n=== 修复总结 ===');
        
        const routeCount = document.querySelectorAll('.route-item').length;
        const routesList = document.getElementById('routesList');
        
        if (routeCount > 0) {
            console.log('✅ 修复成功！');
            console.log('- 路线卡片数量:', routeCount);
            console.log('- 路线列表显示:', routesList ? '正常' : '异常');
        } else {
            console.log('❌ 修复失败，仍无路线卡片');
        }
        
        console.log('\n=== 可用的调试命令 ===');
        console.log('- window.debugRoutes() - 查看调试信息');
        console.log('- window.forceRenderRoutes() - 强制重新渲染路线');
        console.log('- window.forceFixRoutes() - 强制修复路线显示');
    }

    // 延迟执行检查
    setTimeout(() => {
        checkPageStatus();
        checkRouteData();
        checkFixScripts();
        showSummary();
    }, 2000);

    // 暴露全局函数
    window.debugRoutes = () => {
        checkPageStatus();
        checkRouteData();
        checkFixScripts();
        showSummary();
    };
    
    window.forceFixRoutes = forceFix;

    console.log('🔧 验证脚本已启动，2秒后将开始检查...');

})();