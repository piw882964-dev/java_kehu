-- ============================================
-- 客户管理系统 - 完整数据库脚本
-- 适用于免费版Navicat，可以直接执行
-- 数据库名称: customer_db
-- ============================================

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `customer_db` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `customer_db`;

-- 2. 删除已存在的表（按顺序删除，避免外键约束错误）
DROP TABLE IF EXISTS `customer_remarks`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;

-- 3. 创建用户表
CREATE TABLE `users` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '密码',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `role` VARCHAR(20) NOT NULL DEFAULT 'VIEWER' COMMENT '角色：ADMIN（管理员）或VIEWER（查看者）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 4. 创建客户表
CREATE TABLE `customers` (
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

-- 5. 创建客户备注表（可选）
CREATE TABLE `customer_remarks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '备注ID',
  `customer_id` BIGINT(20) NOT NULL COMMENT '客户ID',
  `remarks` TEXT COMMENT '备注内容',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `fk_remarks_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户备注表';

-- 6. 创建上传任务表
CREATE TABLE `upload_tasks` (
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

-- 7. 插入管理员账号
INSERT INTO `users` (`username`, `password`, `real_name`, `role`, `create_time`, `update_time`) 
VALUES ('admin', 'admin123', '系统管理员', 'ADMIN', NOW(), NOW());

-- 8. 插入查看者账号
INSERT INTO `users` (`username`, `password`, `real_name`, `role`, `create_time`, `update_time`) 
VALUES ('viewer', 'viewer123', '查看者', 'VIEWER', NOW(), NOW());

-- 9. 插入示例客户数据（50条）
INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `create_time`, `update_time`) VALUES
('张三', '13800138001', 'zhangsan@example.com', '北京市朝阳区建国路88号', NOW(), NOW()),
('李四', '13800138002', 'lisi@example.com', '上海市浦东新区世纪大道1000号', NOW(), NOW()),
('王五', '13800138003', 'wangwu@example.com', '广州市天河区天河路123号', NOW(), NOW()),
('赵六', '13800138004', 'zhaoliu@example.com', '深圳市南山区科技园南路2号', NOW(), NOW()),
('钱七', '13800138005', 'qianqi@example.com', '杭州市西湖区文三路259号', NOW(), NOW()),
('孙八', '13800138006', 'sunba@example.com', '成都市锦江区春熙路1号', NOW(), NOW()),
('周九', '13800138007', 'zhoujiu@example.com', '武汉市江汉区解放大道688号', NOW(), NOW()),
('吴十', '13800138008', 'wushi@example.com', '西安市雁塔区高新路1号', NOW(), NOW()),
('郑一', '13800138009', 'zhengyi@example.com', '南京市鼓楼区中山路321号', NOW(), NOW()),
('王二', '13800138010', 'wanger@example.com', '重庆市渝中区解放碑步行街', NOW(), NOW()),
('李三', '13800138011', 'lisan@example.com', '天津市和平区南京路219号', NOW(), NOW()),
('张四', '13800138012', 'zhangsi@example.com', '苏州市工业园区星海街200号', NOW(), NOW()),
('刘五', '13800138013', 'liuwu@example.com', '无锡市梁溪区中山路333号', NOW(), NOW()),
('陈六', '13800138014', 'chenliu@example.com', '宁波市海曙区中山西路138号', NOW(), NOW()),
('杨七', '13800138015', 'yangqi@example.com', '青岛市市南区香港中路8号', NOW(), NOW()),
('黄八', '13800138016', 'huangba@example.com', '大连市中山区人民路9号', NOW(), NOW()),
('周九', '13800138017', 'zhoujiu2@example.com', '厦门市思明区鹭江道1号', NOW(), NOW()),
('徐十', '13800138018', 'xushi@example.com', '福州市鼓楼区五四路111号', NOW(), NOW()),
('朱一', '13800138019', 'zhuyi@example.com', '济南市历下区经十路17923号', NOW(), NOW()),
('林二', '13800138020', 'liner@example.com', '郑州市金水区花园路85号', NOW(), NOW()),
('何三', '13800138021', 'hesan@example.com', '长沙市芙蓉区五一大道389号', NOW(), NOW()),
('罗四', '13800138022', 'luosi@example.com', '南昌市东湖区八一大道357号', NOW(), NOW()),
('高五', '13800138023', 'gaowu@example.com', '合肥市庐阳区长江中路369号', NOW(), NOW()),
('梁六', '13800138024', 'liangliu@example.com', '石家庄市长安区中山东路265号', NOW(), NOW()),
('谢七', '13800138025', 'xieqi@example.com', '太原市小店区长风街123号', NOW(), NOW()),
('宋八', '13800138026', 'songba@example.com', '呼和浩特市新城区中山东路8号', NOW(), NOW()),
('唐九', '13800138027', 'tangjiu@example.com', '沈阳市和平区南京北街206号', NOW(), NOW()),
('许十', '13800138028', 'xushi2@example.com', '长春市朝阳区人民大街2888号', NOW(), NOW()),
('韩一', '13800138029', 'hanyi@example.com', '哈尔滨市南岗区中山路111号', NOW(), NOW()),
('冯二', '13800138030', 'fenger@example.com', '昆明市五华区翠湖南路2号', NOW(), NOW()),
('于三', '13800138031', 'yusan@example.com', '贵阳市云岩区中华中路111号', NOW(), NOW()),
('董四', '13800138032', 'dongsi@example.com', '南宁市青秀区民族大道88号', NOW(), NOW()),
('萧五', '13800138033', 'xiaowu@example.com', '海口市龙华区国贸路2号', NOW(), NOW()),
('程六', '13800138034', 'chengliu@example.com', '兰州市城关区庆阳路77号', NOW(), NOW()),
('曹七', '13800138035', 'caoqi@example.com', '银川市兴庆区解放西街2号', NOW(), NOW()),
('袁八', '13800138036', 'yuanba@example.com', '西宁市城西区西关大街58号', NOW(), NOW()),
('邓九', '13800138037', 'dengjiu@example.com', '乌鲁木齐市天山区人民路1号', NOW(), NOW()),
('许十', '13800138038', 'xushi3@example.com', '拉萨市城关区北京中路65号', NOW(), NOW()),
('傅一', '13800138039', 'fuyi@example.com', '拉萨市城关区江苏路1号', NOW(), NOW()),
('沈二', '13800138040', 'shener@example.com', '拉萨市城关区金珠东路1号', NOW(), NOW()),
('曾三', '13800138041', 'zengsan@example.com', '拉萨市城关区北京东路1号', NOW(), NOW()),
('彭四', '13800138042', 'pengsi@example.com', '拉萨市城关区江苏路2号', NOW(), NOW()),
('吕五', '13800138043', 'lvwu@example.com', '拉萨市城关区金珠东路2号', NOW(), NOW()),
('苏六', '13800138044', 'suliu@example.com', '拉萨市城关区北京东路2号', NOW(), NOW()),
('卢七', '13800138045', 'luqi@example.com', '拉萨市城关区江苏路3号', NOW(), NOW()),
('蒋八', '13800138046', 'jiangba@example.com', '拉萨市城关区金珠东路3号', NOW(), NOW()),
('蔡九', '13800138047', 'caijiu@example.com', '拉萨市城关区北京东路3号', NOW(), NOW()),
('贾十', '13800138048', 'jiashi@example.com', '拉萨市城关区江苏路4号', NOW(), NOW()),
('丁一', '13800138049', 'dingyi@example.com', '拉萨市城关区金珠东路4号', NOW(), NOW()),
('魏二', '13800138050', 'weier@example.com', '拉萨市城关区北京东路4号', NOW(), NOW());

-- 完成提示
SELECT '数据库初始化完成！' AS '提示';
SELECT '管理员账号: admin / admin123' AS '账号信息';
SELECT '查看者账号: viewer / viewer123' AS '账号信息';
SELECT COUNT(*) AS '用户数量' FROM `users`;
SELECT COUNT(*) AS '客户数量' FROM `customers`;

