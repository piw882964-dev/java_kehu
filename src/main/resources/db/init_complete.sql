-- ============================================
-- 客户管理系统 - 完整数据库初始化脚本
-- 可以直接在Navicat中执行此脚本
-- 数据库名称: customer_db
-- 密码: 123456
-- ============================================

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `customer_db` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `customer_db`;

-- 2. 创建用户表
DROP TABLE IF EXISTS `users`;
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

-- 3. 创建客户表
DROP TABLE IF EXISTS `customers`;
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

-- 4. 创建客户备注表（可选）
DROP TABLE IF EXISTS `customer_remarks`;
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

-- 5. 插入默认管理员账号和查看者账号
INSERT INTO `users` (`username`, `password`, `real_name`, `role`, `create_time`, `update_time`) VALUES
('admin', 'admin123', '系统管理员', 'ADMIN', NOW(), NOW()),
('viewer', 'viewer123', '查看者', 'VIEWER', NOW(), NOW())
ON DUPLICATE KEY UPDATE `update_time` = NOW();

-- 6. 插入示例客户数据（50条）
INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `create_time`, `update_time`) VALUES
('张三', '13800138001', 'zhangsan@example.com', '北京市朝阳区建国路88号', NOW(), NOW()),
('李四', '13800138002', 'lisi@example.com', '上海市浦东新区世纪大道1000号', NOW(), NOW()),
('王五', '13800138003', 'wangwu@example.com', '广州市天河区天河路123号', NOW(), NOW()),
('赵六', '13800138004', 'zhaoliu@example.com', '深圳市南山区科技园南路2号', NOW(), NOW()),
('钱七', '13800138005', 'qianqi@example.com', '杭州市西湖区文三路259号', NOW(), NOW()),
('孙八', '13800138006', 'sunba@example.com', '成都市锦江区春熙路1号', NOW(), NOW()),
('周九', '13800138007', 'zhoujiu@example.com', '武汉市武昌区中南路99号', NOW(), NOW()),
('吴十', '13800138008', 'wushi@example.com', '西安市雁塔区高新路88号', NOW(), NOW()),
('郑一', '13800138009', 'zhengyi@example.com', '南京市鼓楼区中山路200号', NOW(), NOW()),
('王二', '13800138010', 'wanger@example.com', '重庆市渝中区解放碑步行街', NOW(), NOW()),
('刘三', '13800138011', 'liusan@example.com', '天津市和平区南京路101号', NOW(), NOW()),
('陈四', '13800138012', 'chensi@example.com', '苏州市工业园区星海街200号', NOW(), NOW()),
('杨五', '13800138013', 'yangwu@example.com', '无锡市梁溪区中山路188号', NOW(), NOW()),
('黄六', '13800138014', 'huangliu@example.com', '宁波市海曙区中山西路138号', NOW(), NOW()),
('徐七', '13800138015', 'xuqi@example.com', '青岛市市南区香港中路10号', NOW(), NOW()),
('朱八', '13800138016', 'zhuba@example.com', '大连市中山区人民路15号', NOW(), NOW()),
('林九', '13800138017', 'linjiu@example.com', '厦门市思明区厦禾路189号', NOW(), NOW()),
('何十', '13800138018', 'heshi@example.com', '福州市鼓楼区五四路111号', NOW(), NOW()),
('高十一', '13800138019', 'gaoshiyi@example.com', '济南市历下区泉城路180号', NOW(), NOW()),
('梁十二', '13800138020', 'liangshier@example.com', '郑州市金水区花园路88号', NOW(), NOW()),
('罗十三', '13800138021', 'luoshisan@example.com', '长沙市芙蓉区五一大道389号', NOW(), NOW()),
('宋十四', '13800138022', 'songshisi@example.com', '南昌市东湖区八一大道357号', NOW(), NOW()),
('唐十五', '13800138023', 'tangshiwu@example.com', '合肥市庐阳区长江中路369号', NOW(), NOW()),
('许十六', '13800138024', 'xushiliu@example.com', '石家庄市长安区中山东路265号', NOW(), NOW()),
('韩十七', '13800138025', 'hanshiqi@example.com', '太原市迎泽区迎泽大街269号', NOW(), NOW()),
('冯十八', '13800138026', 'fengshiba@example.com', '呼和浩特市赛罕区新华大街1号', NOW(), NOW()),
('于十九', '13800138027', 'yushijiu@example.com', '沈阳市和平区南京北街206号', NOW(), NOW()),
('董二十', '13800138028', 'dongershi@example.com', '长春市朝阳区人民大街1888号', NOW(), NOW()),
('萧二十一', '13800138029', 'xiaoshiyi@example.com', '哈尔滨市道里区中央大街1号', NOW(), NOW()),
('程二十二', '13800138030', 'chengershier@example.com', '昆明市五华区翠湖南路2号', NOW(), NOW()),
('曹二十三', '13800138031', 'caoshisan@example.com', '贵阳市云岩区中华中路111号', NOW(), NOW()),
('袁二十四', '13800138032', 'yuanshisi@example.com', '南宁市青秀区民族大道88号', NOW(), NOW()),
('邓二十五', '13800138033', 'dengshiwu@example.com', '海口市龙华区国贸大道1号', NOW(), NOW()),
('许二十六', '13800138034', 'xushiliu2@example.com', '兰州市城关区庆阳路292号', NOW(), NOW()),
('傅二十七', '13800138035', 'fushiqi@example.com', '银川市兴庆区解放西街2号', NOW(), NOW()),
('沈二十八', '13800138036', 'shenshiba@example.com', '西宁市城中区西大街12号', NOW(), NOW()),
('曾二十九', '13800138037', 'zengshijiu@example.com', '乌鲁木齐市天山区人民路1号', NOW(), NOW()),
('彭三十', '13800138038', 'pengsanshi@example.com', '拉萨市城关区北京中路65号', NOW(), NOW()),
('吕三十一', '13800138039', 'lvshiyi@example.com', '拉萨市城关区江苏路1号', NOW(), NOW()),
('苏三十二', '13800138040', 'susanshier@example.com', '拉萨市城关区金珠东路38号', NOW(), NOW()),
('卢三十三', '13800138041', 'lushisan@example.com', '拉萨市城关区北京东路10号', NOW(), NOW()),
('蒋三十四', '13800138042', 'jiangshisi@example.com', '拉萨市城关区林廓北路26号', NOW(), NOW()),
('蔡三十五', '13800138043', 'caishiwu@example.com', '拉萨市城关区娘热路1号', NOW(), NOW()),
('贾三十六', '13800138044', 'jiashiliu@example.com', '拉萨市城关区当热中路1号', NOW(), NOW()),
('丁三十七', '13800138045', 'dingshiqi@example.com', '拉萨市城关区色拉路1号', NOW(), NOW()),
('魏三十八', '13800138046', 'weishiba@example.com', '拉萨市城关区纳金路1号', NOW(), NOW()),
('薛三十九', '13800138047', 'xueshijiu@example.com', '拉萨市城关区夺底路1号', NOW(), NOW()),
('叶四十', '13800138048', 'yesishi@example.com', '拉萨市城关区扎基路1号', NOW(), NOW()),
('阎四十一', '13800138049', 'yanshiyi@example.com', '拉萨市城关区八一路1号', NOW(), NOW()),
('余四十二', '13800138050', 'yushier@example.com', '拉萨市城关区堆龙德庆区1号', NOW(), NOW());

-- 7. 验证数据
SELECT '数据库初始化完成！' AS '提示';
SELECT COUNT(*) AS '用户数量' FROM users;
SELECT COUNT(*) AS '客户数量' FROM customers;
SELECT '默认管理员账号: admin / admin123' AS '登录信息';

