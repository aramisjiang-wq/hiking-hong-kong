// 测试新的难度分类系统
// 验证分类结果的合理性

(function() {
    'use strict';

    /**
     * 难度分类测试工具
     */
    class DifficultyTest {
        constructor() {
            this.calculator = new window.DifficultyCalculator();
            this.testResults = [];
        }

        /**
         * 测试"荃湾到青衣"路线
         */
        testQuanWanToTsingYi() {
            console.log('🧪 测试"荃湾到青衣"路线...');
            
            const quanWanRoute = {
                name: "荃湾到青衣",
                distance: "3.0公里",
                duration: "1.5小时",
                location: "从新界西部的荃湾区到青衣岛。",
                features: "连接新界西部和青衣岛的跨海路线，沿途可以欣赏到青马大桥和汀九桥的壮丽景色。青衣岛是香港重要的工业和交通枢纽，这条路线展现了香港的现代都市风貌。",
                currentDifficulty: "简单"
            };

            const result = this.calculator.calculateDifficulty(quanWanRoute);
            
            console.log('\n📊 测试结果:');
            console.log('路线名称:', quanWanRoute.name);
            console.log('当前难度:', quanWanRoute.currentDifficulty);
            console.log('新计算难度:', result.level);
            console.log('难度颜色:', result.color);
            console.log('综合评分:', result.score);
            console.log('分类原因:', result.factors.reasons);
            console.log('地形调整因子:', result.factors.terrainMultiplier);
            
            return result;
        }

        /**
         * 测试多个代表性路线
         */
        testRepresentativeRoutes() {
            console.log('\n🧪 测试多个代表性路线...');
            
            const testRoutes = [
                {
                    name: "昂坪到天坛大佛",
                    distance: "1.5公里",
                    duration: "1小时",
                    location: "从大屿山东部的昂坪到天坛大佛。",
                    features: "大屿山佛教文化路线，从昂坪东涌缆车站到著名的天坛大佛。",
                    currentDifficulty: "简单"
                },
                {
                    name: "东涌到梅窝",
                    distance: "8.0公里",
                    duration: "4小时",
                    location: "从大屿山东部的东涌到南部的梅窝。",
                    features: "大屿山环岛公路的一部分，连接大屿山东部和南部的重要交通路线。",
                    currentDifficulty: "中等"
                },
                {
                    name: "梅窝到大澳",
                    distance: "12.0公里",
                    duration: "6小时",
                    location: "从大屿山东南部梅窝到西北部大澳。",
                    features: "大屿山贯穿路线，连接大屿山的东西两端。",
                    currentDifficulty: "困难"
                },
                {
                    name: "南丫岛索罟湾到榕树湾",
                    distance: "6.0公里",
                    duration: "3小时",
                    location: "从南丫岛东部的索罟湾到西部的榕树湾。",
                    features: "南丫岛东西横贯路线，连接两个主要港口。",
                    currentDifficulty: "中等"
                }
            ];

            testRoutes.forEach(route => {
                const result = this.calculator.calculateDifficulty(route);
                
                console.log(`\n📍 ${route.name}:`);
                console.log(`  当前难度: ${route.currentDifficulty}`);
                console.log(`  新难度: ${result.level}`);
                console.log(`  距离: ${route.distance}, 时长: ${route.duration}`);
                console.log(`  评分: ${result.score}`);
                console.log(`  原因: ${result.factors.reasons.join('; ')}`);
                
                this.testResults.push({
                    route: route.name,
                    oldDifficulty: route.currentDifficulty,
                    newDifficulty: result.level,
                    correct: route.currentDifficulty === result.level
                });
            });
        }

        /**
         * 批量分析所有路线（从routes.js加载）
         */
        async batchAnalyzeRoutes() {
            if (typeof window.hikingRoutes === 'undefined') {
                console.error('❌ 路线数据未加载，无法进行批量分析');
                return;
            }

            console.log('\n📈 开始批量分析所有路线...');
            console.log(`总路线数: ${window.hikingRoutes.length}`);

            const changes = [];
            const summary = { easy: 0, medium: 0, hard: 0 };
            
            window.hikingRoutes.forEach((route, index) => {
                const result = this.calculator.calculateDifficulty(route);
                
                if (route.difficulty !== result.level) {
                    changes.push({
                        id: route.id,
                        name: route.name,
                        old: route.difficulty,
                        new: result.level,
                        distance: route.distance,
                        duration: route.duration,
                        score: result.score
                    });
                }
                
                summary[result.level === '简单' ? 'easy' : 
                       result.level === '中等' ? 'medium' : 'hard']++;
                
                // 每10条路线显示一次进度
                if ((index + 1) % 10 === 0) {
                    console.log(`已处理 ${index + 1}/${window.hikingRoutes.length} 条路线`);
                }
            });

            console.log('\n📊 新分类统计:');
            console.log(`简单: ${summary.easy} 条`);
            console.log(`中等: ${summary.medium} 条`);
            console.log(`困难: ${summary.hard} 条`);

            if (changes.length > 0) {
                console.log('\n🔄 需要调整的路线 (前10条):');
                changes.slice(0, 10).forEach(change => {
                    console.log(`ID ${change.id}: ${change.name}`);
                    console.log(`  ${change.old} → ${change.new} (${change.distance}, ${change.duration}, 评分:${change.score})`);
                });
                
                if (changes.length > 10) {
                    console.log(`  ... 还有 ${changes.length - 10} 条路线需要调整`);
                }
            } else {
                console.log('\n✅ 所有路线分类都正确，无需调整');
            }

            return {
                totalRoutes: window.hikingRoutes.length,
                changes: changes,
                summary: summary
            };
        }

        /**
         * 生成难度调整建议报告
         */
        generateReport(analysisResult) {
            if (!analysisResult || analysisResult.changes.length === 0) {
                console.log('\n📋 难度分类报告: 当前分类已经很合理，无需调整');
                return;
            }

            let report = `
香港徒步路线难度分类评估报告
=================================

## 总体评估
- 总路线数: ${analysisResult.totalRoutes}
- 需要调整的路线: ${analysisResult.changes.length}
- 调整比例: ${(analysisResult.changes.length / analysisResult.totalRoutes * 100).toFixed(1)}%

## 新分类分布
- 简单级别: ${analysisResult.summary.easy} 条 (${(analysisResult.summary.easy / analysisResult.totalRoutes * 100).toFixed(1)}%)
- 中等级别: ${analysisResult.summary.medium} 条 (${(analysisResult.summary.medium / analysisResult.totalRoutes * 100).toFixed(1)}%)
- 困难级别: ${analysisResult.summary.hard} 条 (${(analysisResult.summary.hard / analysisResult.totalRoutes * 100).toFixed(1)}%)

## 主要调整建议

### 重点调整路线:
`;

            // 按调整类型分组
            const upgradeNeeded = analysisResult.changes.filter(c => c.new === '中等' || c.new === '困难');
            const downgradeNeeded = analysisResult.changes.filter(c => c.new === '简单');

            if (upgradeNeeded.length > 0) {
                report += `
#### 需要提高难度的路线 (${upgradeNeeded.length}条):
`;
                upgradeNeeded.slice(0, 5).forEach(route => {
                    report += `- ${route.name} (${route.distance}, ${route.duration})
  当前: ${route.old} → 建议: ${route.new}
  原因: 可能低估了实际徒步难度

`;
                });
            }

            if (downgradeNeeded.length > 0) {
                report += `
#### 可能需要降低难度的路线 (${downgradeNeeded.length}条):
`;
                downgradeNeeded.slice(0, 3).forEach(route => {
                    report += `- ${route.name} (${route.distance}, ${route.duration})
  当前: ${route.old} → 建议: ${route.new}
  原因: 可能高估了实际徒步难度

`;
                });
            }

            report += `
## 实施建议
1. 先调整最明显的分类错误
2. 重点关注跨海、山地等特殊地形路线
3. 结合用户反馈进一步优化分类标准
4. 定期根据实际情况调整分类算法
`;

            console.log(report);
            return report;
        }
    }

    // 等待页面加载完成后执行测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.difficultyTest = new DifficultyTest();
        });
    } else {
        window.difficultyTest = new DifficultyTest();
    }

    console.log('✅ 难度分类测试工具已加载');

})();