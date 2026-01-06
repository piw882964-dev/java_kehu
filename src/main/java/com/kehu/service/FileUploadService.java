package com.kehu.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 文件上传服务（先上传文件到服务器，然后服务器端处理）
 */
@Service
public class FileUploadService {
    
    private static final Logger logger = LoggerFactory.getLogger(FileUploadService.class);
    
    // 临时文件目录
    private static final String UPLOAD_DIR = System.getProperty("java.io.tmpdir") + "/file_uploads/";
    
    // 存储文件元信息：fileId -> FileInfo
    private final Map<String, FileInfo> fileInfos = new HashMap<>();
    
    static {
        // 创建临时目录
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            System.err.println("无法创建上传目录: " + UPLOAD_DIR);
        }
    }
    
    /**
     * 文件信息类
     */
    private static class FileInfo {
        String originalFileName;
        
        FileInfo(String originalFileName) {
            this.originalFileName = originalFileName;
        }
    }
    
    /**
     * 保存上传的文件到服务器临时目录
     * @param file 上传的文件
     * @return 服务器上的文件路径
     * @throws IOException 保存失败
     */
    public String saveUploadedFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        
        // 生成唯一文件名（使用UUID避免文件名冲突）
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isEmpty()) {
            throw new IllegalArgumentException("文件名不能为空");
        }
        
        String fileId = UUID.randomUUID().toString();
        String extension = "";
        int lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            extension = originalFileName.substring(lastDotIndex);
        }
        
        // 服务器文件名：UUID + 原扩展名
        String serverFileName = fileId + extension;
        Path serverFilePath = Paths.get(UPLOAD_DIR, serverFileName);
        
        // 保存文件到服务器
        Files.copy(file.getInputStream(), serverFilePath, StandardCopyOption.REPLACE_EXISTING);
        
        // 保存文件元信息
        fileInfos.put(fileId, new FileInfo(originalFileName));
        
        logger.info("文件已保存到服务器: {} (原始文件名: {}, 大小: {} MB)", 
            serverFilePath, originalFileName, file.getSize() / (1024.0 * 1024.0));
        
        // 返回文件ID（用于后续处理）
        return fileId;
    }
    
    /**
     * 获取服务器上的文件
     * @param fileId 文件ID
     * @return 服务器上的文件
     */
    public File getUploadedFile(String fileId) {
        // 查找匹配的文件（因为文件名是 fileId + 扩展名）
        try {
            File uploadDir = new File(UPLOAD_DIR);
            File[] files = uploadDir.listFiles((dir, name) -> name.startsWith(fileId + "."));
            
            if (files != null && files.length > 0) {
                return files[0];
            }
        } catch (Exception e) {
            // 查找文件失败时静默处理
        }
        
        return null;
    }
    
    /**
     * 获取文件的原始名称
     * @param fileId 文件ID
     * @return 原始文件名，如果找不到返回null
     */
    public String getOriginalFileName(String fileId) {
        FileInfo info = fileInfos.get(fileId);
        if (info != null) {
            return info.originalFileName;
        }
        
        // 如果内存中没有，尝试从服务器文件获取
        File file = getUploadedFile(fileId);
        if (file != null) {
            // 尝试从文件名中提取（格式：UUID.扩展名）
            String fileName = file.getName();
            int firstDotIndex = fileName.indexOf('.');
            if (firstDotIndex > 0 && fileName.length() > 36) {
                // 可能是 UUID.原始文件名.扩展名
                return fileName.substring(firstDotIndex + 1);
            }
        }
        
        return null;
    }
    
    /**
     * 删除上传的文件
     * @param fileId 文件ID
     */
    public void deleteUploadedFile(String fileId) {
        try {
            File file = getUploadedFile(fileId);
            if (file != null && file.exists()) {
                Files.delete(file.toPath());
                // 文件已删除
            }
            // 删除文件元信息
            fileInfos.remove(fileId);
        } catch (IOException e) {
            // 删除文件失败时静默处理
        }
    }
    
    /**
     * 获取文件大小
     * @param fileId 文件ID
     * @return 文件大小（字节），如果文件不存在返回-1
     */
    public long getFileSize(String fileId) {
        File file = getUploadedFile(fileId);
        if (file != null && file.exists()) {
            return file.length();
        }
        return -1;
    }
}

