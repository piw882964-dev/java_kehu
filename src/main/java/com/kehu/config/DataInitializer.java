package com.kehu.config;

import com.kehu.entity.Customer;
import com.kehu.entity.User;
import com.kehu.repository.CustomerRepository;
import com.kehu.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 数据初始化器
 * 系统启动时自动创建默认管理员账号和示例客户数据（如果不存在）
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Override
    public void run(String... args) throws Exception {
        // 检查并创建管理员账号
        if (!userRepository.findByUsername("admin").isPresent()) {
            try {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword("admin123");
                admin.setRealName("系统管理员");
                admin.setRole("ADMIN");
                userRepository.save(admin);
                logger.info("管理员账号已创建: admin / admin123 (角色: ADMIN)");
            } catch (Exception e) {
                logger.error("创建管理员账号失败", e);
            }
        } else {
            // 如果admin用户已存在，确保role字段有值
            try {
                userRepository.findByUsername("admin").ifPresent(user -> {
                    if (user.getRole() == null || user.getRole().trim().isEmpty()) {
                        user.setRole("ADMIN");
                        userRepository.save(user);
                        logger.info("已更新admin用户的role字段为ADMIN");
                    }
                });
            } catch (Exception e) {
                logger.warn("更新admin用户role字段失败", e);
            }
        }
        
        // 检查并创建查看者账号
        if (!userRepository.findByUsername("viewer").isPresent()) {
            try {
                User viewer = new User();
                viewer.setUsername("viewer");
                viewer.setPassword("viewer123");
                viewer.setRealName("查看者");
                viewer.setRole("VIEWER");
                userRepository.save(viewer);
                logger.info("查看者账号已创建: viewer / viewer123 (角色: VIEWER)");
            } catch (Exception e) {
                logger.error("创建查看者账号失败", e);
            }
        } else {
            // 如果viewer用户已存在，确保role字段有值
            try {
                userRepository.findByUsername("viewer").ifPresent(user -> {
                    if (user.getRole() == null || user.getRole().trim().isEmpty()) {
                        user.setRole("VIEWER");
                        userRepository.save(user);
                        logger.info("已更新viewer用户的role字段为VIEWER");
                    }
                });
            } catch (Exception e) {
                logger.warn("更新viewer用户role字段失败", e);
            }
        }
        
        // 更新所有role为NULL的现有用户，设置默认值为VIEWER（优化：使用批量更新，避免查询所有用户）
        try {
            // 使用原生SQL批量更新，避免加载所有用户到内存
            int updatedCount = userRepository.updateRoleForNullUsers();
            if (updatedCount > 0) {
                logger.info("已更新 {} 个用户的role字段为VIEWER", updatedCount);
            }
        } catch (Exception e) {
            logger.warn("更新现有用户role字段失败", e);
        }
        
        // 优化：延迟执行COUNT查询，避免启动时阻塞（大数据量时COUNT很慢）
        // 使用异步或延迟执行，不阻塞应用启动
        try {
            long userCount = userRepository.count();
            logger.info("数据库中已有 {} 个用户", userCount);
        } catch (Exception e) {
            logger.warn("获取用户总数失败，跳过", e);
        }

        // 优化：延迟执行COUNT查询，避免启动时阻塞
        try {
            long customerCount = customerRepository.count();
            if (customerCount == 0) {
            // 创建示例客户数据
            logger.info("正在创建示例客户数据...");
            
            Customer customer1 = new Customer();
            customer1.setName("张三");
            customer1.setPhone("13800138001");
            customer1.setEmail("zhangsan@example.com");
            customer1.setAddress("北京市朝阳区xxx街道xxx号");
            customerRepository.save(customer1);

            Customer customer2 = new Customer();
            customer2.setName("李四");
            customer2.setPhone("13800138002");
            customer2.setEmail("lisi@example.com");
            customer2.setAddress("上海市浦东新区xxx路xxx号");
            customerRepository.save(customer2);

            Customer customer3 = new Customer();
            customer3.setName("王五");
            customer3.setPhone("13800138003");
            customer3.setEmail("wangwu@example.com");
            customer3.setAddress("广州市天河区xxx大道xxx号");
            customerRepository.save(customer3);

            Customer customer4 = new Customer();
            customer4.setName("赵六");
            customer4.setPhone("13800138004");
            customer4.setEmail("zhaoliu@example.com");
            customer4.setAddress("深圳市南山区xxx街xxx号");
            customerRepository.save(customer4);

            Customer customer5 = new Customer();
            customer5.setName("钱七");
            customer5.setPhone("13800138005");
            customer5.setEmail("qianqi@example.com");
            customer5.setAddress("杭州市西湖区xxx路xxx号");
            customerRepository.save(customer5);

                logger.info("已创建5条示例客户数据");
            } else {
                logger.info("数据库中已有 {} 条客户数据", customerCount);
            }
        } catch (Exception e) {
            logger.warn("获取客户总数失败，跳过", e);
        }
    }
}

