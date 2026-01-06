-- 客户管理系统数据库初始化脚本
-- 数据库名称: customer_db
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `customer_db` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `customer_db`;

-- 删除已存在的表（谨慎使用，会清空数据）
-- 注意：如果表已存在且需要重新创建，请取消下面的注释
DROP TABLE IF EXISTS `upload_tasks`;
DROP TABLE IF EXISTS `customer_remarks`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;

-- 创建客户表
CREATE TABLE IF NOT EXISTS `customers` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '客户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
  `address` VARCHAR(200) DEFAULT NULL COMMENT '详细地址',
  `upload_task_id` BIGINT(20) DEFAULT NULL COMMENT '关联的上传任务ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信息表';

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '密码',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建备注表（可选，用于存储客户备注信息）
CREATE TABLE IF NOT EXISTS `customer_remarks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '备注ID',
  `customer_id` BIGINT(20) NOT NULL COMMENT '客户ID',
  `remarks` TEXT COMMENT '备注内容',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `fk_remarks_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户备注表';

-- 创建上传任务表
CREATE TABLE IF NOT EXISTS `upload_tasks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `total_count` INT(11) NOT NULL DEFAULT 0 COMMENT '总数目',
  `added_count` INT(11) NOT NULL DEFAULT 0 COMMENT '添加数目',
  `existing_count` INT(11) NOT NULL DEFAULT 0 COMMENT '存在数目',
  `status` VARCHAR(50) DEFAULT '处理中' COMMENT '状态：处理中、添加完成、处理失败',
  `upload_time` DATETIME NOT NULL COMMENT '上传时间',
  `complete_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `remarks` TEXT COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_upload_time` (`upload_time`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传任务表';