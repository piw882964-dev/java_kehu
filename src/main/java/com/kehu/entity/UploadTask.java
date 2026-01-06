package com.kehu.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "upload_tasks")
public class UploadTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "total_count", nullable = false)
    private Integer totalCount = 0;

    @Column(name = "added_count", nullable = false)
    private Integer addedCount = 0;

    @Column(name = "existing_count", nullable = false)
    private Integer existingCount = 0;

    @Column(name = "error_count", nullable = false)
    private Integer errorCount = 0;

    @Column(name = "status", length = 50)
    private String status = "处理中"; // 处理中、添加完成、处理失败

    @Column(name = "upload_time", nullable = false)
    private LocalDateTime uploadTime;

    @Column(name = "complete_time")
    private LocalDateTime completeTime;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @PrePersist
    protected void onCreate() {
        uploadTime = LocalDateTime.now();
        if (status == null) {
            status = "处理中";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if ("添加完成".equals(status) || "处理失败".equals(status)) {
            if (completeTime == null) {
                completeTime = LocalDateTime.now();
            }
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Integer getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }

    public Integer getAddedCount() {
        return addedCount;
    }

    public void setAddedCount(Integer addedCount) {
        this.addedCount = addedCount;
    }

    public Integer getExistingCount() {
        return existingCount;
    }

    public void setExistingCount(Integer existingCount) {
        this.existingCount = existingCount;
    }

    public Integer getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(Integer errorCount) {
        this.errorCount = errorCount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getUploadTime() {
        return uploadTime;
    }

    public void setUploadTime(LocalDateTime uploadTime) {
        this.uploadTime = uploadTime;
    }

    public LocalDateTime getCompleteTime() {
        return completeTime;
    }

    public void setCompleteTime(LocalDateTime completeTime) {
        this.completeTime = completeTime;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}

