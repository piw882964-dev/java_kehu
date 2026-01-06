package com.kehu.service;

import com.kehu.entity.UploadTask;
import com.kehu.repository.UploadTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UploadTaskService {

    @Autowired
    private UploadTaskRepository uploadTaskRepository;

    /**
     * 保存上传任务（独立事务，立即提交，避免连接泄漏）
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public UploadTask saveTask(UploadTask task) {
        return uploadTaskRepository.save(task);
    }

    /**
     * 根据ID获取任务（只读事务）
     */
    @Transactional(readOnly = true)
    public Optional<UploadTask> getTaskById(Long id) {
        return uploadTaskRepository.findById(id);
    }

    /**
     * 获取所有任务（分页，按ID倒序）
     */
    @Transactional(readOnly = true)
    public Page<UploadTask> getAllTasks(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return uploadTaskRepository.findAll(pageable);
    }

    /**
     * 获取所有任务（不分页，按ID倒序）
     */
    @Transactional(readOnly = true)
    public List<UploadTask> getAllTasks() {
        return uploadTaskRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    /**
     * 删除任务
     */
    @Transactional
    public void deleteTask(Long id) {
        uploadTaskRepository.deleteById(id);
    }

    /**
     * 批量删除任务
     */
    @Transactional
    public void deleteTasks(List<Long> ids) {
        uploadTaskRepository.deleteAllById(ids);
    }

    /**
     * 根据状态查询任务
     */
    @Transactional(readOnly = true)
    public List<UploadTask> getTasksByStatus(String status) {
        return uploadTaskRepository.findByStatusOrderByIdDesc(status);
    }
}

