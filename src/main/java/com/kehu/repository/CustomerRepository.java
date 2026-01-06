package com.kehu.repository;

import com.kehu.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByNameContaining(String name);
    Page<Customer> findByNameContaining(String name, Pageable pageable);
    Optional<Customer> findByPhone(String phone);
    
    /**
     * 批量查询电话是否已存在（用于导入优化）
     * @param phones 电话列表
     * @return 已存在的电话列表
     */
    @Query("SELECT c.phone FROM Customer c WHERE c.phone IN :phones AND c.phone IS NOT NULL")
    List<String> findPhonesByPhoneIn(@Param("phones") List<String> phones);
    
    /**
     * 查询今日新增客户数量（优化：使用索引字段查询）
     * @param startOfDay 今日开始时间
     * @param endOfDay 今日结束时间
     * @return 今日新增数量
     */
    @Query(value = "SELECT COUNT(*) FROM customers WHERE create_time >= :startOfDay AND create_time <= :endOfDay", nativeQuery = true)
    long countByCreateTimeBetween(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);
    
    /**
     * 高级搜索：多条件组合查询
     */
    @Query("SELECT c FROM Customer c WHERE " +
           "(:name IS NULL OR c.name LIKE %:name%) AND " +
           "(:phone IS NULL OR c.phone LIKE %:phone%) AND " +
           "(:email IS NULL OR c.email LIKE %:email%) AND " +
           "(:address IS NULL OR c.address LIKE %:address%) AND " +
           "(:startTime IS NULL OR c.createTime >= :startTime) AND " +
           "(:endTime IS NULL OR c.createTime <= :endTime) AND " +
           "(:uploadTaskId IS NULL OR c.uploadTaskId = :uploadTaskId)")
    Page<Customer> advancedSearch(
        @Param("name") String name,
        @Param("phone") String phone,
        @Param("email") String email,
        @Param("address") String address,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        @Param("uploadTaskId") Long uploadTaskId,
        Pageable pageable
    );
}

