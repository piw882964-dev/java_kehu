package com.kehu.service;

import com.kehu.entity.User;
import com.kehu.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    /**
     * 查找用户名（只读操作，不需要事务）
     */
    @Transactional(readOnly = true)
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * 保存用户（需要事务）
     */
    @Transactional
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    /**
     * 验证用户登录（优化：使用只读事务，避免回滚问题）
     * @param username 用户名
     * @param password 密码（明文）
     * @return 验证成功返回User对象，失败返回null
     */
    @Transactional(readOnly = true, noRollbackFor = Exception.class)
    public User validateUser(String username, String password) {
        try {
            // 优先使用标准查询（更稳定，使用JPA管理，避免原生SQL的事务问题）
            Optional<User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                // 简单密码验证（实际项目中应使用加密密码，如BCrypt）
                if (user.getPassword() != null && user.getPassword().equals(password)) {
                    return user;
                }
            }
        } catch (Exception e) {
            // 查询失败，记录日志但不抛出异常，返回null
            org.slf4j.LoggerFactory.getLogger(UserService.class).warn("登录验证查询失败: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 获取用户总数（只读操作）
     * @return 用户总数
     */
    @Transactional(readOnly = true)
    public long getTotalCount() {
        return userRepository.count();
    }
}

