// 应用程序状态管理
const AppState = {
    routes: [],
    filteredRoutes: [],
    markers: new Map(),
    currentFilter: 'all',
    searchQuery: '',
    activeRoute: null,
    totalViews: 0,
    
    // 新增状态管理
    isLoading: false,
    showDataVisualization: false,
    timeSeriesData: null,
    difficultyDistribution: null,
    userLocation: null,
    locationAccuracy: null,
    locationStatus: 'inactive',
    selectedRoute: null,
    chartInstances: new Map(),
    showRouteModal: false,
    showToast: false,
    toastMessage: { title: '', message: '' }
};

// 路线分类定义
const RouteCategories = {
    water: ['水塘', '水庫', '瀑布', '濕地', '湖泊', '小島', '千島湖', '河背', '紅樹林'],
    mountain: ['山', '峰', '頂', '高', '陡', '遠景', '山頂', '山腰', '山峰'],
    coast: ['海', '岸', '海灣', '灣', '海濱', '半島', '海岸', '海邊', '海洋'],
    cultural: ['歷史', '古道', '村落', '客家', '文化', '文物', '古', '遺跡', '燈塔', '民俗']
};

// DOM元素引用
const DOM = {
    map: null,
    sidebar: null,
    
    sidebarOverlay: null,
    searchInput: null,
    filterTags: null,
    routesList: null,
    loadingState: null,
    emptyState: null,
    totalRoutes: null,
    totalViews: null,
    // 新增UI元素
    loadingOverlay: null,
    dataVisualization: null,
    routeModal: null,
    modalClose: null,
    modalImage: null,
    modalTitle: null,
    modalLocation: null,
    modalRating: null,
    modalDifficulty: null,
    modalDuration: null,
    modalDescription: null,
    transportationSteps: null,
    toast: null,
    toastTitle: null,
    toastMessage: null,
    locationIndicator: null,
    locationStatus: null,
    locationText: null,
    routesTrendChart: null,
    difficultyChart: null
};

// 香港特色地图瓦片服务配置（网络优先，离线备用）
const TileProviders = [
    {
        // OpenStreetMap标准版本（首选服务）
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        errorTolerance: 3,
        isPrimary: true
    },
    {
        // CartoDB Light All - 经典浅色地图（备用服务）
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        errorTolerance: 2,
        isBackup: true
    },
    {
        // 离线地图模式（最后的备用方案）
        url: 'offline://hk-map/{z}/{x}/{y}.png',
        attribution: '香港远足路线应用 - 离线模式',
        maxZoom: 15,
        errorTolerance: 0,
        isOffline: true
    }
];

// 工具函数
const Utils = {
    // 搜索匹配
    matchesSearch: (route, query) => {
        if (!query) return true;
        const searchText = query.toLowerCase();
        return route.name.toLowerCase().includes(searchText) ||
               route.location.toLowerCase().includes(searchText) ||
               route.features.toLowerCase().includes(searchText);
    },

    // 分类匹配
    matchesCategory: (route, category) => {
        if (category === 'all') return true;
        
        const keywords = RouteCategories[category] || [];
        const routeText = (route.name + route.features + route.location).toLowerCase();
        
        return keywords.some(keyword => routeText.includes(keyword.toLowerCase()));
    },

    // 防抖函数
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 生成随机评级
    generateRating: () => {
        return Math.floor(Math.random() * 2) + 4; // 4-5星
    },

    // 计算难度
    getDifficulty: (route) => {
        // 安全检查，确保route存在且有必要的属性
        if (!route) {
            return { level: '中等', color: '#FFD60A' };
        }
        
        const text = ((route.features || '') + ' ' + (route.name || '')).toLowerCase();
        if (text.includes('平缓') || text.includes('简单') || text.includes('适合新手') || text.includes('平緩') || text.includes('簡單') || text.includes('適合新手')) {
            return { level: '简单', color: '#06D6A0' };
        } else if (text.includes('挑战') || text.includes('陡峭') || text.includes('有坡度') || text.includes('挑戰')) {
            return { level: '困难', color: '#EF4444' };
        } else {
            return { level: '中等', color: '#FFD60A' };
        }
    },

    // 格式化特色描述
    truncateText: (text, maxLength = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // 数据处理工具
    generateMockTimeSeriesData: () => {
        const data = [];
        const now = new Date();
        const categories = ['日', '周', '月'];
        
        categories.forEach((category, index) => {
            const baseValue = 50 + (index * 20);
            const points = [];
            const pointCount = category === '日' ? 24 : category === '周' ? 7 : 30;
            
            for (let i = 0; i < pointCount; i++) {
                const value = baseValue + Math.random() * 30 - 15;
                const point = {
                    x: category === '日' ? `${i}:00` : 
                       category === '周' ? `第${i+1}天` : 
                       `${i+1}日`,
                    y: Math.max(0, Math.round(value))
                };
                points.push(point);
            }
            
            data.push({
                category,
                points,
                total: points.reduce((sum, p) => sum + p.y, 0),
                average: Math.round(points.reduce((sum, p) => sum + p.y, 0) / points.length)
            });
        });
        
        return data;
    },

    calculateDifficultyDistribution: (routes) => {
        const distribution = { '简单': 0, '中等': 0, '困难': 0 };
        
        routes.forEach(route => {
            const difficulty = Utils.getDifficulty(route);
            if (difficulty.level === '简单') {
                distribution['简单']++;
            } else if (difficulty.level === '困难') {
                distribution['困难']++;
            } else {
                distribution['中等']++;
            }
        });
        
        return distribution;
    },

    // 生成随机路线数据
    generateMockRoutes: (count = 15) => {
        const routeTemplates = [
            { name: "山顶环回步行径", location: "香港岛", features: "平缓路线，适合全家郊游，可以欣赏维多利亚港美景" },
            { name: "大屿山昂坪栈道", location: "大屿山", features: "中等难度，需要一定体力，途经天坛大佛和文化村" },
            { name: "西贡码头海滨长廊", location: "西贡", features: "平缓路线，沿海而建，适合散步和观景" },
            { name: "狮子山国家公园健行步道", location: "新界", features: "挑战路线，需要良好体力，山顶景色壮丽" },
            { name: "龙脊徒步道", location: "香港岛东南部", features: "中等难度，途经美丽的海崖和山峰" },
            { name: "大埔滘自然教育径", location: "大埔", features: "简单路线，森林浴体验，适合新手" },
            { name: "石澳海滩健行步道", location: "香港岛东岸", features: "平缓路线，连接美丽海滩和山径" },
            { name: "乌蛟腾客家古道", location: "新界东北部", features: "文化路线，体验客家村落历史和文化" },
            { name: "南丫岛岛屿跳跃", location: "南丫岛", features: "中等难度，岛屿间健行，品尝海鲜美食" },
            { name: "荃湾西楼角自然径", location: "荃湾", features: "简单路线，都市中的绿色走廊" },
            { name: "西贡地质公园地质步道", location: "西贡东北部", features: "地质教育路线，欣赏奇石景观和海岸地貌" },
            { name: "清水湾郊野公园健行", location: "清水湾", features: "平缓路线，沿海健行和烧烤设施" },
            { name: "大帽山郊野公园山径", location: "新界西部", features: "挑战路线，香港最高峰，云海奇观" },
            { name: "大澳渔村文化漫步", location: "大屿山西北部", features: "文化路线，体验渔村风情和传统文化" },
            { name: "香港湿地公园自然步道", location: "新界西北部", features: "生态教育路线，观鸟和湿地生态体验" }
        ];

        const coordinates = [
            [22.3193, 114.1694], [22.2812, 113.9106], [22.3833, 114.2667], [22.4167, 114.2167],
            [22.2500, 114.2667], [22.4500, 114.1667], [22.2167, 114.2500], [22.5333, 114.2333],
            [22.2000, 114.1500], [22.3667, 114.1167], [22.3833, 114.3667], [22.4000, 114.2833],
            [22.4167, 114.1333], [22.2833, 113.8833], [22.4667, 114.0500]
        ];

        const routes = [];
        for (let i = 0; i < Math.min(count, routeTemplates.length); i++) {
            const template = routeTemplates[i];
            const difficulty = Utils.getDifficulty(template);
            routes.push({
                id: `route_${i + 1}`,
                name: template.name,
                location: template.location,
                features: template.features,
                coordinates: coordinates[i],
                difficulty: difficulty.level,
                rating: Math.floor(Math.random() * 2) + 4, // 4-5星评分
                duration: `${Math.floor(Math.random() * 3) + 2}-${Math.floor(Math.random() * 2) + 3}小时`,
                image: `https://picsum.photos/800/400?random=${i + 1}`,
                transportation: [
                    "乘坐港铁至相关站点",
                    "转乘巴士或小巴到达路线起点",
                    "按照指示牌开始徒步",
                    "注意安全，遵守公园规定"
                ],
                viewCount: Math.floor(Math.random() * 1000) + 50,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
        }
        return routes;
    }
};

// 数据可视化管理器类
class DataVisualizationManager {
    constructor() {
        this.routesTrendChart = null;
        this.difficultyChart = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 初始化时间序列图表
            await this.initRoutesTrendChart();
            
            // 初始化难度分布图表  
            await this.initDifficultyChart();
            
            this.isInitialized = true;
            console.log('数据可视化模块初始化完成');
        } catch (error) {
            console.error('数据可视化模块初始化失败:', error);
        }
    }

    async initRoutesTrendChart() {
        const ctx = DOM.routesTrendChart.getContext('2d');
        
        // 获取时间序列数据
        const timeSeriesData = Utils.generateMockTimeSeriesData();
        AppState.timeSeriesData = timeSeriesData;
        
        this.routesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeSeriesData[2].points.map(p => p.x), // 使用月数据作为默认
                datasets: [
                    {
                        label: '路线增长趋势',
                        data: timeSeriesData[2].points.map(p => p.y),
                        borderColor: '#0078A8', // 维多利亚港蓝
                        backgroundColor: 'rgba(0, 120, 168, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#0078A8',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 14, weight: 'bold' },
                            color: '#374151'
                        }
                    },
                    title: {
                        display: true,
                        text: '路线增长趋势',
                        font: { size: 16, weight: 'bold' },
                        color: '#374151',
                        padding: 20
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: { size: 12 },
                            color: '#6B7280'
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: { size: 12 },
                            color: '#6B7280'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    async initDifficultyChart() {
        const ctx = DOM.difficultyChart.getContext('2d');
        
        // 计算难度分布
        const difficultyDistribution = Utils.calculateDifficultyDistribution(AppState.routes);
        AppState.difficultyDistribution = difficultyDistribution;
        
        const labels = Object.keys(difficultyDistribution);
        const data = Object.values(difficultyDistribution);
        const colors = ['#06D6A0', '#FFD60A', '#EF4444'];
        
        this.difficultyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverBorderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            font: { size: 14, weight: 'bold' },
                            color: '#374151',
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    title: {
                        display: true,
                        text: '路线难度分布',
                        font: { size: 16, weight: 'bold' },
                        color: '#374151',
                        padding: 20
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                cutout: '60%'
            }
        });
    }

    updateTimeSeriesData(period) {
        if (!this.routesTrendChart) return;
        
        const dataMap = {
            '日': 0,
            '周': 1, 
            '月': 2
        };
        
        const dataIndex = dataMap[period];
        if (dataIndex === undefined) return;
        
        const timeSeriesData = AppState.timeSeriesData[dataIndex];
        const dataset = this.routesTrendChart.data.datasets[0];
        
        this.routesTrendChart.data.labels = timeSeriesData.points.map(p => p.x);
        dataset.data = timeSeriesData.points.map(p => p.y);
        this.routesTrendChart.data.datasets = [dataset];
        
        // 更新图表标题
        this.routesTrendChart.options.plugins.title.text = `路线增长趋势 (${period})`;
        
        this.routesTrendChart.update('active');
    }

    refreshCharts() {
        if (this.routesTrendChart) {
            this.routesTrendChart.destroy();
            this.routesTrendChart = null;
        }
        
        if (this.difficultyChart) {
            this.difficultyChart.destroy();
            this.difficultyChart = null;
        }
        
        this.isInitialized = false;
        this.initialize();
    }

    toggleVisualization() {
        AppState.showDataVisualization = !AppState.showDataVisualization;
        
        if (AppState.showDataVisualization) {
            DOM.dataVisualization.style.display = 'block';
            this.initialize();
        } else {
            DOM.dataVisualization.style.display = 'none';
        }
    }
}

// 路线详情管理类
class RouteDetailManager {
    constructor() {
        this.currentRoute = null;
        this.init();
    }

    init() {
        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 关闭按钮点击事件
        DOM.modalClose.addEventListener('click', () => {
            this.hideRouteDetail();
        });

        // 模态框背景点击关闭
        DOM.routeModal.addEventListener('click', (e) => {
            if (e.target === DOM.routeModal) {
                this.hideRouteDetail();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && AppState.showRouteModal) {
                this.hideRouteDetail();
            }
        });
    }

    showRouteDetail(route) {
        this.currentRoute = route;
        AppState.showRouteModal = true;

        // 填充路线信息
        this.populateRouteData(route);

        // 显示模态框
        this.showModal();
    }

    populateRouteData(route) {
        // 设置图片
        DOM.modalImage.src = route.image;
        DOM.modalImage.alt = route.name;

        // 设置基本信息
        DOM.modalTitle.textContent = route.name;
        DOM.modalLocation.textContent = route.location;
        DOM.modalRating.textContent = `${route.rating}分`;
        DOM.modalDifficulty.textContent = Utils.getDifficulty(route.difficulty).level;
        DOM.modalDifficulty.style.color = Utils.getDifficulty(route.difficulty).color;
        DOM.modalDuration.textContent = route.duration;
        DOM.modalDescription.textContent = route.features;

        // 设置交通指南
        this.populateTransportationSteps(route.transportation);
    }

    populateTransportationSteps(transportation) {
        DOM.transportationSteps.innerHTML = '';

        transportation.forEach((step, index) => {
            const stepElement = document.createElement('li');
            stepElement.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div>${step}</div>
            `;
            DOM.transportationSteps.appendChild(stepElement);
        });
    }

    showModal() {
        // 添加动画效果
        DOM.routeModal.classList.add('active');
        
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
    }

    hideRouteDetail() {
        // 添加关闭动画
        DOM.routeModal.classList.remove('active');
        
        setTimeout(() => {
            document.body.style.overflow = '';
            AppState.showRouteModal = false;
            this.currentRoute = null;
        }, 300);
    }
}

// 地图管理类
class MapManager {
    constructor() {
        this.map = L.map('map', {
            center: [22.3193, 114.1694], // 香港中环
            zoom: 11,
            zoomControl: true,
            preferCanvas: true
        });
        this.markers = [];
        this.routePaths = new Map(); // 存储路径线路
        this.startEndMarkers = new Map(); // 存储起点终点标记
        
        // 初始化地图瓦片服务相关属性
        this.currentProviderIndex = 0; // 瓦片服务索引
        this.errorCount = 0; // 错误计数
        this.mapLayer = null; // 当前地图瓦片层
        this.isReady = false; // 地图是否就绪
        this.customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-pin">
                    <i class="fas fa-hiking marker-icon" style="color: white; font-size: 14px;"></i>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        this.startIcon = L.divIcon({
            className: 'start-end-marker start-marker',
            html: `
                <div class="marker-pin start-pin">
                    <i class="fas fa-play marker-icon" style="color: white; font-size: 12px;"></i>
                </div>
            `,
            iconSize: [25, 25],
            iconAnchor: [12, 25]
        });
        this.endIcon = L.divIcon({
            className: 'start-end-marker end-marker',
            html: `
                <div class="marker-pin end-pin">
                    <i class="fas fa-flag-checkered marker-icon" style="color: white; font-size: 12px;"></i>
                </div>
            `,
            iconSize: [25, 25],
            iconAnchor: [12, 25]
        });
        this.isRendering = false;
        this.renderQueue = [];
        this.progressiveLayers = new Map();
        this.routePaths = new Map(); // 存储路径线路
        this.showRoutes = true; // 是否显示路径
        this.setupPerformanceOptimizations();
    }



    createCustomIcon() {
        return L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="28" height="44" viewBox="0 0 28 44" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 0C6.3 0 0 6.3 0 14c0 14 14 30 14 30S28 28 28 14C28 6.3 21.7 0 14 0z" fill="#0078A8"/>
                    <circle cx="14" cy="14" r="8" fill="white"/>
                    <circle cx="14" cy="14" r="5" fill="#0078A8"/>
                    <path d="M14 6a8 8 0 1 1 0 16A8 8 0 0 1 14 6z" fill="white" opacity="0.2"/>
                </svg>
            `),
            iconSize: [28, 44],
            iconAnchor: [14, 44],
            popupAnchor: [1, -38]
        });
    }

    loadTileProvider() {
        console.log('开始加载地图瓦片服务...');
        
        if (this.currentProviderIndex >= TileProviders.length) {
            console.error('所有地图瓦片服务均无法加载');
            this.showFallbackMap();
            return;
        }

        // 清理现有的瓦片层
        if (this.mapLayer && this.map.hasLayer(this.mapLayer)) {
            this.map.removeLayer(this.mapLayer);
            this.mapLayer = null;
        }

        this.errorCount = 0;
        const provider = TileProviders[this.currentProviderIndex];
        console.log(`正在加载瓦片服务 ${this.currentProviderIndex + 1}/${TileProviders.length}: ${provider.url}`);
        
        // 检查是否为离线模式或本地开发模式 - 优先处理
        if (provider.isOffline || provider.isLocalDev) {
            console.log(`检测到${provider.isOffline ? '离线' : '本地开发'}模式，立即使用备用地图方案`);
            this.showFallbackMap();
            return;
        }
        
        // 创建瓦片图层，添加更详细的错误处理
        try {
            this.mapLayer = L.tileLayer(provider.url, {
                attribution: provider.attribution,
                maxZoom: provider.maxZoom || 19,
                crossOrigin: false, // 改为false避免CORS问题
                errorTileUrl: this.generateFallbackTile(),
                detectRetina: false, // 禁用retina检测减少加载量
                updateWhenIdle: true, // 空闲时更新提高性能
                keepBuffer: 2 // 减少缓冲瓦片数量
            });

            // 添加加载完成监听器
            this.mapLayer.once('load', () => {
                console.log(`瓦片服务 ${this.currentProviderIndex + 1} 加载成功`);
                this.onTileProviderReady();
            });

            // 添加错误监听器
            this.mapLayer.once('tileerror', (e) => {
                console.warn(`瓦片服务 ${this.currentProviderIndex + 1} 出现错误:`, e);
                this.handleTileProviderError();
            });

            this.mapLayer.addTo(this.map);
            console.log(`瓦片图层已添加到地图`);
            
        } catch (error) {
            console.error(`创建瓦片图层时出错:`, error);
            this.handleTileProviderError();
        }
    }

    onTileProviderReady() {
        console.log('地图瓦片服务已就绪');
        this.isReady = true;
    }

    handleTileProviderError() {
        console.warn(`瓦片服务 ${this.currentProviderIndex + 1} 出现错误 (错误计数: ${this.errorCount + 1})`);
        this.errorCount++;
        
        // 如果第一个服务（离线模式）失败，立即尝试下一个
        if (this.currentProviderIndex === 0) {
            console.log('离线模式失败，尝试本地开发模式');
            this.currentProviderIndex = 1;
            setTimeout(() => {
                this.loadTileProvider();
            }, 500);
            return;
        }
        
        // 如果所有服务都失败，显示备用地图
        if (this.currentProviderIndex >= TileProviders.length - 1) {
            console.warn('所有瓦片服务均不可用，显示备用地图');
            this.showFallbackMap();
            return;
        }
        
        // 切换到下一个服务
        setTimeout(() => {
            this.switchToNextProvider();
        }, 2000); // 增加到2秒后切换，给网络更多时间
    }

    showFallbackMap() {
        // 清除现有的瓦片层
        if (this.mapLayer && this.map.hasLayer(this.mapLayer)) {
            this.map.removeLayer(this.mapLayer);
        }

        console.log('显示备用地图方案');
        
        // 创建一个更实用的香港地图背景
        const fallbackLayer = L.gridLayer({
            tileSize: 256,
            updateWhenIdle: true
        });

        fallbackLayer.createTile = (coords) => {
            const tile = L.DomUtil.create('div', 'leaflet-tile');
            
            // 根据缩放级别和坐标创建不同的地图样式
            const zoom = coords.z;
            
            if (zoom <= 6) {
                // 低缩放级别：显示大陆概览
                tile.style.backgroundColor = '#f0f8ff';
                tile.style.backgroundImage = 'linear-gradient(45deg, #e6f3ff 25%, transparent 25%), linear-gradient(-45deg, #e6f3ff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e6f3ff 75%), linear-gradient(-45deg, transparent 75%, #e6f3ff 75%)';
                tile.style.backgroundSize = '20px 20px';
                tile.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
            } else if (zoom <= 10) {
                // 中等缩放级别：香港区域
                tile.style.backgroundColor = '#e8f5e8';
                tile.style.border = '2px solid #0078A8';
            } else {
                // 高缩放级别：详细视图
                tile.style.backgroundColor = '#f5f5dc';
                tile.style.border = '1px solid #ddd';
            }
            
            // 添加网格线和标记
            tile.style.position = 'relative';
            tile.style.display = 'flex';
            tile.style.alignItems = 'center';
            tile.style.justifyContent = 'center';
            
            // 在瓦片中心添加小点表示位置
            const centerDot = L.DomUtil.create('div', 'fallback-tile-dot');
            centerDot.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background-color: #0078A8;
                border-radius: 50%;
                border: 1px solid white;
            `;
            tile.appendChild(centerDot);
            
            return tile;
        };

        fallbackLayer.addTo(this.map);
        this.mapLayer = fallbackLayer;
        
        // 添加香港主要地点标记（即使在离线模式下也能显示重要位置）
        this.addOfflineMarkers();
        
        // 显示友好的通知给用户
        this.showNotification('正在使用离线地图模式。所有功能正常，但部分详细信息可能不完整。', 'info');
    }

    generateFallbackTile() {
        // 返回一个简单的占位符图片（base64编码的1x1像素透明图片）
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    showNotification(message, type = 'info') {
        // 创建简单的通知元素
        const notification = document.createElement('div');
        notification.className = `map-notification map-notification--${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="notification-icon ${this.getNotificationIcon(type)}"></i>
                <div class="notification-text">
                    <div class="notification-title">${this.getNotificationTitle(type)}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationBg(type)};
            color: ${this.getNotificationColor(type)};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            font-family: var(--font-primary, sans-serif);
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'fas fa-info-circle',
            'warning': 'fas fa-exclamation-triangle', 
            'error': 'fas fa-times-circle',
            'success': 'fas fa-check-circle'
        };
        return icons[type] || icons['info'];
    }

    getNotificationTitle(type) {
        const titles = {
            'info': '信息',
            'warning': '警告',
            'error': '错误', 
            'success': '成功'
        };
        return titles[type] || titles['info'];
    }

    getNotificationBg(type) {
        const backgrounds = {
            'info': '#E3F2FD',
            'warning': '#FFF3E0',
            'error': '#FFEBEE',
            'success': '#E8F5E8'
        };
        return backgrounds[type] || backgrounds['info'];
    }

    getNotificationColor(type) {
        const colors = {
            'info': '#1976D2',
            'warning': '#F57C00',
            'error': '#D32F2F',
            'success': '#388E3C'
        };
        return colors[type] || colors['info'];
    }
    
    addOfflineMarkers() {
        // 香港重要地点的离线标记
        const hkLandmarks = [
            { name: '维多利亚港', coords: [22.3193, 114.1694], type: 'harbor' },
            { name: '太平山顶', coords: [22.2711, 114.1492], type: 'peak' },
            { name: '香港国际机场', coords: [22.3080, 113.9150], type: 'airport' },
            { name: '中环', coords: [22.2816, 114.1583], type: 'business' },
            { name: '尖沙咀', coords: [22.2974, 114.1722], type: 'tourist' }
        ];
        
        hkLandmarks.forEach(landmark => {
            const icon = L.divIcon({
                className: 'offline-marker',
                html: `<div class="offline-marker-${landmark.type}">${this.getOfflineMarkerIcon(landmark.type)}</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            });
            
            const marker = L.marker(landmark.coords, { icon }).addTo(this.map);
            marker.bindPopup(`<strong>${landmark.name}</strong><br><em>离线模式标记</em>`);
        });
    }
    
    getOfflineMarkerIcon(type) {
        const icons = {
            'harbor': '⚓',
            'peak': '⛰️',
            'airport': '✈️',
            'business': '🏢',
            'tourist': '🗼'
        };
        return icons[type] || '📍';
    }

    setupPerformanceOptimizations() {
        // 优化缩放和平移性能
        this.map.options.zoomAnimation = true;
        this.map.options.fadeAnimation = true;
        this.map.options.markerZoomAnimation = true;
        this.map.options.inertia = true;
        this.map.options.inertiaDeceleration = 3000;
        this.map.options.inertiaMaxSpeed = 2000;
        this.map.options.zoomAnimationThreshold = 4;

        // 优化渲染性能
        this.map.options.renderer = L.svg({
            padding: 0.1,
            interactive: true,
            className: 'map-renderer'
        });

        // 设置地图事件监听器进行性能优化
        this.setupRenderOptimization();
        this.setupGestureOptimization();
    }

    setupRenderOptimization() {
        // 防抖重绘
        let renderTimeout;
        
        this.map.on('zoomend moveend', () => {
            if (renderTimeout) {
                clearTimeout(renderTimeout);
            }
            
            renderTimeout = setTimeout(() => {
                this.optimizeRendering();
            }, 50);
        });

        // 优化标记聚合（高缩放级别时）
        this.map.on('zoomend', () => {
            const currentZoom = this.map.getZoom();
            if (currentZoom >= 15) {
                this.enableHighDetailMarkers();
            } else {
                this.enableLowDetailMarkers();
            }
        });
    }

    setupGestureOptimization() {
        // 优化手势操作
        let isUserInteracting = false;
        let interactionTimeout;

        this.map.on('zoomstart movestart', () => {
            isUserInteracting = true;
            if (interactionTimeout) {
                clearTimeout(interactionTimeout);
            }
        });

        this.map.on('zoomend moveend', () => {
            interactionTimeout = setTimeout(() => {
                isUserInteracting = false;
                this.optimizeRendering();
            }, 100);
        });

        // 预加载附近瓦片
        this.map.on('zoomend moveend', Utils.debounce(() => {
            this.preloadNearbyTiles();
        }, 200));
    }

    optimizeRendering() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        
        requestAnimationFrame(() => {
            // 重新计算标记位置
            this.repositionMarkers();
            
            // 清理不可见的标记
            this.cleanupOffscreenMarkers();
            
            this.isRendering = false;
        });
    }

    repositionMarkers() {
        const bounds = this.map.getBounds();
        
        this.markers.forEach(marker => {
            const position = marker.getLatLng();
            if (bounds.contains(position)) {
                if (!this.map.hasLayer(marker)) {
                    marker.addTo(this.map);
                }
            } else {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            }
        });
    }

    cleanupOffscreenMarkers() {
        const currentZoom = this.map.getZoom();
        
        if (currentZoom < 12) {
            // 低缩放级别时隐藏所有标记
            this.markers.forEach(marker => {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            });
        }
    }

    enableHighDetailMarkers() {
        // 高缩放级别时显示详细标记
        this.markers.forEach(marker => {
            if (marker.options.icon === this.customIcon) {
                marker.setIcon(this.customIcon);
            }
        });
    }

    enableLowDetailMarkers() {
        // 低缩放级别时使用简化标记
        this.markers.forEach(marker => {
            const simpleIcon = L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="8" fill="#0078A8" stroke="white" stroke-width="2"/>
                    </svg>
                `),
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10]
            });
            marker.setIcon(simpleIcon);
        });
    }

    preloadNearbyTiles() {
        // 预加载附近区域的瓦片
        const currentBounds = this.map.getBounds();
        const expandedBounds = L.latLngBounds(
            currentBounds.getSouthWest().lat - 0.01,
            currentBounds.getSouthWest().lng - 0.01,
            currentBounds.getNorthEast().lat + 0.01,
            currentBounds.getNorthEast().lng + 0.01
        );
        
        // 在后台预加载瓦片
        setTimeout(() => {
            if (this.mapLayer) {
                this.mapLayer._update(expandedBounds);
            }
        }, 0);
    }

    // 渐进式加载方法
    progressiveLoadTiles() {
        if (!this.mapLayer) return;
        
        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        
        // 根据缩放级别调整加载策略
        if (zoom <= 10) {
            // 低缩放级别：快速加载主要内容
            this.mapLayer.options.tileSize = 256;
            this.mapLayer.options.updateWhenIdle = true;
        } else {
            // 高缩放级别：加载详细内容
            this.mapLayer.options.tileSize = 256;
            this.mapLayer.options.updateWhenZooming = true;
            this.mapLayer.options.updateInterval = 100;
        }
    }

    // 性能监控方法
    getPerformanceMetrics() {
        return {
            zoomLevel: this.map.getZoom(),
            center: this.map.getCenter(),
            bounds: this.map.getBounds(),
            tileLayerStatus: this.mapLayer ? 'active' : 'inactive',
            markersCount: this.markers.length,
            isRendering: this.isRendering
        };
    }

    setupErrorHandling() {
        // 移除之前的错误监听器
        if (this.mapLayer) {
            this.mapLayer.off('tileerror');
            this.mapLayer.off('tileload');
        }

        // 设置瓦片错误处理
        this.mapLayer.on('tileerror', (e) => {
            const errorUrl = e.tile.src;
            console.warn(`瓦片加载失败: ${errorUrl}`);
            
            // 避免重复计算同一URL的错误
            if (this.temporaryErrors.has(errorUrl)) {
                return;
            }
            
            this.temporaryErrors.add(errorUrl);
            this.errorCount++;
            
            // 根据提供商的错误容忍度决定是否切换
            const currentProvider = TileProviders[this.currentProviderIndex];
            const errorTolerance = currentProvider.errorTolerance || 0;
            
            // 改进的切换逻辑：达到错误容忍度且超过最小错误数才切换
            if (this.errorCount > errorTolerance && this.errorCount >= this.maxErrorsBeforeSwitch) {
                console.log(`达到错误阈值（${this.errorCount}/${this.maxErrorsBeforeSwitch}），切换到下一个瓦片服务`);
                this.switchToNextProvider();
            }
            
            // 清理临时错误记录
            setTimeout(() => {
                this.temporaryErrors.delete(errorUrl);
            }, 10000);
        });

        this.mapLayer.off('tileload');
        this.mapLayer.on('tileload', (e) => {
            if (this.errorCount > 0) {
                console.log('瓦片成功加载，重置错误计数');
                this.errorCount = 0;
                this.temporaryErrors.clear();
            }
            
            this.trackTileLoadProgress();
        });
    }
    
    switchToNextProvider() {
        const previousProvider = TileProviders[this.currentProviderIndex];
        this.currentProviderIndex = (this.currentProviderIndex + 1) % TileProviders.length;
        const newProvider = TileProviders[this.currentProviderIndex];
        
        console.log(`切换瓦片服务: ${previousProvider.url} -> ${newProvider.url}`);
        this.errorCount = 0;
        this.temporaryErrors.clear();
        this.loadTileProvider();
    }
    
    trackTileLoadProgress() {
        // 简单的进度跟踪 - 实际项目中可以使用更复杂的统计
        if (this.mapLayer && this.mapLayer._tiles) {
            const loadedTiles = Object.keys(this.mapLayer._tiles).length;
            const totalTiles = this.mapLayer._tileZoom !== undefined ? 
                Math.pow(2, this.mapLayer._tileZoom) : 0;
            
            // 发送统计信息（可以用于性能监控）
            if (loadedTiles % 10 === 0) { // 每10个瓦片报告一次
                console.log(`地图加载进度: ${loadedTiles} 瓦片已加载`);
            }
        }
    }

    addRouteMarkers() {
        this.markers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];

        // 清理现有的路径线
        this.routePaths.forEach((polyline, routeId) => {
            if (this.map.hasLayer(polyline)) {
                this.map.removeLayer(polyline);
            }
        });
        this.routePaths.clear();

        // 清理现有的起点终点标记
        this.startEndMarkers.forEach((markers, routeId) => {
            markers.forEach(marker => {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            });
        });
        this.startEndMarkers.clear();

        AppState.filteredRoutes.forEach(route => {
            const marker = L.marker(route.coordinates, { icon: this.customIcon }).addTo(this.map);
            this.markers.push(marker);
            
            // 添加路径线（如果路线有routePath数据）
            if (route.routePath && Array.isArray(route.routePath) && route.routePath.length > 1) {
                const pathOptions = {
                    color: '#0078A8', // 维多利亚港蓝
                    weight: 4,
                    opacity: 0.7,
                    smoothFactor: 1.0,
                    dashArray: '5, 5' // 虚线效果
                };
                
                const polyline = L.polyline(route.routePath, pathOptions).addTo(this.map);
                this.routePaths.set(route.id, polyline);

                // 添加起点和终点标记
                if (route.routePath.length > 0) {
                    const startPoint = route.routePath[0]; // 起点
                    const endPoint = route.routePath[route.routePath.length - 1]; // 终点

                    // 创建起点标记
                    const startMarker = L.marker(startPoint, { icon: this.startIcon }).addTo(this.map);
                    startMarker.bindPopup(`
                        <div style="font-family: 'Noto Sans SC', sans-serif; padding: 4px 8px;">
                            <strong style="color: #059669;">🚀 起点</strong><br>
                            <span style="color: #6B7280; font-size: 12px;">${route.name}</span>
                        </div>
                    `);

                    // 创建终点标记
                    const endMarker = L.marker(endPoint, { icon: this.endIcon }).addTo(this.map);
                    endMarker.bindPopup(`
                        <div style="font-family: 'Noto Sans SC', sans-serif; padding: 4px 8px;">
                            <strong style="color: #DC2626;">🏁 终点</strong><br>
                            <span style="color: #6B7280; font-size: 12px;">${route.name}</span>
                        </div>
                    `);

                    // 存储起点终点标记
                    if (!this.startEndMarkers.has(route.id)) {
                        this.startEndMarkers.set(route.id, []);
                    }
                    this.startEndMarkers.get(route.id).push(startMarker, endMarker);
                }
            }
            const difficulty = Utils.getDifficulty(route);
            const rating = Utils.generateRating();
            
            const popupContent = `
                <div style="min-width: 300px; font-family: 'Noto Sans SC', sans-serif; padding: 8px 0;">
                    <div style="border-bottom: 3px solid #0078A8; padding-bottom: 10px; margin-bottom: 14px;">
                        <h3 style="color: #0078A8; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; line-height: 1.3;">${route.name}</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <div style="color: #64748B; font-size: 13px; font-weight: 500;">难度: <span style="color: ${difficulty.color}; font-weight: 600;">${difficulty.level}</span></div>
                            <div style="color: #F59E0B; font-size: 16px; letter-spacing: 1px;">
                                ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                            </div>
                        </div>
                    </div>
                    <div style="margin-bottom: 10px; line-height: 1.6;">
                        <strong style="color: #374151; font-size: 14px;">📍 位置:</strong> 
                        <span style="color: #4B5563; font-weight: 500;">${route.location}</span>
                    </div>
                    ${route.distance ? `
                    <div style="margin-bottom: 8px; line-height: 1.6;">
                        <strong style="color: #374151; font-size: 14px;">📏 距离:</strong> 
                        <span style="color: #4B5563; font-weight: 500;">${route.distance}</span>
                    </div>
                    ` : ''}
                    ${route.duration ? `
                    <div style="margin-bottom: 8px; line-height: 1.6;">
                        <strong style="color: #374151; font-size: 14px;">⏱️ 预计时间:</strong> 
                        <span style="color: #4B5563; font-weight: 500;">${route.duration}</span>
                    </div>
                    ` : ''}
                    ${route.routePath ? `
                    <div style="margin-bottom: 8px; line-height: 1.6;">
                        <strong style="color: #374151; font-size: 14px;">🗺️ 路线信息:</strong> 
                        <span style="color: #0078A8; font-weight: 500;">✓ 完整GPS路径已加载</span>
                    </div>
                    ` : ''}
                    <div style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                        <strong style="color: #374151;">🌟 特色:</strong> 
                        <span style="display: block; margin-top: 4px; text-align: justify;">${Utils.truncateText(route.features, 150)}</span>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            // 添加悬停提示
            const tooltipContent = `
                <div style="min-width: 200px; font-family: 'Noto Sans SC', sans-serif; padding: 4px;">
                    <h4 style="color: #0078A8; margin: 0 0 6px 0; font-size: 16px; font-weight: 600;">${route.name}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="color: #64748B; font-size: 12px;">难度: <span style="color: ${difficulty.color}; font-weight: 500;">${difficulty.level}</span></span>
                        <span style="color: #F59E0B; font-size: 14px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
                    </div>
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">
                        📍 ${route.location}
                    </div>
                </div>
            `;
            marker.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                offset: [0, -10],
                className: 'custom-tooltip',
                opacity: 0.9,
                closeButton: false
            });
            
            AppState.markers.set(route.id, marker);
        });
    }
}

// 路线管理器类
class RouteManager {
    constructor(routeDetailManager) {
        this.routes = AppState.routes;
        this.filteredRoutes = [...this.routes];
        this.routeDetailManager = routeDetailManager;
    }

    applyFilters() {
        let filtered = this.routes.filter(route => {
            const matchesSearch = Utils.matchesSearch(route, AppState.searchQuery);
            const matchesCategory = Utils.matchesCategory(route, AppState.currentFilter);
            return matchesSearch && matchesCategory;
        });

        AppState.filteredRoutes = filtered;
        this.renderRoutesList();
        DOM.mapManager.addRouteMarkers();
    }

    renderRoutesList() {
        const routesList = DOM.routesList;
        routesList.innerHTML = '';

        if (AppState.filteredRoutes.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        AppState.filteredRoutes.forEach((route, index) => {
            const routeItem = this.createRouteItem(route);
            routeItem.style.animationDelay = `${index * 0.05}s`;
            routeItem.classList.add('fade-in');
            routesList.appendChild(routeItem);
        });
    }

    createRouteItem(route) {
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.dataset.routeId = route.id;

        const rating = Utils.generateRating();
        const difficulty = Utils.getDifficulty(route);

        routeItem.innerHTML = `
            <div class="route-header">
                <h3 class="route-title">${route.name}</h3>
                <div class="route-rating">
                    ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>
            </div>
            <div class="route-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${route.location}</span>
            </div>
            <div class="route-features">
                ${Utils.truncateText(route.features, 100)}
            </div>
            <div class="route-meta">
                <div class="route-meta-item">
                    <i class="fas fa-signal" style="color: ${difficulty.color};"></i>
                    <span>${difficulty.level}</span>
                </div>
                <div class="route-meta-item">
                    <i class="fas fa-hiking"></i>
                    <span>徒步路线</span>
                </div>
            </div>
        `;

        routeItem.addEventListener('click', () => {
            this.selectRoute(route.id);
        });

        return routeItem;
    }

    selectRoute(routeId) {
        const route = AppState.routes.find(r => r.id === routeId);
        if (!route) return;

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
        this.incrementViewCount();

        // 移动地图视图
        DOM.mapManager.map.setView(route.coordinates, 14, {
            animate: true,
            duration: 1
        });

        // 高亮显示对应的标记和路径
        const marker = AppState.markers.get(routeId);
        const polyline = DOM.mapManager.routePaths.get(routeId);
        
        if (marker) {
            // 可选：短暂打开popup以确认定位
            setTimeout(() => {
                marker.openPopup();
            }, 500);
            setTimeout(() => {
                marker.closePopup();
            }, 3000);
        }
        
        // 高亮显示对应路径
        if (polyline) {
            // 重置所有路径样式
            DOM.mapManager.routePaths.forEach((pl, id) => {
                if (id !== routeId) {
                    pl.setStyle({
                        color: '#0078A8', // 维多利亚港蓝
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '5, 5'
                    });
                }
            });
            
            // 高亮选中路径 - 香港传统红色
            polyline.setStyle({
                color: '#C8102E',
                weight: 6,
                opacity: 1.0,
                dashArray: null
            });
            
            // 将路径置于最上层
            polyline.bringToFront();
        }
    }

    incrementViewCount() {
        AppState.totalViews++;
        
        // 保存到localStorage
        localStorage.setItem('hiking-app-views', AppState.totalViews.toString());
    }

    showEmptyState() {
        DOM.routesList.style.display = 'none';
        DOM.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        DOM.routesList.style.display = 'flex';
        DOM.emptyState.style.display = 'none';
    }

    showLoading() {
        DOM.loadingState.style.display = 'flex';
        DOM.routesList.style.display = 'none';
        DOM.emptyState.style.display = 'none';
    }

    hideLoading() {
        DOM.loadingState.style.display = 'none';
    }
}

// 应用初始化
class HikingApp {
    constructor() {
        this.routeManager = null;
        this.mapManager = null;
        this.dataVisualizationManager = null;
        this.routeDetailManager = null;
        this.locationManager = null;
        this.uiManager = null;
        this.init();
    }

    async init() {
        this.initDOM();
        this.setupEventListeners();
        this.loadStoredData();
        
        // 模拟加载延迟
        setTimeout(() => {
            this.loadRoutes();
        }, 800);
    }

    initDOM() {
        DOM.map = document.getElementById('map');
        DOM.sidebar = document.getElementById('sidebar');
        DOM.sidebarOverlay = document.getElementById('sidebarOverlay');
        DOM.searchInput = document.getElementById('searchInput');
        DOM.filterTags = document.getElementById('filterTags');
        DOM.routesList = document.getElementById('routesList');
        DOM.loadingState = document.getElementById('loadingState');
        DOM.emptyState = document.getElementById('emptyState');

        DOM.totalViews = document.getElementById('totalViews');
        
        // 初始化新增DOM元素
        DOM.loadingOverlay = document.getElementById('loadingOverlay');
        DOM.dataVisualization = document.getElementById('dataVisualization');
        DOM.routeModal = document.getElementById('routeModal');
        DOM.modalClose = document.getElementById('modalClose');
        DOM.modalImage = document.getElementById('modalImage');
        DOM.modalTitle = document.getElementById('modalTitle');
        DOM.modalLocation = document.getElementById('modalLocation');
        DOM.modalRating = document.getElementById('modalRating');
        DOM.modalDifficulty = document.getElementById('modalDifficulty');
        DOM.modalDuration = document.getElementById('modalDuration');
        DOM.modalDescription = document.getElementById('modalDescription');
        DOM.transportationSteps = document.getElementById('transportationSteps');
        DOM.toast = document.getElementById('toast');
        DOM.toastTitle = document.getElementById('toastTitle');
        DOM.toastMessage = document.getElementById('toastMessage');
        DOM.locationIndicator = document.getElementById('locationIndicator');
        DOM.locationStatus = document.getElementById('locationStatus');
        DOM.locationText = document.getElementById('locationText');
        DOM.routesTrendChart = document.getElementById('routesTrendChart');
        DOM.difficultyChart = document.getElementById('difficultyChart');
    }

    loadStoredData() {
        const storedViews = localStorage.getItem('hiking-app-views');
        if (storedViews && DOM.totalViews) {
            AppState.totalViews = parseInt(storedViews);
            DOM.totalViews.textContent = AppState.totalViews;
        }
    }

    setupEventListeners() {
        // 搜索功能
        const debouncedSearch = Utils.debounce((query) => {
            AppState.searchQuery = query;
            this.routeManager.applyFilters();
            this.updateSearchStats();
        }, 300);

        let searchTimeout;
        DOM.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // 添加搜索状态视觉反馈
            if (query) {
                DOM.searchInput.classList.add('searching');
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    DOM.searchInput.classList.remove('searching');
                }, 1000);
            } else {
                DOM.searchInput.classList.remove('searching');
                clearTimeout(searchTimeout);
            }
            
            debouncedSearch(query);
        });

        // 筛选标签
        DOM.filterTags.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tag')) {
                // 更新活跃状态
                DOM.filterTags.querySelectorAll('.filter-tag').forEach(tag => {
                    tag.classList.remove('active');
                });
                e.target.classList.add('active');

                // 添加波纹效果
                this.createRippleEffect(e.target, e);

                // 应用筛选
                AppState.currentFilter = e.target.dataset.filter;
                this.routeManager.applyFilters();
                this.updateSearchStats();
                
                // 更新筛选标签组状态
                this.updateFilterTagsState();
            }
        });

        // 侧边栏遮罩点击事件
        DOM.sidebarOverlay.addEventListener('click', () => {
            this.closeSidebar();
        });

        // 窗口大小调整
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
            if (e.key === '/' && e.ctrlKey) {
                e.preventDefault();
                DOM.searchInput.focus();
            }
        });
    }

    updateSearchStats() {
        const totalRoutes = AppState.routes.length;
        const filteredRoutes = AppState.filteredRoutes.length;
        const currentFilter = AppState.currentFilter;
        const searchQuery = AppState.searchQuery;

        // 创建或获取搜索统计元素
        let searchStats = document.querySelector('.search-stats');
        if (!searchStats) {
            searchStats = document.createElement('div');
            searchStats.className = 'search-stats';
            DOM.searchInput.parentNode.appendChild(searchStats);
        }

        let statsHTML = '';
        
        // 显示搜索结果统计
        if (searchQuery || currentFilter !== 'all') {
            statsHTML = `<span class="results-count">${filteredRoutes}</span> 个结果`;
            
            // 添加筛选标签信息
            if (currentFilter !== 'all') {
                const activeTag = DOM.filterTags.querySelector('.filter-tag.active');
                const filterName = activeTag ? activeTag.textContent.trim() : '';
                statsHTML += ` · <span class="filter-indicator">${filterName}</span>`;
            }
            
            // 添加搜索查询信息
            if (searchQuery) {
                statsHTML += ` · 搜索: "${searchQuery}"`;
            }
        } else {
            statsHTML = `共 <span class="results-count">${totalRoutes}</span> 条路线`;
        }

        searchStats.innerHTML = statsHTML;
        
        // 确保立即显示
        if (filteredRoutes !== totalRoutes || currentFilter !== 'all' || searchQuery) {
            searchStats.style.display = 'flex';
        } else {
            searchStats.style.display = 'none';
        }
        
        // 显示动画
        requestAnimationFrame(() => {
            if (searchStats.style.display !== 'none') {
                searchStats.classList.add('visible');
            } else {
                searchStats.classList.remove('visible');
            }
        });
    }

    updateFilterTagsState() {
        const currentFilter = AppState.currentFilter;
        if (currentFilter && currentFilter !== 'all') {
            DOM.filterTags.classList.add('has-selection');
        } else {
            DOM.filterTags.classList.remove('has-selection');
        }
    }

    createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
            z-index: 0;
        `;
        
        // 添加动画样式
        if (!document.getElementById('ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    loadRoutes() {
        // 生成模拟路线数据
        AppState.routes = Utils.generateMockRoutes();
        AppState.filteredRoutes = [...AppState.routes];
        

        
        // 初始化地图
        this.mapManager = new MapManager();
        DOM.mapManager = this.mapManager;
        this.mapManager.loadTileProvider();
        
        // 初始化路线详情管理器
        this.routeDetailManager = new RouteDetailManager();
        
        // 初始化数据可视化管理器
        this.dataVisualizationManager = new DataVisualizationManager();
        
        // 初始化路线管理器
        this.routeManager = new RouteManager(this.routeDetailManager);
        this.routeManager.hideLoading();
        this.routeManager.applyFilters();
    }

    closeSidebar() {
        // 侧边栏在非移动端一直显示，无需关闭
        if (window.innerWidth <= 768) {
            DOM.sidebar.classList.add('mobile-closed');
            DOM.sidebarOverlay.classList.remove('active');
        }
    }

    handleResize() {
        // 非移动端侧边栏保持显示，移动端不处理
        if (window.innerWidth > 768) {
            DOM.sidebar.classList.remove('mobile-closed');
            DOM.sidebarOverlay.classList.remove('active');
        }
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    new HikingApp();
});