/*
 Navicat Premium Data Transfer

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80030 (8.0.30)
 Source Host           : localhost:3306
 Source Schema         : bridge_monitor

 Target Server Type    : MySQL
 Target Server Version : 80030 (8.0.30)
 File Encoding         : 65001

 Date: 14/01/2026 18:11:37
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for alarms
-- ----------------------------
DROP TABLE IF EXISTS `alarms`;
CREATE TABLE `alarms`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sensor_id` int NOT NULL,
  `val` decimal(14, 6) NULL DEFAULT NULL,
  `msg` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_handled` tinyint NULL DEFAULT 0 COMMENT '0:未处理 1:处理中 2:已解决',
  `handled_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '处理人',
  `handled_at` datetime NULL DEFAULT NULL COMMENT '处理时间',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sensor_id`(`sensor_id` ASC) USING BTREE,
  CONSTRAINT `alarms_ibfk_1` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1139 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of alarms
-- ----------------------------

-- ----------------------------
-- Table structure for bridges
-- ----------------------------
DROP TABLE IF EXISTS `bridges`;
CREATE TABLE `bridges`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `lng` decimal(10, 6) NULL DEFAULT NULL COMMENT '地图经度',
  `lat` decimal(10, 6) NULL DEFAULT NULL COMMENT '地图纬度',
  `image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '桥梁外观图路径',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of bridges
-- ----------------------------
INSERT INTO `bridges` VALUES (1, '南大桥', '秦州区', 105.722300, 34.575574, '/assets/bridge_1_full.jpg', '2026-01-01 16:48:05');
INSERT INTO `bridges` VALUES (3, '测试桥2', '甘谷县', 105.386500, 34.758900, '/assets/bridge_3_full.jpg', '2026-01-01 16:48:05');

-- ----------------------------
-- Table structure for sections
-- ----------------------------
DROP TABLE IF EXISTS `sections`;
CREATE TABLE `sections`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `bridge_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `lng` decimal(10, 6) NULL DEFAULT NULL COMMENT '精确经度',
  `lat` decimal(10, 6) NULL DEFAULT NULL COMMENT '精确纬度',
  `pos_x` decimal(5, 2) NULL DEFAULT NULL COMMENT '在桥梁图X%',
  `pos_y` decimal(5, 2) NULL DEFAULT NULL COMMENT '在桥梁图Y%',
  `image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '断面结构剖面图路径',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `bridge_id`(`bridge_id` ASC) USING BTREE,
  CONSTRAINT `sections_ibfk_1` FOREIGN KEY (`bridge_id`) REFERENCES `bridges` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sections
-- ----------------------------
INSERT INTO `sections` VALUES (11, 1, '南大桥-主跨1', '受力最大处', 105.895500, 34.571250, 50.00, 40.00, '/assets/section_box.png');
INSERT INTO `sections` VALUES (12, 1, '南大桥-主跨2', '塔顶区域', 105.895100, 34.571100, 20.00, 20.00, '/assets/section_tower.png');
INSERT INTO `sections` VALUES (31, 3, '测试桥2-主跨1', '最高点', 105.726789, 34.586789, 50.00, 10.00, '/assets/section_arch.png');
INSERT INTO `sections` VALUES (32, 3, '测试桥2-主跨2', '基础点', 105.726500, 34.586500, 20.00, 90.00, '/assets/section_base.png');
INSERT INTO `sections` VALUES (33, 3, '测试桥2-主跨3', '边缘点', 105.726900, 34.586900, 80.00, 85.00, '/assets/section_rail.png');

-- ----------------------------
-- Table structure for sensor_data
-- ----------------------------
DROP TABLE IF EXISTS `sensor_data`;
CREATE TABLE `sensor_data`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sensor_id` int NOT NULL,
  `sensor_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(14, 6) NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_code_time`(`sensor_code` ASC, `created_at` ASC) USING BTREE,
  INDEX `sensor_id`(`sensor_id` ASC) USING BTREE,
  CONSTRAINT `sensor_data_ibfk_1` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 20437 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sensor_data
-- ----------------------------

-- ----------------------------
-- Table structure for sensors
-- ----------------------------
DROP TABLE IF EXISTS `sensors`;
CREATE TABLE `sensors`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `sensor_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sensor_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `sensor_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'strain, disp, press, vib, rebar',
  `limit_max` decimal(10, 4) NULL DEFAULT NULL,
  `limit_min` decimal(10, 4) NULL DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `pos_x` decimal(5, 2) NULL DEFAULT NULL COMMENT '在剖面图X%',
  `pos_y` decimal(5, 2) NULL DEFAULT NULL COMMENT '在剖面图Y%',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `sensor_code`(`sensor_code` ASC) USING BTREE,
  INDEX `section_id`(`section_id` ASC) USING BTREE,
  CONSTRAINT `sensors_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 30 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sensors
-- ----------------------------
INSERT INTO `sensors` VALUES (4, 11, 'B1_MID_VIB_01', '桥面震动', 'vib', 0.8000, -1.0000, 'g', 50.00, 10.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (5, 12, 'B1_TOW_VIB_01', 'X震动', 'vib', 1.0000, -1.0000, 'g', 40.00, 5.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (6, 12, 'B1_TOW_VIB_02', 'Y震动', 'vib', 1.0000, -1.0000, 'g', 60.00, 5.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (7, 12, 'B1_TOW_DISP_01', '倾斜', 'press', 0.2000, -0.2000, '°', 50.00, 2.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (21, 31, 'Q2-S1-WY1', '梁端位移', 'disp', 50.0000, -1.0000, 'mm', 50.00, 15.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (22, 31, 'Q2-S2-QX1', '倾斜角', 'press', 5.0000, -5.0000, '°', 50.00, 25.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (23, 31, 'Q2-S5-ND2', '挠度', 'rebar', 30.0000, -30.0000, 'mm', 55.00, 25.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (24, 32, 'Q2_S4_ND1', '挠度测量仪', 'rebar', 30.0000, -30.0000, 'mm', 50.00, 95.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (25, 32, 'Q2_S5-ZD2', '梁体振动', 'vib', 3.0000, 0.5000, 'Hz', 60.00, 95.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (26, 33, 'B3_WAL_DISP_01', '梁端位移', 'disp', 20.0000, -1.0000, 'mm', 90.00, 50.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (27, 33, 'B3_WAL_VIB_01', '梁体振动', 'vib', 2.0000, 0.3000, 'Hz', 10.00, 50.00, '2026-01-01 16:48:05');
INSERT INTO `sensors` VALUES (28, 31, 'Q2-S6-WY1', '梁体振动', 'vib', 3.0000, 0.5000, 'Hz', NULL, NULL, '2026-01-12 16:03:53');
INSERT INTO `sensors` VALUES (29, 11, 'B1-S2-QX1', '倾斜角', 'press', 5.0000, -5.0000, '°', NULL, NULL, '2026-01-14 09:40:30');

-- ----------------------------
-- Table structure for sys_logs
-- ----------------------------
DROP TABLE IF EXISTS `sys_logs`;
CREATE TABLE `sys_logs`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL COMMENT '操作人ID (可选)',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作人账号快照',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '动作类型: LOGIN, UPDATE_SENSOR, HANDLE_ALARM...',
  `ip_addr` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作IP',
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '详细描述/参数JSON',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 79 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sys_logs
-- ----------------------------

-- ----------------------------
-- Table structure for sys_users
-- ----------------------------
DROP TABLE IF EXISTS `sys_users`;
CREATE TABLE `sys_users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '登录账号',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '加密密码 (测试用明文)',
  `real_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '真实姓名',
  `role` enum('admin','user','guest') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'guest' COMMENT '角色: admin-管理员, user-普通用户, guest-访客',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '邮箱地址',
  `status` tinyint NULL DEFAULT 1 COMMENT '状态 1:启用 0:禁用',
  `last_login_at` datetime NULL DEFAULT NULL COMMENT '最后登录时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sys_users
-- ----------------------------
INSERT INTO `sys_users` VALUES (1, 'admin', '$2a$10$Q.KDpax/OVBNMw/BVd0BYueZ4LtAnYkrHQj.5ejVNAbKZ7haBM5.O', '系统管理员', 'admin', NULL, NULL, 1, '2026-01-14 17:56:24', '2026-01-14 17:56:24', '2026-01-01 16:48:05');
INSERT INTO `sys_users` VALUES (2, 'operator', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '值班员李工', 'user', NULL, NULL, 1, NULL, '2026-01-13 11:36:37', '2026-01-01 16:48:05');
INSERT INTO `sys_users` VALUES (3, 'guest', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '领导视察', 'guest', NULL, NULL, 1, NULL, '2026-01-13 11:36:37', '2026-01-01 16:48:05');

SET FOREIGN_KEY_CHECKS = 1;
