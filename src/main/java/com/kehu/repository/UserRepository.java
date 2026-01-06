package com.kehu.repository;

import com.kehu.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * 根据用户名查询用户（优化：使用索引查询）
     * username字段有唯一索引，查询速度很快
     */
    Optional<User> findByUsername(String username);
    
    /**
     * 使用原生SQL快速查询用户（仅查询必要字段，提高性能）
     * 用于登录验证，避免加载不必要的字段
     */
    @Query(value = "SELECT id, username, password, real_name, role FROM users WHERE username = :username LIMIT 1", nativeQuery = true)
    User findUserForLogin(@Param("username") String username);
    
    /**
     * 批量更新role为NULL的用户（优化：使用原生SQL，避免加载所有用户）
     */
    @Query(value = "UPDATE users SET role = 'VIEWER' WHERE role IS NULL OR role = ''", nativeQuery = true)
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    int updateRoleForNullUsers();
}

