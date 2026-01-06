# 客户管理系统

基于Spring Boot框架开发的客户存储系统，实现了完整的增删改查功能。

## 项目结构

```
java_kehu/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── kehu/
│       │           ├── CustomerSystemApplication.java  # 主启动类
│       │           ├── entity/
│       │           │   └── Customer.java              # 客户实体类
│       │           ├── repository/
│       │           │   └── CustomerRepository.java    # 数据访问层
│       │           ├── service/
│       │           │   └── CustomerService.java       # 业务逻辑层
│       │           └── controller/
│       │               ├── CustomerController.java    # REST API控制器
│       │               └── PageController.java         # 页面路由控制器
│       └── resources/
│           ├── application.yml                        # 配置文件
│           └── static/
│               ├── css/
│               │   └── common.css                     # 通用样式文件
│               ├── pages/                             # 页面文件夹
│               │   ├── list.html                      # 客户列表页面
│               │   ├── add.html                       # 添加客户页面
│               │   ├── edit.html                      # 编辑客户页面
│               │   └── delete.html                    # 删除客户页面
│               └── js/                                # Ajax文件文件夹
│                   ├── list.js                        # 列表页Ajax交互
│                   ├── add.js                         # 添加页Ajax交互
│                   ├── edit.js                        # 编辑页Ajax交互
│                   └── delete.js                      # 删除页Ajax交互
├── pom.xml                                            # Maven依赖配置
└── README.md                                          # 项目说明文档
```

## 界面特点

系统采用现代化的管理后台界面风格，包括：

- **顶部导航栏**: 显示系统名称、登录人信息和退出按钮
- **左侧菜单**: 固定侧边栏，提供快速导航到各个功能页面
- **主内容区**: 清晰的数据展示和操作区域
- **表格展示**: 专业的数据表格，支持复选框、状态标签、操作按钮
- **统一风格**: 所有页面使用统一的样式和交互体验

## 功能说明

### 1. 客户列表 (list.html)
- 显示所有客户信息的表格
- 支持全选/取消全选
- 支持批量删除功能
- 每条记录可直接进行删除和编辑操作
- 支持备注编辑（点击修改）
- 显示客户状态标签
- 提供刷新按钮

### 2. 添加客户 (add.html)
- 表单输入客户信息（姓名、电话、邮箱、地址）
- 实时表单验证
- 提交后自动跳转到列表页
- 统一的界面风格

### 3. 编辑客户 (edit.html)
- 通过ID查询客户信息
- 支持从列表页直接跳转并自动加载
- 加载后显示在表单中
- 支持修改并更新

### 4. 删除客户 (delete.html)
- 通过ID查询客户信息
- 显示客户详情确认
- 确认后执行删除操作
- 安全提示防止误删

## 技术栈

- **后端框架**: Spring Boot 2.7.14
- **数据访问**: Spring Data JPA
- **数据库**: H2 (内存数据库)
- **前端**: HTML + CSS + JavaScript (原生Ajax)
- **构建工具**: Maven

## 运行说明

### 前置要求
- JDK 1.8 或更高版本
- Maven 3.6 或更高版本

### 启动步骤

1. 进入项目目录
```bash
cd /Users/wu/Documents/java_kehu
```

2. 编译项目
```bash
mvn clean compile
```

3. 运行项目
```bash
mvn spring-boot:run
```
生成jar包
mvn clean package -DskipTests  

4. 访问系统
- 主页面: http://localhost:8080/
- 客户列表: http://localhost:8080/pages/list.html
- 添加客户: http://localhost:8080/pages/add.html
- 编辑客户: http://localhost:8080/pages/edit.html
- 删除客户: http://localhost:8080/pages/delete.html

### API接口

所有API接口前缀: `/api/customers`

- `GET /api/customers` - 获取所有客户
- `GET /api/customers/{id}` - 根据ID获取客户
- `POST /api/customers` - 创建新客户
- `PUT /api/customers/{id}` - 更新客户信息
- `DELETE /api/customers/{id}` - 删除客户

## 文件夹分工

- **entity/**: 存放实体类，定义数据模型
- **repository/**: 存放数据访问接口，负责数据库操作
- **service/**: 存放业务逻辑层，处理业务规则
- **controller/**: 存放控制器，处理HTTP请求
- **pages/**: 存放前端页面，每个功能独立页面
- **js/**: 存放Ajax交互文件，每个页面对应的JavaScript文件
- **css/**: 存放样式文件，统一的界面样式

## 注意事项

1. 本项目使用H2内存数据库，重启后数据会清空
2. 如需持久化数据，可修改`application.yml`配置使用MySQL等数据库
3. 所有Ajax请求都使用原生JavaScript实现，未使用第三方库

