---
title: es学习笔记
tags:
  - e s
categories:
  - 学习笔记
abbrlink: 22600
date: 2026-04-12 01:28:00
---

## 一、ES 概念 

### 1. 定位 分布式全文检索引擎，底层基于Lucene；支持分词、模糊检索、海量文本查询、多维聚合统计；

### 2. ES 与 MySQL 概念对照表

 | Elasticsearch | MySQL | 说明 |

 | ---- | ---- | ---- |

 | Cluster 集群 | MySQL 服务实例 | 多节点服务器组成ES集群 | 

| Index 索引 | Database 数据库 | 同一类业务数据集合 |

 | Document 文档 | Row 行记录 | 单条JSON格式数据 |

 | Field 字段 | Column 列 | 文档内属性 | 

| Mapping 映射 | Table 表结构 | 定义字段类型、分词规则 | 

| Shard 分片 | 分表/分区 | 拆分海量数据，实现分布式扩容 |

| Replica 副本 | 主从备份 | 分片备份，容灾、分担读请求 | 

二、快速部署（Docker 单节点）

 ### 1. 启动 ES 

```bash docker run -d \ --name es \ -p 9200:9200 -p 9300:9300 \ -e "discovery.type=single-node" \ -e "[xpack.security](http://xpack.security).enabled=false" \ -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \ docker.elastic.co/elasticsearch:7.17.0 ``` 访问验证命令： ```bash curl [http://127.0.0.1:9200](http://127.0.0.1:9200) ```  

### 2. 启动 Kibana（可视化控制台）

 ```bash docker run -d \ --name kibana \ -p 5601:5601 \ -e "elasticsearch.hosts=[[http://es:9200](http://es:9200)]" \ docker.elastic.co/kibana:7.17.0 ```

 访问地址`http://127.0.0.1:5601`[，在Dev](http://127.0.0.1:5601`，在Dev) Tools面板编写DSL语句  

### 3. IK 中文分词插件（解决中文单字拆分问题）

 1. 版本要求：IK插件版本必须和ES版本完全一致 

2. 安装方式：压缩包解压至ES的plugins目录，重启容器生效 

3. 两种分词模式 - `ik_max_word`：细粒度拆分，拆出全部词语，适合搜索场景 - `ik_smart`：粗粒度精简拆分，适合索引存储

 4. 分词测试DSL 

```json GET *analyze {   "analyzer": "ik*max_word",   "text": "华为智能手机" } ```

  ## 三、索引与映射

 ### 1. 创建索引（自定义分片、副本、字段结构） 

```json PUT /goods {   "settings": {     "number_of_shards": 3,     "number_of_replicas": 1   },   "mappings": {     "properties": {       "id": {"type": "keyword"},       "name": {"type": "text","analyzer":"ik_max_word"},       "category": {"type": "keyword"},       "price": {"type": "double"},       "stock": {"type": "integer"},       "createTime": {"type": "date","format":"yyyy-MM-dd HH:mm:ss"},       "desc": {"type": "text","index":false}     }   } } ``` 

- number_of_shards：主分片，索引创建后不可修改 

- number_of_replicas：副本分片，可随时动态调整 

- index:false：仅存储字段原文，不构建倒排索引，节省内存  

### 2. 核心字段类型区分

 1. text：自动分词，支持全文检索；无法直接排序、分组、term精确匹配

 2. keyword：不分词，完整字符串匹配；用于筛选、分组、排序 

3. 数值类型：integer、long、double、float 

4. date：日期专用类型，支持范围查询，不建议用字符串存储时间

 5. nested：嵌套数组对象，解决普通object数组扁平化丢失父子关系问题  #

## 3. 动态映射 dynamic 

- true（默认）：自动识别新增字段并生成映射，易产生脏数据 

- false：新增字段仅保存原始值，不创建索引无法检索 

- strict：新增未知字段直接报错

 ## 四、文档 Document CRUD DSL

 ### 1. 指定ID新增文档 

```json POST /goods/_doc/1 {   "id":"1001",   "name":"华为Mate60智能手机",   "category":"手机",   "price":5999,   "stock":100,   "createTime":"2025-01-01 10:00:00",   "desc":"国产旗舰手机" } ``` 不指定文档ID`POST /goods/_doc`，ES自动生成随机UUID 

 ### 2. 根据ID查询单条文档 ```json GET /goods/_doc/1 ``` 

 ### 3. 全量更新（覆盖文档所有字段） 

```json PUT /goods/_doc/1 {"price":5499} ```  

### 4. 局部更新（仅修改传入字段）

 ```json POST /goods/_update/1 {   "doc":{"price":5499,"stock":80} } ```  

### 5. 删除文档 ```json DELETE /goods/_doc/1 ``` 

 ### 6. bulk 批量插入

 ```json POST /goods/_bulk {"index":{"_id":"2"}} {"name":"iPhone 15","category":"手机","price":5899} {"index":{"_id":"3"}} {"name":"小米14","category":"手机","price":3999} ```  

## 五、核心DSL查询

 ### 1. term 与 match 基础查询区分 

- term：不分词，精确完整匹配，仅适用于keyword字段

 - match：先分词再匹配，用于text字段全文检索  

#### term 精确查询

 ```json GET /goods/_search {   "query": {     "term": {       "category":{"value":"手机"}     }   } } ```  

#### match 全文检索（模糊搜索） 

```json GET /goods/_search {   "query": {     "match":{"name":"华为手机"}   } } ```  

### 2. Bool 布尔复合查询 

关键字说明： 

- must：必须匹配，参与相关性_score打分 

- should：可选匹配，命中增加分数 

- must_not：必须不匹配，不参与打分 

- filter：纯过滤条件，不计算分数，自带缓存性能更高  

需求示例：品类手机、价格3000~6000、优先匹配华为商品 ```json GET /goods/_search {   "query": {     "bool": {       "must": [{"term":{"category":"手机"}}],       "should": [{"match":{"name":"华为"}}],       "filter": [{"range":{"price":{"gte":3000,"lte":6000}}}]     }   } } ```

 ### 3. 范围、排序、分页

 ```json GET /goods/_search {   "from":0,   "size":10,   "sort": [{"price":"asc"},{"_score":"desc"}],   "query": {"range":{"price":{"gte":1000}}} } ``` 

 ### 4. 关键词高亮（em包裹返回结果）

```json GET /goods/_search {   "query": {"match":{"name":"华为"}},   "highlight": {     "fields":{"name":{}},     "pre_tags":"<em>",     "post_tags":"</em>"   } } ```  

## 六、聚合 Aggregation（对应MySQL group by） 

聚合分为两类： 

1. 桶聚合Bucket：分组（terms分组、date_histogram时间直方图）

 2. 度量聚合Metric：数值统计（sum、avg、count、max、min）  示例：按商品品类分组，统计每组商品数量、平均价格 

```json GET /goods/_search {   "size":0,   "aggs": {     "category_group": {       "terms":{"field":"category"},       "aggs": {         "avg_price":{"avg":{"field":"price"}},         "total":{"value_count":{"field":"id"}}       }     }   } } ``` 

- size:0：不返回原始商品文档，仅展示聚合结果，节省性能 

 ## 七、分布式

### 1. 分片规则   
1. 主分片primary_shards：索引创建后固定不可修改；数据通过hash路由分配至不同分片 

2. 副本replica_shards：主分片备份，可动态调整数量；故障自动升级为主分片，分担读流量 

 ### 2. 三种集群节点角色 

1. Master主节点：管理集群元数据（创建/删除索引、分片分配），不存储业务数据

 2. Data数据节点：存储主、副本分片，处理读写查询，占用大量CPU、内存 

3. Coordinate协调节点：接收客户端请求、转发分片、合并多分片结果；所有节点默认兼任 

 ### 3. 集群三色健康状态 

- Green：所有主分片、副本分片全部正常可用

 - Yellow：主分片完整，部分副本未分配；单机部署必然黄色，不影响读写 

- Red：存在丢失的主分片，数据缺失，服务异常  

### 集群状态查看DSL

 ```json GET *cat/health?v GET* cat/nodes?v GET *cat/indices?v GET* cat/shards?v ```  

## 八、分页方案

### 1. from + size（浅分页） 适用场景：分页页码≤10000 缺陷：深分页from数值过大时，ES读取大量数据存入内存再丢弃，内存爆炸性能暴跌  

### 2. Scroll 游标分页 适用场景：后台百万级数据全量导出 缺陷：创建快照长期占用资源，数据不实时，不适合前端翻页  

### 3. search_after（生产最优） 原理：依靠唯一排序字段作为游标向后遍历 优势：无内存压力，支持无限滚动；要求排序字段具备唯一性（如商品id）

## 十、优化

 1. 筛选、分组、排序统一使用keyword字段；text仅用于全文检索 

2. 禁止深分页from>10000，线上统一使用search_after

 3. 大批量导入数据使用bulk，单次500~1000条，避免单条循环写入 

4. 布尔查询优先使用filter，不计算相关性分数，自带缓存查询更快 

5. 分片大小控制10~50GB，分片过多会增加集群调度压力 

6. 禁止在text字段执行term查询，分词后无法完整匹配原始文本 

7. 线上mapping配置dynamic:strict，拦截未知字段自动生成映射

 8. 超长描述文本设置index:false，不构建倒排索引节省内存 

9. 集群副本数至少1，防止单节点宕机丢失数据 

10 search_after分页时，排序字段必须唯一，避免重复数据  

## 十一、ES与MySQL数据同步方案 

### Canal（工业）

 1. MySQL开启binlog二进制日志 

2. Canal服务监听binlog日志，捕获增删改事件 

3. 消息推送至Java后端服务 

4. Java客户端调用ES RestClient完成索引更新 

优点：低侵入、数据实时同步、不会给MySQL带来查询压力 

 ### 小样本方案：定时全量同步 

定时任务查询全量商品写入ES；仅适合极小体量数据，大数据量会压垮MySQL数据库  ## 十二、面试简答题

 1. term 和 match 的区别？ term不分词，精确完整匹配，只用于keyword；match会对检索词分词，用于text全文搜索。 

 2. 深分页为什么性能差？ from数值很大时，ES需要读取from之前全部文档存入内存再丢弃，消耗大量内存。 

 3. 分片、副本分别作用？ 分片拆分海量数据实现分布式扩容；副本做数据容灾备份，分担读请求流量。 

 4. bool中filter和must区别？ must参与相关性打分；filter仅过滤数据，不计算分数，自带缓存查询速度更快。 

 5. IK两种分词器区别？ ik_max_word细粒度拆分，产出更多词条适合搜索；ik_smart粗粒度精简拆分，适合存储索引。

 6. ES集群黄色代表什么？ 所有主分片正常，副本分片无法分配；单机部署无多余节点存放副本，不影响读写。  

7. bulk批量操作注意事项？ 单次500~1000条，单条文档体积不超过10MB，防止服务OOM。  

8. text字段为什么不能排序分组？ text字段分词后拆分成多个独立词条，无完整原始字符串，分组排序需配套keyword字段。  

9. ES倒排索引原理？ 文档内容分词生成词条，词条映射存储对应文档ID；正向索引保存文档完整原始数据。  

10 ES更新文档慢怎么解决？ Lucene底层文件段不可变，更新是标记删除+新建文档；大批量更新改用bulk，减少频繁单条update。