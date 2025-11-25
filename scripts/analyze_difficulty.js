// 难度分类分析和测试脚本
const fs = require('fs');

// 模拟浏览器环境中的数据
const mockRoutes = [
    {
        id: 1,
        name: "粉嶺流水響水塘",
        location: "位于香港新界北区东部的八仙岭郊野公园内，龙山东北一带。",
        features: "水塘面积约 3.5 公顷，历史悠久，清朝嘉庆年间已有记载。周边有凉亭、露营场地、烧烤场等设施，郊游径全长约 4.4 公里，走毕约需两小时，是新界北热门郊游地。",
        difficulty: "困难",
        duration: "2小时",
        distance: "4.4公里"
    },
    {
        id: 28,
        name: "荃湾到青衣",
        location: "从新界西部的荃湾区到青衣岛，跨越蓝巴勒海峡。",
        features: "这条路线连接荃湾和青衣两个地区，主要沿着海岸线行走，可以欣赏到蓝巴勒海峡的海景。路线相对平缓，适合作为休闲徒步路线。",
        difficulty: "简单",
        duration: "1.5小时", 
        distance: "3.0公里"
    },
    {
        id: 13,
        name: "东涌到梅窝",
        location: "从大屿山东涌到梅窝，穿越大屿山中部。",
        features: "穿越大屿山腹地，途经多个村落和山丘，可以体验到大屿山的原始风貌。路线有一定挑战性，需要较好的体力。",
        difficulty: "中等",
        duration: "4小时",
        distance: "8.0公里"
    },
    {
        id: 14,
        name: "石壁水塘到分流",
        location: "从石壁水塘到分流，途经大屿山西南部海岸。",
        features: "沿海路线，可以欣赏到壮观的海崖和石壁景观。路线较为原始，保持了较多的自然状态。",
        difficulty: "中等",
        duration: "3小时",
        distance: "6.0公里"
    },
    {
        id: 5,
        name: "龙脊径",
        location: "位于香港岛东南部，石澳道附近。",
        features: "海拔284米，曾被《时代周刊》评为亚洲最佳市区远足路线。可以俯瞰石澳、大潭湾和红山半岛的壮丽景色，路径相对平缓，适合初级徒步者。",
        difficulty: "简单",
        duration: "1.5小时",
        distance: "3.0公里"
    }
];

// 新的难度分类算法
class DifficultyCalculator {
    // 解析距离和时长字符串为数字
    static parseDistance(distanceStr) {
        const match = distanceStr.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
    }
    
    static parseDuration(durationStr) {
        const match = durationStr.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
    }
    
    // 计算地形复杂度系数
    static calculateTerrainComplexity(location, features) {
        const allText = (location || '') + ' ' + (features || '');
        let complexity = 0;
        
        // 高难度地形关键词
        const hardKeywords = {
            '峰': 0.3, '岭': 0.2, '崖': 0.4, '岩': 0.2, '坡': 0.2,
            '山': 0.2, '石': 0.1, '洞': 0.3, '瀑': 0.2
        };
        
        // 低难度地形关键词  
        const easyKeywords = {
            '径': -0.1, '道': -0.1, '塘': -0.2, '坝': -0.1,
            '径': -0.1, '线': -0.1, '岸': 0, '海': 0
        };
        
        Object.keys(hardKeywords).forEach(keyword => {
            const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
            complexity += matches * hardKeywords[keyword];
        });
        
        Object.keys(easyKeywords).forEach(keyword => {
            const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
            complexity += matches * easyKeywords[keyword];
        });
        
        return complexity;
    }
    
    // 主要难度计算函数
    static calculateDifficulty(distance, duration, location, features) {
        const distanceKm = this.parseDistance(distance);
        const durationHours = this.parseDuration(duration);
        const terrainComplexity = this.calculateTerrainComplexity(location, features);
        
        // 基础分数计算
        const distanceScore = Math.min(distanceKm / 8, 1.2); // 8公里为满分
        const durationScore = Math.min(durationHours / 6, 1.2); // 6小时为满分
        
        // 地形复杂度调整
        const totalScore = (distanceScore + durationScore) * (1 + terrainComplexity);
        
        // 分级标准
        if (totalScore <= 0.8) return '简单';
        if (totalScore <= 1.4) return '中等';
        return '困难';
    }
}

// 分析函数
function analyzeRoutes() {
    console.log('🧪 香港徒步路线难度分类系统测试');
    console.log('='.repeat(50));
    
    mockRoutes.forEach(route => {
        const newDifficulty = DifficultyCalculator.calculateDifficulty(
            route.distance, 
            route.duration, 
            route.location, 
            route.features
        );
        
        const isCorrect = route.difficulty === newDifficulty;
        const icon = isCorrect ? '✅' : '⚠️';
        
        console.log(`\n${icon} ${route.name}`);
        console.log(`   📏 距离: ${route.distance}`);
        console.log(`   ⏱️ 时长: ${route.duration}`);
        console.log(`   📍 原分类: ${route.difficulty}`);
        console.log(`   🎯 新分类: ${newDifficulty}`);
        
        // 分析合理性
        const distanceKm = DifficultyCalculator.parseDistance(route.distance);
        const durationHours = DifficultyCalculator.parseDuration(route.duration);
        
        if (route.name.includes('荃湾')) {
            console.log(`   💡 分析: 3公里/1.5小时 → ${newDifficulty === '简单' ? '合理 (短距离轻松路线)' : '过于严格，需要调整标准'}`);
        } else {
            console.log(`   💡 分析: ${distanceKm}公里/${durationHours}小时 → ${isCorrect ? '分类合理' : '需要重新评估'}`);
        }
    });
    
    // 总体评估
    const correctCount = mockRoutes.filter(route => {
        const newDifficulty = DifficultyCalculator.calculateDifficulty(
            route.distance, route.duration, route.location, route.features
        );
        return route.difficulty === newDifficulty;
    }).length;
    
    console.log(`\n📊 总体评估: ${correctCount}/${mockRoutes.length} 条路线分类准确`);
    console.log(`🎯 准确率: ${((correctCount/mockRoutes.length)*100).toFixed(1)}%`);
}

// 针对荃湾到青衣路线的专项分析
function analyzeQuanWanRoute() {
    console.log('\n🎯 荃湾到青衣路线专项分析');
    console.log('='.repeat(30));
    
    const route = mockRoutes.find(r => r.name.includes('荃湾'));
    if (!route) return;
    
    const distanceKm = DifficultyCalculator.parseDistance(route.distance);
    const durationHours = DifficultyCalculator.parseDuration(route.duration);
    
    console.log(`📋 路线信息:`);
    console.log(`   • 名称: ${route.name}`);
    console.log(`   • 距离: ${route.distance} (${distanceKm}km)`);
    console.log(`   • 时长: ${route.duration} (${durationHours}h)`);
    console.log(`   • 原分类: ${route.difficulty}`);
    
    console.log(`\n🔍 深度分析:`);
    console.log(`   • 距离评价: ${distanceKm <= 3 ? '短距离' : distanceKm <= 6 ? '中等距离' : '长距离'}`);
    console.log(`   • 时长评价: ${durationHours <= 2 ? '轻松' : durationHours <= 4 ? '中等' : '较长'}`);
    console.log(`   • 地形特点: 海岸线，相对平缓`);
    
    const recommendations = [];
    if (distanceKm <= 4 && durationHours <= 2) {
        recommendations.push('推荐分类: 简单 (短距离轻松路线)');
    } else if (distanceKm <= 8 && durationHours <= 4) {
        recommendations.push('推荐分类: 中等 (距离适中，需要一定体力)');
    } else {
        recommendations.push('推荐分类: 困难 (长距离高强度路线)');
    }
    
    console.log(`\n💡 建议:`);
    recommendations.forEach(rec => console.log(`   ${rec}`));
}

// 执行分析
analyzeRoutes();
analyzeQuanWanRoute();

console.log('\n✨ 分析完成!');
console.log('💭 结论: 3公里/1.5小时的荃湾到青衣路线归类为"简单"是合理的');