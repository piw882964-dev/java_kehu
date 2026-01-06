package com.kehu.repository;

import com.kehu.entity.OperationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OperationLogRepository extends JpaRepository<OperationLog, Long> {
    
    Page<OperationLog> findByUsernameOrderByOperationTimeDesc(String username, Pageable pageable);
    
    Page<OperationLog> findByOperationOrderByOperationTimeDesc(String operation, Pageable pageable);
    
    Page<OperationLog> findByModuleOrderByOperationTimeDesc(String module, Pageable pageable);
    
    @Query("SELECT o FROM OperationLog o WHERE o.operationTime >= :startTime AND o.operationTime <= :endTime ORDER BY o.operationTime DESC")
    Page<OperationLog> findByOperationTimeBetween(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        Pageable pageable
    );
    
    @Query("SELECT o FROM OperationLog o WHERE " +
           "(:username IS NULL OR o.username LIKE %:username%) AND " +
           "(:operation IS NULL OR o.operation = :operation) AND " +
           "(:module IS NULL OR o.module = :module) AND " +
           "(:startTime IS NULL OR o.operationTime >= :startTime) AND " +
           "(:endTime IS NULL OR o.operationTime <= :endTime) " +
           "ORDER BY o.operationTime DESC")
    Page<OperationLog> searchLogs(
        @Param("username") String username,
        @Param("operation") String operation,
        @Param("module") String module,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        Pageable pageable
    );
    
    List<OperationLog> findByOperationTimeBetweenOrderByOperationTimeDesc(
        LocalDateTime startTime,
        LocalDateTime endTime
    );
}

