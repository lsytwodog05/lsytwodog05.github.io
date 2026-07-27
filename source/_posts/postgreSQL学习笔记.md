---
title: postgreSQL学习笔记
tags:
  - postgresql
  - 数据库
categories:
  - 学习笔记
abbrlink: 19646
date: 2026-07-12 16:05:27
---

## PostgreSQL 和 MySQL 对比

### 索引

两者最基础的索引都是 **B+ 树（B-Tree）**，适用于等值、范围和排序查询。但除此之外，差异巨大。

#### 1. 聚簇索引（Clustered Index）

- **MySQL (InnoDB)**：采用**聚簇索引**。表数据本身就是按主键组织的一棵 B+ 树，叶子节点直接存放完整的数据行。主键查询极快，但二级索引的叶子节点存储的是**主键值**，通过二级索引查询需要先找到主键，再回表查一次。
- **PostgreSQL**：所有索引都是**非聚簇索引**。表数据存储在独立的「堆表」中，所有索引（包括主键索引）的叶子节点都只存储指向数据行位置的指针。写入性能更稳定，没有 MySQL 中常见的「页分裂」问题。

#### 2. 高级索引类型

PostgreSQL 支持极为丰富的索引类型，这是它的一大优势。

**GIN（倒排索引）**：处理**全文搜索、数组、JSONB** 等包含多值数据类型的利器。

```sql
-- PostgreSQL: 对 JSONB 字段建立 GIN 索引，加速包含查询
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);
SELECT * FROM products WHERE attributes @> '{"color": "red"}';
```

MySQL 也有全文索引（FULLTEXT），但功能和灵活性远不及 PostgreSQL 的 GIN。

**GiST（通用搜索树）**：索引**框架**，任何数据类型（如地理坐标、IP 地址、时间范围）只要实现了相应接口，就能用 GiST 加速「包含」「相交」「相邻」等复杂查询。

```sql
-- PostgreSQL: 对时间范围使用 GiST 索引
CREATE INDEX idx_reservations_period ON reservations USING GIST (period);
SELECT * FROM reservations WHERE period @> '2026-01-10'::date;
```

MySQL 原生不支持此类索引，对于空间数据有单独的 SPATIAL 索引。

**部分索引（Partial Index）**：只对表中满足特定条件的**一部分行**建立索引，可减少索引大小，提升查询和写入性能。

```sql
-- PostgreSQL: 只为活跃用户建立唯一索引
CREATE UNIQUE INDEX idx_active_user_phone ON users (phone) WHERE is_active = true;
```

**表达式索引（Expression Index）**：对**表达式或函数的结果**建立索引，而不是直接对列建索引。

```sql
-- PostgreSQL: 对 lower(email) 的结果建索引，实现大小写不敏感的快速查询
CREATE INDEX idx_users_email_lower ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower('Example@Email.com');
```

> **注意**：MySQL 8.0.13 开始支持在**虚拟列**上建索引，可以间接实现类似功能，但实现方式与 PostgreSQL 不同。


### 数据一致性：PostgreSQL 的严谨 vs MySQL 的灵活


#### 1. 事务与 DDL

- **PostgreSQL**：将 `CREATE TABLE`、`ALTER TABLE` 等 DDL 语句也视为普通事务操作。可以将 DDL 和 DML 放在一个事务中，如果中间任何一步出错，**整个事务可以完整回滚**。

```sql
-- PostgreSQL: DDL 和 DML 在同一个事务中，要么全成功，要么全回滚
BEGIN;
ALTER TABLE users ADD COLUMN first_name TEXT;
UPDATE users SET first_name = split_part(name, ' ', 1);
-- 如果 UPDATE 出错，ALTER TABLE 也会被回滚
COMMIT;
```

- **MySQL**：DDL 操作**不支持事务回滚**。一旦执行，就会立即生效，无法撤销。


#### 2. 可延迟约束（Deferrable Constraints）

- **PostgreSQL**：支持将约束（如唯一约束、外键约束）设置为「可延迟」的，约束检查可以推迟到事务**提交时**才进行。

```sql
-- PostgreSQL: 创建可延迟的唯一约束
CREATE TABLE users (name TEXT UNIQUE DEFERRABLE INITIALLY DEFERRED);
BEGIN;
UPDATE users SET name = 'Bob' WHERE id = 1;
UPDATE users SET name = 'Alice' WHERE id = 2;
-- 在事务提交前，即使出现临时冲突（如 Bob 和 Alice 互换名字），也不会报错
COMMIT; -- 提交时才检查唯一性
```

这在需要交换两个唯一值时非常有用。MySQL **不支持**可延迟约束。

#### 3. 隔离级别

两者都支持 SQL 标准的四种隔离级别，但默认值和实现有显著差异：


| 特性          | PostgreSQL                | MySQL (InnoDB)                           |
| ----------- | ------------------------- | ---------------------------------------- |
| **默认隔离级别**  | **读已提交 (Read Committed)** | **可重复读 (Repeatable Read)**               |
| **MVCC 实现** | 基于**事务开始时**的全局快照          | 基于 **Undo Log**，每条 SELECT 语句生成新快照        |
| **幻读问题**    | **天然避免**，因为事务内快照固定        | 默认级别下**无法彻底避免**，需依赖**间隙锁 (Gap Lock)** 弥补 |


> **什么是「读写区别对待」？**
>
> 指 MySQL 在 `REPEATABLE READ` 级别下的一个经典问题：`SELECT` **读的是事务开始时的快照，而** `UPDATE` **却读的是当前最新的已提交数据**。这可能导致「读不到但能改到」的怪异现象。PostgreSQL 则读写一致，行为更可预测。


### 性能

- **复杂查询与数据分析**：PostgreSQL 的**查询优化器更成熟**，能更好地处理多表 JOIN、子查询、窗口函数等复杂操作。多项基准测试显示，PostgreSQL 在处理百万级数据的全表扫描和条件查询时，速度可能是 MySQL 的 **10 倍以上**。
- **高并发简单读写**：MySQL (InnoDB) 针对简单的 `SELECT`、`INSERT` 等操作做了深度优化，在单纯的读或写密集型场景下，延迟极低。但在**高并发混合读写**场景下，其锁机制可能导致性能下降。
- **写入性能**：PostgreSQL 的 MVCC 实现更成熟，写入性能更稳定，在高并发下性能衰减较小。


### 可扩展性

- **PostgreSQL**：允许用户**自定义数据类型、操作符、索引类型、甚至用 PL/Python、PL/Perl 等语言编写函数**。通过丰富的扩展（如 `PostGIS` 地理空间扩展），PostgreSQL 的功能可以无限延伸。
- **MySQL**：虽然也支持存储过程、触发器，但其核心定位仍是「数据存储中心」。其扩展性更多依赖于外部的**分区、复制和分片**等架构方案。


### 开源社区

- **PostgreSQL**：由**非营利组织**主导的社区驱动模式。采用对商业友好的 **BSD 协议**，允许自由修改和闭源分发。
- **MySQL**：版权属于 **Oracle 公司**。采用 **GPL 协议**，对商业分发有一定限制。


### 总结


| 对比维度       | PostgreSQL                 | MySQL                         |
| ---------- | -------------------------- | ----------------------------- |
| **索引**     | 类型极其丰富（GIN, GiST, 部分, 表达式） | 以 B+ 树为主，辅以 FULLTEXT, SPATIAL |
| **数据一致性**  | 极其严谨，支持 DDL 事务、可延迟约束       | 相对灵活，DDL 不支持回滚                |
| **默认隔离级别** | 读已提交 (Read Committed)      | 可重复读 (Repeatable Read)        |
| **性能**     | 复杂查询、分析场景优势明显              | 简单高并发读写场景表现出色                 |
| **可扩展性**   | 极强，支持自定义类型、操作符、索引          | 中等，依赖外部架构方案                   |
| **开源协议**   | BSD（更宽松）                   | GPL（有商业限制）                    |


## 使用


### 一、安装使用

Docker 是快速体验 PostgreSQL 及其生态的最佳方式。

**1. Docker 安装**

最基础的启动命令如下：

```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_USER=your_user \
  -e POSTGRES_DB=your_db \
  -p 5432:5432 \
  -d postgres:15
```

为保证数据安全，**强烈建议挂载数据卷**以实现持久化：

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=SecurePass123 \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15
```

**2. Linux 系统安装**

使用官方 APT 源安装更为稳妥：

```bash
# 导入官方源
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
# 更新并安装
sudo apt update
sudo apt install postgresql-16
```

安装完成后，默认会创建一个名为 `postgres` 的系统用户和数据库，可用以下命令切换并进入命令行：

```bash
sudo -u postgres psql
```


### 二、对象关系型数据库

PostgreSQL 的核心设计哲学是**对象关系型**，即在传统关系模型之上，融入了面向对象的思想。

**1. 丰富的数据类型**

除了标准的 SQL 类型，它还原生支持：

- **JSON/JSONB**：存储和查询 JSON 数据
- **数组**：支持一维或多维数组
- **地理空间**：通过 PostGIS 扩展，支持 `POINT`、`POLYGON` 等类型
- **范围类型**：如 `TSTZRANGE`（时间戳范围），可用于排期等场景
- **网络地址**：如 `INET`、`CIDR` 类型

**2. 表继承（Table Inheritance）**

子表会继承父表的所有字段。

```sql
-- 创建父表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT
);

-- 创建子表，继承自 users
CREATE TABLE admins (
    role TEXT
) INHERITS (users);

-- 插入数据
INSERT INTO admins (name, email, role) VALUES ('Alice', 'alice@example.com', 'super_admin');

-- 查询父表会同时查出子表数据
SELECT * FROM users;        -- 结果包含 Alice
SELECT * FROM ONLY users;   -- 结果为空
```


### 三、替代 MongoDB（JSONB 文档存储）

PostgreSQL 的 **JSONB** 数据类型，使其成为一个强大的文档数据库，足以在多数场景下替代 MongoDB。

`JSONB` 以二进制的结构化格式存储，支持创建索引，查询性能远超普通的 `JSON` 类型。

**1. 创建文档表与 GIN 索引**

```sql
-- 创建表，使用 JSONB 字段
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    data JSONB
);

-- 创建 GIN 索引，加速内部字段查询
CREATE INDEX idx_products_data ON products USING GIN (data);
```

**2. 插入与查询文档**

```sql
-- 插入 JSON 文档
INSERT INTO products (data) VALUES
('{"name": "Laptop", "price": 999, "tags": ["electronics", "computer"]}'),
('{"name": "Book", "price": 29, "tags": ["education"]}');

-- 查询指定字段
SELECT data->>'name' AS name, data->>'price' AS price FROM products;

-- 条件查询（查询价格大于 100 的商品）
SELECT * FROM products WHERE (data->>'price')::int > 100;

-- 查询包含特定标签的文档
SELECT * FROM products WHERE data->'tags' ? 'electronics';
```


### 四、替代 Elasticsearch

通过内置的全文搜索功能或 **ParadeDB** 等扩展，PostgreSQL 可以直接替代 Elasticsearch。

**1. 内置全文搜索**

使用 `tsvector` 和 `tsquery` 数据类型及 GIN 索引。

```sql
-- 创建表，包含一个存储文本搜索向量的列
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT,
    body TEXT,
    tsv TSVECTOR
);

-- 创建 GIN 索引加速搜索
CREATE INDEX idx_articles_tsv ON articles USING GIN (tsv);

-- 插入数据并更新向量列
INSERT INTO articles (title, body, tsv) VALUES
('PostgreSQL Tutorial', 'Learn PostgreSQL from basics to advanced.',
 to_tsvector('english', 'PostgreSQL Tutorial Learn PostgreSQL from basics to advanced.'));

-- 执行搜索
SELECT title, body
FROM articles
WHERE tsv @@ to_tsquery('english', 'PostgreSQL & basics');
```

**2. ParadeDB 扩展**

[ParadeDB](https://paradedb.com) 是一个基于 Rust 的 PostgreSQL 扩展，提供了与 Elasticsearch 同级别的全文、混合和分面搜索能力。它可以直接作为 PostgreSQL 的逻辑副本运行，无需维护额外的搜索集群。


### 五、结合 LangChain 作为向量数据库

通过 **pgvector** 扩展，PostgreSQL 可以存储和检索向量嵌入，成为 LangChain 的向量存储后端。

**1. 安装 pgvector**

在 Docker 中，可以直接使用包含 pgvector 的镜像：

```bash
docker run --name pgvector -e POSTGRES_PASSWORD=password -p 5432:5432 -d pgvector/pgvector:pg16
```

在已有实例中，可通过 `CREATE EXTENSION vector;` 启用。

**2. 在 LangChain 中使用**

```python
from langchain.embeddings import init_embeddings
from langchain_postgres import PGVector

# 配置连接
connection = "postgresql+psycopg://user:password@localhost:5432/db"
collection_name = "my_docs"

# 初始化向量存储
vector_store = PGVector(
    embeddings=init_embeddings("openai/text-embedding-ada-002"),
    collection_name=collection_name,
    connection=connection,
)

# 添加文档
vector_store.add_texts(["文本内容1", "文本内容2"])

# 相似性搜索
results = vector_store.similarity_search("查询文本", k=3)
```

**3. 直接使用 SQL**

```sql
-- 创建向量表
CREATE TABLE items (id SERIAL PRIMARY KEY, embedding vector(3));

-- 插入向量
INSERT INTO items (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');

-- 执行向量相似度搜索（欧氏距离）
SELECT * FROM items ORDER BY embedding <-> '[3,1,2]' LIMIT 5;
```


### 六、代替定时任务

**pg_cron** 是一个基于 cron 语法的任务调度器，允许在数据库内部直接执行 SQL 语句。

**1. 启用扩展**

需将 `pg_cron` 添加到 `shared_preload_libraries` 中并重启数据库。

```sql
CREATE EXTENSION pg_cron;
```

**2. 创建定时任务**

使用 `cron.schedule` 函数创建任务，其 cron 语法与 Linux 标准一致。

```sql
-- 每周六凌晨 3:30 (GMT) 清理一周前的过期数据
SELECT cron.schedule(
    'weekly-cleanup',
    '30 3 * * 6',
    $$DELETE FROM events WHERE event_time < now() - interval '1 week'$$
);

-- 查看所有任务
SELECT * FROM cron.job;

-- 删除任务
SELECT cron.unschedule('weekly-cleanup');
```

