package com.kehu.dto;

import com.alibaba.excel.annotation.ExcelProperty;

/**
 * Excel客户数据DTO（用于EasyExcel读取）
 * 对应Excel列：姓名、电话、邮箱、地址
 */
public class CustomerExcelDTO {
    
    @ExcelProperty(index = 0)
    private String name;  // 姓名（第1列）
    
    @ExcelProperty(index = 1)
    private String phone;  // 电话（第2列）
    
    @ExcelProperty(index = 2)
    private String email;  // 邮箱（第3列）
    
    @ExcelProperty(index = 3)
    private String address;  // 地址（第4列）
    
    // Getter和Setter方法
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
}

