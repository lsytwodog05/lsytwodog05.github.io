---
title: docker学习笔记
tags:
  - docker
categories:
  - 学习笔记
abbrlink: 60747
date: 2026-04-12T14:07:00.000Z
---

# Docker 完整学习笔记

## 一、核心概念

1. **Docker**：容器化部署工具，把应用 + 依赖封装成独立运行环境，环境实例称为**容器**，运行容器的电脑叫宿主机。
2. **容器 vs 虚拟机**


| 类型        | 内核特点              | 体积/启动速度  |
| --------- | ----------------- | -------- |
| Docker 容器 | 多容器共享宿主机 Linux 内核 | 体积小、秒级启动 |
| 虚拟机       | 每台虚拟机自带完整独立系统内核   | 镜像大、开机慢  |


1. **镜像（Image）**：容器的模板，类比软件安装包/糕点模具；一个镜像可以生成多个独立容器。
2. **容器（Container）**：镜像运行后的实例，类比安装完成、正在运行的软件。
3. **仓库（Registry）**：存放、分享镜像的服务；Docker Hub 是官方公共仓库。

镜像完整命名规则：`仓库地址/命名空间/镜像名:标签`

- `docker.io`（Docker Hub）可省略
- `library` 官方命名空间可省略
- `latest` 默认版本标签可省略
- 示例：`nginx` = `docker.io/library/nginx:latest`

## 二、Docker 安装

Docker 底层依赖 Linux 内核；Windows/Mac 靠 WSL2 虚拟 Linux 子系统运行，Linux 为最佳环境。

### 1. Linux 安装

1. 官方脚本地址：[https://get.docker.com（国内网络通常无法访问）](https://get.docker.com（国内网络通常无法访问）)
2. 安装命令

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

1. 权限：非 root 用户执行 docker 命令需要 `sudo`，可配置免 sudo。



### 2. Windows 安装

1. 开启系统功能：虚拟机平台 + 适用于 Linux 的 Windows 子系统（WSL）
2. 重启电脑
3. 管理员 CMD 配置 WSL

```bash
wsl --set-default-version 2
wsl --update --web-download
```

1. 下载安装 Docker Desktop
2. 保持 Docker Desktop 后台运行，终端执行 `docker --version` 验证



### 3. Mac 安装

根据芯片（Intel / Apple Silicon）下载对应 Docker Desktop 安装包，安装完成后终端验证。

### 补充

日常操作优先使用命令行，可视化仅辅助查看。

## 三、镜像相关命令



### 1. 拉取镜像

```bash
# 拉取最新 nginx
docker pull nginx

# 指定架构拉取
docker pull --platform=arm64 nginx

# 私有仓库镜像
docker pull docker.n8n.io/n8nio/n8n
```



### 2. 本地镜像管理

```bash
# 查看本地所有镜像
docker images

# 删除镜像（名称/ID 均可）
docker rmi nginx
```



### 补充说明

不同 CPU 架构（AMD64 / ARM64）镜像不通用，ARM 开发板需要手动指定架构拉取。

## 四、容器基础命令

`docker run`（核心）：`docker run = 拉取镜像（可选）+ 创建容器 + 启动容器`

### 1. 基础运行

```bash
# 前台运行，占用终端
docker run nginx

# -d 后台分离运行，只输出容器 ID
docker run -d nginx
```



### 2. 查看容器

```bash
# 仅查看正在运行的容器
docker ps

# 查看所有（运行 + 停止）
docker ps -a
```

输出字段：容器 ID、所用镜像、自定义/随机容器名

### 3. 端口映射

`-p 宿主机端口:容器内端口`：容器网络默认隔离，需要端口转发才能从宿主机访问内部服务

```bash
# 宿主机 80 → 容器 80
docker run -d -p 80:80 nginx
```



### 4. 数据持久化 `-v` 挂载卷



#### ① 绑定挂载（宿真实目录绑定容器目录）

```bash
docker run -v /宿主机文件夹:/容器内目录 nginx
```

双向同步数据，容器删除宿主机文件保留。

#### ② 命名卷（Docker 自动管理存储空间）

```bash
# 创建卷
docker volume create mydata

# 使用卷挂载
docker run -v mydata:/usr/share/nginx/html nginx
```

优势：首次自动把容器目录文件初始化到卷中。

#### 卷管理命令

```bash
# 列出所有卷
docker volume list

# 查看卷真实路径
docker volume inspect mydata

# 删除指定卷
docker volume rm mydata

# 清理无容器使用的卷
docker volume prune -a
```



### 5. run 常用附加参数

```bash
# 传入环境变量，可多次 -e
docker run -e KEY=VALUE nginx

# 自定义容器唯一名称
docker run --name my-nginx nginx

# 交互式进入容器终端
docker run -it nginx /bin/sh

# 容器停止自动删除（临时调试搭配 -it 使用）
docker run --rm -it nginx

# 重启策略
# always：停止立刻重启
docker run --restart always nginx
# unless-stopped：手动停止后不再自动重启
docker run --restart unless-stopped nginx
```



### 6. 启停、删除已有容器

```bash
# 停止运行中的容器
docker stop 容器ID/容器名

# 启动已停止容器
docker start 容器ID/容器名

# 强制删除运行/停止容器
docker rm -f 容器ID/容器名

# 只创建不启动容器
docker create nginx
```



### 7. 容器日志与进入容器调试

```bash
# 查看容器日志
docker logs 容器名

# 实时滚动日志
docker logs -f 容器名

# 在运行容器内执行单条命令
docker exec my-nginx ps -ef

# 交互式进入容器终端
docker exec -it my-nginx /bin/sh
```



## 五、Docker 底层原理

依靠 Linux 内核两大隔离能力实现轻量容器：

1. **Cgroups**：限制每个容器 CPU、内存、带宽资源，互不抢占
2. **Namespaces**：隔离进程、网络、文件、用户视图

本质：容器是宿主机上被资源隔离的特殊进程，内部看起来像独立 Linux 系统。

## 六、Dockerfile 自定义镜像

Dockerfile：制作镜像的步骤脚本，类比建筑图纸。

### 核心指令

1. `FROM 镜像名`：指定基础镜像，文件首行必填
2. `WORKDIR /app`：设置容器内工作目录
3. `COPY 宿路径 容器路径`：拷贝本地文件进镜像
4. `RUN 命令`：构建镜像时执行（安装依赖等）
5. `EXPOSE 8000`：声明服务端口，仅注释不生效，运行仍需 `-p` 映射
6. `CMD ["python","main.py"]`：容器启动默认命令，仅一条
7. `ENTRYPOINT`：启动入口，优先级高于 CMD，不易被覆盖



### 构建 & 推送镜像

```bash
# 当前目录构建，命名 tag
docker build -t username/app:v1 .

# 登录 Docker Hub
docker login

# 推送（镜像名必须带用户名命名空间）
docker push username/app:v1
```



## 七、Docker 网络三大模式



### 1. Bridge 桥接（默认）

所有容器默认接入内置 bridge 网桥，分配 `172.17.x.x` 内网 IP；同自定义网桥内容器可通过**容器名称**互相访问（Docker 内置 DNS）。

```bash
# 创建自定义网桥
docker network create my-net

# 启动容器指定网络
docker run --network my-net nginx

# 查看所有网络
docker network list

# 删除自定义网络
docker network rm my-net
```



### 2. Host 主机模式

容器直接复用宿主机网络，无需 `-p` 端口映射

```bash
docker run --network host nginx
```



### 3. None 无网络

容器完全隔离，无任何网络权限

```bash
docker run --network none nginx
```

内置 `bridge` / `host` / `none` 三种默认网络不可删除。

## 八、Docker Compose 多容器编排



### 作用

单机多服务统一管理（后端 + 数据库 + ES 等），`docker-compose.yml` 替代多条 `docker run` 命令，自动创建独立子网，容器间用服务名通信。

### yaml 核心字段对应 docker run


| Compose 字段  | 等价 docker run 参数 |
| ----------- | ---------------- |
| image       | 镜像名称             |
| ports       | -p 端口映射          |
| volumes     | -v 挂载卷           |
| environment | -e 环境变量          |
| depends_on  | 控制服务启动先后         |




### 常用命令

```bash
# 后台启动全部服务
docker compose up -d

# 仅停止容器，保留网络、卷
docker compose stop

# 重启已停止服务
docker compose start

# 停止并删除容器、自定义网络
docker compose down

# 指定自定义 yml 文件启动
docker compose -f ./compose-dev.yml up -d
```



### 补充

Docker Compose 适合单机开发；大规模集群生产环境使用 K8s。

## 九、整体知识总结

1. 三大核心：镜像、容器、镜像仓库
2. 镜像操作：`pull` 下载、`images` 查看、`rmi` 删除、Dockerfile 自定义构建
3. 容器核心 `docker run`，重点掌握 `-p` 端口、`-v` 挂载、`-d` 后台、`-it` 交互
4. 调试工具：`docker ps`、`docker logs`、`docker exec`
5. 网络三种模式：bridge / host / none，自定义网桥实现容器互通
6. Dockerfile 制作自定义业务镜像，可推送至 Docker Hub
7. Compose 统一管理多容器应用，简化本地开发环境部署

