package com.kehu.repository;

import com.kehu.entity.CustomerRemark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRemarkRepository extends JpaRepository<CustomerRemark, Long> {
    /**
     * 根据客户ID查找备注
     * @param customerId 客户ID
     * @return 备注信息
     */
    Optional<CustomerRemark> findByCustomerId(Long customerId);
}

