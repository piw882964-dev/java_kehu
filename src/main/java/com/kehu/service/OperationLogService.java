package com.kehu.service;

import com.kehu.entity.OperationLog;
import com.kehu.repository.OperationLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OperationLogService {

    @Autowired
    private OperationLogRepository operationLogRepository;

    /**
     * 记录操作日志
     */
    @Transactional
    public OperationLog log(String username, String operation, String module, 
                           String description, String ipAddress, Long targetId, 
                           String result, String errorMessage) {
        OperationLog log = new OperationLog();
        log.setUsername(username);
        log.setOperation(operation);
        log.setModule(module);
        log.setDescription(description);
        log.setIpAddress(ipAddress);
        log.setTargetId(targetId);
        log.setResult(result);
        log.setErrorMessage(errorMessage);
        log.setOperationTime(LocalDateTime.now());
        
        return operationLogRepository.save(log);
    }

    /**
     * 记录成功操作
     */
    public OperationLog logSuccess(String username, String operation, String module, 
                                  String description, String ipAddress, Long targetId) {
        return log(username, operation, module, description, ipAddress, targetId, "SUCCESS", null);
    }

    /**
     * 记录失败操作
     */
    public OperationLog logFailure(String username, String operation, String module, 
                                  String description, String ipAddress, Long targetId, String errorMessage) {
        return log(username, operation, module, description, ipAddress, targetId, "FAILURE", errorMessage);
    }

    /**
     * 分页查询操作日志
     */
    public Page<OperationLog> getLogs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.findAll(pageable);
    }

    /**
     * 根据用户名查询日志
     */
    public Page<OperationLog> getLogsByUsername(String username, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.findByUsernameOrderByOperationTimeDesc(username, pageable);
    }

    /**
     * 根据操作类型查询日志
     */
    public Page<OperationLog> getLogsByOperation(String operation, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.findByOperationOrderByOperationTimeDesc(operation, pageable);
    }

    /**
     * 根据模块查询日志
     */
    public Page<OperationLog> getLogsByModule(String module, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.findByModuleOrderByOperationTimeDesc(module, pageable);
    }

    /**
     * 根据时间范围查询日志
     */
    public Page<OperationLog> getLogsByTimeRange(LocalDateTime startTime, LocalDateTime endTime, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.findByOperationTimeBetween(startTime, endTime, pageable);
    }

    /**
     * 高级搜索日志
     */
    public Page<OperationLog> searchLogs(String username, String operation, String module, 
                                        LocalDateTime startTime, LocalDateTime endTime, 
                                        int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return operationLogRepository.searchLogs(username, operation, module, startTime, endTime, pageable);
    }

    /**
     * 删除指定时间之前的日志（用于清理旧日志）
     */
    @Transactional
    public int deleteLogsBefore(LocalDateTime beforeTime) {
        List<OperationLog> logs = operationLogRepository.findByOperationTimeBetweenOrderByOperationTimeDesc(
            LocalDateTime.of(1970, 1, 1, 0, 0), beforeTime
        );
        int count = logs.size();
        operationLogRepository.deleteAll(logs);
        return count;
    }
}

