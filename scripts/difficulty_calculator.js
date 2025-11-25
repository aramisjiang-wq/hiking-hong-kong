// 香港徒步路线智能难度分类系统
// 基于距离、时长、地形特征的合理分类算法

(function() {
    'use strict';

    /**
     * 难度计算器类
     * 根据路线的实际特征计算合理的难度等级
     */
    class DifficultyCalculator {
        constructor() {
            // 分类阈值设置
            this.thresholds = {
                easy: {
                    maxDistance: 4.0,      // 简单级别最大距离（公里）
                    maxDuration: 2.5       // 简单级别最大时长（小时）
                },
                medium: {
                    minDistance: 3.0,      // 中等级别最小距离（公里）
                    minDuration: 1.5,      // 中等级别最小时长（小时）
                    maxDistance: 8.0,      // 中等级别最大距离（公里）
                    maxDuration: 4.5       // 中等级别最大时长（小时）
                }
            };
            
            // 地形调整因子
            this.terrainFactors = {
                '城市路面': 1.0,      // 城市道路，平坦易走
                '海滨路线': 1.1,      // 海滨道路，有一定变化
                '跨海路线': 1.3,      // 跨海/跨桥路线，需要额外体力
                '山地路线': 1.5,      // 山地徒步，地形复杂
                '海岸线路': 1.4,      // 海岸线路，有起伏
                '岛屿路线': 1.2       // 岛屿内部路线
            };
        }

        /**
         * 计算路线的实际难度
         * @param {Object} route - 路线数据对象
         * @returns {Object} 包含难度等级和计算详情的对象
         */
        calculateDifficulty(route) {
            const distance = this.parseDistance(route.distance);
            const duration = this.parseDuration(route.duration);
            const location = route.location || '';
            const features = route.features || '';

            // 计算基础难度分数
            let baseScore = this.calculateBaseScore(distance, duration);
            
            // 根据地形特征调整难度
            const terrainMultiplier = this.getTerrainMultiplier(location, features);
            const adjustedScore = baseScore * terrainMultiplier;

            // 确定难度等级
            const difficulty = this.getDifficultyLevel(adjustedScore, distance, duration, terrainMultiplier);

            return {
                level: difficulty.level,
                color: difficulty.color,
                score: Math.round(adjustedScore * 100) / 100,
                factors: {
                    distance: distance,
                    duration: duration,
                    baseScore: baseScore,
                    terrainMultiplier: terrainMultiplier,
                    reasons: difficulty.reasons
                }
            };
        }

        /**
         * 计算基础难度分数
         * @param {number} distance - 距离（公里）
         * @param {number} duration - 时长（小时）
         * @returns {number} 基础分数
         */
        calculateBaseScore(distance, duration) {
            // 距离权重：每公里 1.5分
            const distanceScore = distance * 1.5;
            
            // 时长权重：每小时 2分
            const durationScore = duration * 2;
            
            // 综合评分（考虑实际徒步体验）
            return (distanceScore + durationScore) / 2;
        }

        /**
         * 根据位置和特征获取地形调整因子
         * @param {string} location - 位置描述
         * @param {string} features - 路线特征描述
         * @returns {number} 地形调整因子
         */
        getTerrainMultiplier(location, features) {
            const text = (location + ' ' + features).toLowerCase();
            
            // 跨海/跨桥路线（最费力）
            if (text.includes('跨海') || text.includes('桥') || text.includes('荃湾') && text.includes('青衣')) {
                return 1.4;
            }
            
            // 山地路线
            if (text.includes('山') || text.includes('峰') || text.includes('岭') || text.includes('坡')) {
                return 1.5;
            }
            
            // 海岸线路
            if (text.includes('海岸') || text.includes('海滨') || text.includes('海滩')) {
                return 1.2;
            }
            
            // 岛屿路线
            if (text.includes('岛') && !text.includes('跨')) {
                return 1.1;
            }
            
            // 城市/平地路线
            return 1.0;
        }

        /**
         * 根据调整后的分数确定难度等级
         * @param {number} score - 调整后的分数
         * @param {number} distance - 距离
         * @param {number} duration - 时长
         * @param {number} terrainMultiplier - 地形调整因子
         * @returns {Object} 难度等级信息
         */
        getDifficultyLevel(score, distance, duration, terrainMultiplier) {
            const reasons = [];

            // 困难级别判断
            if (distance > 8 || duration > 4.5 || score > 6) {
                reasons.push(`距离${distance}公里超过8公里`);
                reasons.push(`时长${duration}小时超过4.5小时`);
                reasons.push(`综合评分${score.toFixed(1)}超过困难阈值`);
                return {
                    level: '困难',
                    color: '#ef4444',
                    reasons: reasons
                };
            }

            // 中等级别判断（包含特殊情况处理）
            const isMediumByDistance = distance >= 3.5 && distance <= 8;
            const isMediumByDuration = duration >= 2 && duration <= 4.5;
            const isMediumByScore = score >= 3 && score <= 6;
            const isCrossSeaRoute = terrainMultiplier >= 1.3; // 跨海路线特殊处理
            
            if (isMediumByDistance || isMediumByDuration || isMediumByScore || isCrossSeaRoute) {
                if (isCrossSeaRoute) {
                    reasons.push('跨海路线需要额外体力');
                }
                if (isMediumByDistance) {
                    reasons.push(`距离${distance}公里适合中等强度徒步`);
                }
                if (isMediumByDuration) {
                    reasons.push(`时长${duration}小时需要持续体力`);
                }
                if (isMediumByScore) {
                    reasons.push(`综合评分${score.toFixed(1)}达到中等标准`);
                }
                
                return {
                    level: '中等',
                    color: '#f59e0b',
                    reasons: reasons
                };
            }

            // 简单级别
            reasons.push(`距离${distance}公里适合休闲徒步`);
            reasons.push(`时长${duration}小时强度适中`);
            reasons.push(`综合评分${score.toFixed(1)}符合简单标准`);
            
            return {
                level: '简单',
                color: '#10b981',
                reasons: reasons
            };
        }

        /**
         * 解析距离字符串为数字
         * @param {string} distanceStr - 距离字符串
         * @returns {number} 距离数值（公里）
         */
        parseDistance(distanceStr) {
            if (!distanceStr) return 0;
            const match = distanceStr.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : 0;
        }

        /**
         * 解析时长字符串为小时数
         * @param {string} durationStr - 时长字符串
         * @returns {number} 时长数值（小时）
         */
        parseDuration(durationStr) {
            if (!durationStr) return 0;
            
            let totalHours = 0;
            
            // 匹配小时
            const hourMatch = durationStr.match(/(\d+\.?\d*)小时/);
            if (hourMatch) {
                totalHours += parseFloat(hourMatch[1]);
            }
            
            // 匹配分钟
            const minuteMatch = durationStr.match(/(\d+)分钟/);
            if (minuteMatch) {
                totalHours += parseInt(minuteMatch[1]) / 60;
            }
            
            return totalHours;
        }

        /**
         * 批量重新计算所有路线的难度
         * @param {Array} routes - 路线数据数组
         * @returns {Array} 包含新难度计算的路线数组
         */
        recalculateAllRoutes(routes) {
            return routes.map(route => {
                const newDifficulty = this.calculateDifficulty(route);
                
                return {
                    ...route,
                    difficulty: newDifficulty.level,
                    difficultyColor: newDifficulty.color,
                    difficultyScore: newDifficulty.score,
                    difficultyFactors: newDifficulty.factors
                };
            });
        }
    }

    // 导出到全局作用域
    window.DifficultyCalculator = DifficultyCalculator;

    console.log('✅ 香港徒步路线智能难度分类系统已加载');

})();