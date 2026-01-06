package com.kehu.repository;

import com.kehu.entity.UploadTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UploadTaskRepository extends JpaRepository<UploadTask, Long> {
    // 按ID倒序查询（最新的在前面）
    Page<UploadTask> findAllByOrderByIdDesc(Pageable pageable);
    
    // 根据状态查询任务
    List<UploadTask> findByStatusOrderByIdDesc(String status);
}

