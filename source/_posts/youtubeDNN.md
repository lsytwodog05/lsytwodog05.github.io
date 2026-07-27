---
title: youtubeDNN
tags:
  - 召回
  - 排序
categories:
  - 推荐系统
  - 学习笔记
abbrlink: 2769
date: 2026-07-14 11:37:21
---

YouTubeDNN是推荐系统领域经典论文《Deep Neural Networks for YouTube Recommendations》提出的模型。YouTube面临**百万级视频库**的推荐挑战，直接使用复杂模型延迟过高，因此采用**两阶段漏斗式**架构：

- **Candidate Generation Model（召回层）**：从百万级视频库快速筛选出**几百个**候选视频
- **Ranking Model（排序层）**：对几百个候选视频引入更丰富特征进行精排

> **为什么不用一个模型直接完成？** 答：平衡**计算效率**（召回快）与**模型精度**（排序准）。


## YouTubeDNN召回层

### 任务定义

将推荐建模为**预测用户下一个会观看的视频**，即**极端多分类问题**：

$$P(w_t=i | U, C) = \frac{e^{v_i \cdot u}}{\sum_{j \in V} e^{v_j \cdot u}}$$

其中 $u$ 是用户Embedding，$v_i$ 是视频Embedding。

目标：

在训练时，模型会把用户的历史行为（看过的视频、搜索词）输入 DNN，输出一个**用户向量（u）**。

此时，视频库里有**几百万个视频**，每个视频都有自己的向量（v）。模型会计算 `u` 和所有 `v` 的内积，然后经过 Softmax，得出“用户**接下来会看**每一个视频”的概率。

- 假设用户**真实**观看（点击）的视频是 **视频 A**。
- 模型预测视频 A 的概率是 `P(A)`。

这里的 **“似然”** 就是指 **模型认为用户会看 A 的概率 `P(A)`**。

这个概率值带来的结果：

- **情况一（模型猜得准）**：模型觉得 A 的概率很高，比如 `P(A) = 0.9`（90%）。
  - 取对数：`log(0.9) = -0.105`（负数，很小）
  - 取负对数：`-(-0.105) = 0.105`（很小的正数）

- **情况二（模型猜得差）**：模型觉得 A 的概率很低，比如 `P(A) = 0.001`（千分之一）。
  - 取对数：`log(0.001) = -6.9`（负数，很大）
  - 取负对数：`-(-6.9) = 6.9`（很大的正数）

  最小化用户真实观看视频的负对数似然就是我们的目标。

### YouTubeDNN召回层模型结构

YouTubeDNN在架构上延续了双塔设计，但引入了一个关键的思想转变：将召回任务重新定义为“预测用户下一个会观看的视频”。

YouTubeDNN采用了“非对称”的双塔架构：用户塔集成了观看历史、搜索历史、人口统计学特征等多模态信息，用户观看的视频ID通过嵌入层映射后进行平均池化聚合，模型还引入了“Example Age”特征来建模内容新鲜度的影响；物品塔则相对简化，本质上是一个巨大的嵌入矩阵，每个视频对应一个可学习的向量，避免了复杂的物品特征工程。

#### 用户塔

**输入层**：

- 用户观看过的视频ID序列 → Embedding → **Average Pooling**
- 用户搜索词序列 → Embedding → **Average Pooling**

- 地理特征 Embedding（用于冷启动）
- 人口统计学特征（年龄、性别等）

- **Example Age**（视频年龄特征）

> **为什么用Average Pooling而不是Sum或Concat？** 答：用户历史行为序列**长度不固定**，Average Pooling可得到**固定维度**的向量，且实验表明效果最好。

**隐藏层**：

- 三层ReLU全连接网络
- 采用**塔形结构**：1024 → 512 → 256（逐层减半）

**输出层**：

- 最后一层ReLU输出 = **用户Embedding**（类比Word2Vec中的中心词）
- Softmax输出 = 用户观看每个视频的概率

- **训练时**：做Softmax多分类
- **服务时**：用**最近邻搜索**（如Faiss）替代Softmax

### 工程技巧

| 技巧 | 说明 | 目标 |
|------|------|---------|
| **Example Age** | 加入视频年龄特征，让模型学习**内容新鲜度**偏好 | 解决推荐系统中的**冷启动**和**新鲜度**问题 |
| **非对称时序分割** | 将用户**最后一次观看**作为Label，而非随机选取 | 为什么不用随机选取？避免**未来信息泄露** |
| **负采样** | 百万分类无法直接Softmax，采用**重要性采样**只计算数千个负样本，速度提升**100多倍** | 大规模多分类的优化方法 |
| **用户样本均衡** | 每个用户生成**固定数量**的训练样本 | 解决**活跃用户主导**模型的问题 |


## YouTubeDNN排序层

### 任务与结构

- **输入**：召回层输出的**几百个**候选视频
- **目标**：对候选视频进行**精准排序**

- **结构**：与召回模型类似，但**特征更丰富**

### 特征工程

- **视频特征**：视频ID、频道、标签、发布时间等
- **用户特征**：更细粒度的历史行为统计

- **上下文特征**：用户当前设备、时间等
- **交叉特征**：用户与视频的关系特征

### 训练目标

排序模型以**观看时长**为优化目标：

- 采用**加权逻辑回归**，正样本的权重 = **观看时长**
- 线上预估时用 $e^{Wx+b}$ 近似观看时长

> **为什么排序不用CTR而用观看时长？** 答：YouTube场景下，**播放时长**比**是否点击**更能反映用户真实兴趣和满意度。


## 训练与服务分离

| 阶段 | 做法 | 原因 |
|------|------|------|
| **训练** | 完整DNN + Softmax多分类 | 充分利用**丰富的用户特征**和**复杂的模型结构** |
| **服务** | 用户Embedding + 最近邻搜索（ANN） | 百万级全Softmax计算量过大，**实时性**无法满足 |

### 训练与服务具体实现

- **离线**：训练得到**视频Embedding矩阵**（Softmax层权重）
- **在线**：

  1. 实时计算**用户Embedding**（通过DNN前向传播）

  2. 用**Faiss**等ANN工具在视频Embedding中做最近邻搜索

  3. 返回Top-N候选视频

> **为什么在线用ANN而不是重新算Softmax？** 答：Softmax需要对**全量视频**（百万级）计算内积，延迟不可接受；ANN可将复杂度从O(N)降至O(log N)。


## 常见面试题汇总

### 1. YouTubeDNN的整体架构是什么？

YouTubeDNN采用**两阶段漏斗式**架构：

- **召回层（Candidate Generation）**：
  - 输入：用户观看历史、搜索历史、人口统计学特征、Example Age
  - 结构：Embedding层 → Average Pooling → 三层ReLU塔形网络（1024→512→256）→ Softmax输出
  - 目标：从百万级视频库中快速筛选出几百个候选视频

- **排序层（Ranking）**：
  - 输入：召回层输出的候选视频 + 更丰富的用户/视频特征
  - 目标：对候选视频进行精准排序，以**观看时长**为优化目标

- **训练与服务分离**：
  - 训练时：完整DNN + Softmax多分类
  - 服务时：用户Embedding + 最近邻搜索（ANN）

> **一句话记忆**：召回快（百万→几百），排序准（几百→最终推荐），训练服务不一致（离线复杂、在线轻量）。


### 2. 召回模型的输入输出分别是什么？

**输入特征**（四大类）：

| 特征类别 | 具体内容 | 处理方式 |
|---------|---------|----------|
| **用户历史行为** | 用户观看过的视频ID序列、搜索词序列 | Embedding + Average Pooling |
| **人口统计学** | 年龄、性别、地理位置等 | Embedding或离散化 |
| **上下文特征** | Example Age（视频年龄） | 直接输入（标量） |
| **其他** | 用户设备、登录状态等 | 离散化后Embedding |

**输出**：
- **训练时**：Softmax输出每个视频的观看概率分布
- **服务时**：用户Embedding（最后一层ReLU的输出）


### 3. 为什么用三层ReLU？塔形设计的意义？

- **为什么用三层**：实验表明，深层网络（>3层）在小规模数据上容易过拟合，三层是当时的最佳平衡点。
- **塔形设计（1024→512→256）**：
  - 逐层压缩维度，提取**高层次的抽象特征**
  - 减少参数量，降低过拟合风险
  - 最后一层（256维）作为用户Embedding，便于后续ANN检索


### 4. 用户Embedding和视频Embedding分别从哪里来？

- **用户Embedding**：由DNN的**最后一层ReLU输出**得到。它是用户所有行为特征经过非线性变换后的最终表征。
- **视频Embedding**：来自Softmax层的**权重矩阵**。Softmax层的大小是 `embedding_dim × vocab_size`，其中每一列就是一个视频的Embedding向量。


### 5. Example Age是什么？为什么要加？

- **Example Age** = 当前训练时间 - 视频上传时间（或样本生成时间）。
- **为什么要加**：
  - 解决**冷启动**和**新鲜度**问题：新视频没有用户交互历史，但应该被推荐。
  - 让模型学习**内容新鲜度**的偏好：用户可能更喜欢新视频。
  - 防止模型对老视频过拟合（因为训练数据中老视频积累更多样本）。

> 线上服务时，Example Age被设为**0**或一个很小的值，让模型更倾向于推荐新内容。


### 6. 负采样怎么做？为什么需要？

- **问题**：Softmax需要对**百万级**视频做内积计算，计算量过大（$O(V)$）。
- **做法**：采用**重要性采样（Importance Sampling）**：
  - 每个训练样本只用 **数千个** 负样本（而非全量）
  - 采样分布采用**热门视频**的偏置采样（热门视频更可能成为负样本）
  - 速度提升 **100多倍**
- **为什么需要**：在保证模型精度的前提下，将训练时间从不可接受降到可行。

> 与Word2Vec的负采样类似，但YouTube采用的是**基于热度的偏置采样**。


### 7. 训练样本怎么构造？正负样本怎么选？

- **正样本**：用户实际观看过的视频（通常是**最后一个**，采用**非对称时序分割**）
- **负样本**：从全量视频库中随机采样（热门视频采样概率略高）
- **关键点**：**用用户最后一次观看作为Label**，而非随机选取
  - 为什么要这样？避免**未来信息泄露**：如果用随机选取，可能会把用户早就看过的视频当成Label，模型学到的是"过去"而非"下一个"。


### 8. 为什么召回需要随机负采样？

- 如果只用正样本训练，模型会退化：把所有视频都预测为"用户会看"，无法区分好坏。
- 负样本让模型学会"对比"：不仅要靠近正样本，还要远离负样本。
- 随机负采样模拟了真实线上环境：大多数视频确实不是用户感兴趣的。


### 9. 训练和在线服务为什么不一样？

| 阶段 | 做法 | 原因 |
|------|------|------|
| **训练** | 完整DNN + Softmax多分类 | 充分利用**丰富的用户特征**和**复杂的模型结构** |
| **服务** | 用户Embedding + 最近邻搜索 | 百万级全Softmax**实时性**无法满足（延迟不可接受） |

- 训练时：精度优先，可以花几小时甚至几天训练。
- 服务时：速度优先，要求 **< 100ms** 响应。


### 10. YouTubeDNN的优缺点是什么？

**优点**：
- **工业级可用**：两阶段架构平衡了速度和精度
- **训练服务分离**：在线召回效率极高
- **工程技巧丰富**：Example Age、负采样、非对称时序分割等都是工业界可复用的实践
- **效果好**：在当时显著提升了YouTube的推荐质量

**缺点**：
- **未建模时序动态性**：Average Pooling丢失了序列顺序信息，无法捕捉用户兴趣的演变
- **冷启动依赖特征**：依赖Example Age和地理特征，但新内容仍然缺乏交互信号
- **特征工程较重**：需要大量人工特征设计和工程实现
- **在线服务需要额外系统**：需要单独维护Faiss等ANN服务


### 11. 为什么不用RNN/LSTM建模序列？

- 当时RNN/LSTM在视频推荐场景下的**收益不明显**，但**训练和服务成本大幅增加**。
- YouTube的用户行为序列很长（多年历史），RNN难以处理。
- Average Pooling虽然丢了顺序，但在百万级召回场景下**足够好用**且**工程实现简单**。
- 后续工作（如DIN、DIEN）才逐步引入注意力机制和GRU来建模序列。


### 12. 排序模型为什么用观看时长作为目标？

- **点击（CTR）** 在YouTube场景下是"弱信号"：用户可能出于好奇点击，但几秒后就关掉。
- **观看时长**更能反映用户的**真实兴趣**和**满意度**。
- 具体做法：
  - 训练时采用**加权逻辑回归**，正样本权重 = 观看时长
  - 线上预估时用 $e^{Wx+b}$ 来近似观看时长
- 这和业务目标高度一致：YouTube的核心指标是**用户总观看时长**。

```python
import tensorflow as tf
# 从工具模块导入辅助函数
from .utils import (
    concat_group_embedding,                       # 按组拼接/聚合嵌入
    build_input_layer,                           # 构建Keras输入层字典
    build_group_feature_embedding_table_dict,   # 构建分组嵌入表字典
)
# 导入自定义层
from .layers import DNNs, SampledSoftmaxLayer, L2NormalizeLayer, SqueezeLayer
def build_youtubednn_model(feature_columns, model_config):
    """
    构建 YouTubeDNN 召回模型（训练模型 + 用户模型 + 物品模型）
    Args:
        feature_columns: 特征列配置列表，每个元素包含 name, vocab_size, group 等信息
        model_config: 模型超参数字典，包含 emb_dim, neg_sample, dnn_units, label_name
    Returns:
        model: 训练用的 Keras Model，输出为 Sampled Softmax 损失
        user_model: 用于在线推理的用户向量生成模型
        item_model: 用于离线生成物品向量库的模型
    """
    # ==================== 1. 读取配置 ====================
    emb_dim = model_config.get("emb_dim", 16)            # 最终嵌入向量维度（通常256）
    neg_sample = model_config.get("neg_sample", 20)      # 负采样数量（论文中几千，这里简化）
    dnn_units = model_config.get("dnn_units", [32])      # 用户塔隐藏层单元数（可配置为[1024,512]）
    label_name = model_config.get("label_name", "movie_id")  # 目标物品ID字段名
    # ==================== 2. 构建输入层 ====================
    # 为每个特征列创建 Keras Input 张量，返回字典 {特征名: Input(...)}
    input_layer_dict = build_input_layer(feature_columns)
    # ==================== 3. 构建嵌入表与分组嵌入 ====================
    # 返回值：
    #   group_embedding_feature_dict: 按 group 聚合后的嵌入结果，如 {"user_dnn": Tensor(B, D*N), "raw_hist_seq": Tensor(B, D)}
    #   embedding_table_dict: 每个特征列的嵌入表（Embedding层），用于后续查找物品向量
    group_embedding_feature_dict, embedding_table_dict = (
        build_group_feature_embedding_table_dict(
            feature_columns,
            input_layer_dict,
            prefix="embedding/",                  # 变量名前缀，便于命名空间管理
            return_embedding_table=True,          # 同时返回嵌入表对象
        )
    )
    # ==================== 4. 构造用户塔的输入（核心：平均池化） ====================
    # 获取用户静态特征（如年龄、性别、user_id）的拼接向量，形状 (batch_size, D * N_user_features)
    user_feature_embedding = concat_group_embedding(
        group_embedding_feature_dict, "user_dnn"
    )
    # 如果存在用户历史序列特征（如最近观看过的视频ID序列），则对其进行平均池化
    if "raw_hist_seq" in group_embedding_feature_dict:
        # concat_group_embedding 内部会对历史序列在序列维度上做 Mean Pooling，
        # 输出形状 (batch_size, D)   —— 对应论文中的“Average Pooling”
        hist_seq_embedding = concat_group_embedding(
            group_embedding_feature_dict, "raw_hist_seq"
        )
        # 将静态特征和池化后的历史特征拼接，作为用户塔的输入
        user_dnn_inputs = tf.concat(
            [user_feature_embedding, hist_seq_embedding], axis=1
        )   # 形状 (batch_size, D * N_user_features + D)
    else:
        # 如果没有历史序列，直接使用静态特征
        user_dnn_inputs = user_feature_embedding   # (batch_size, D * N_user_features)
    # ==================== 5. 获取物品嵌入表与词汇表大小 ====================
    # 从嵌入表字典中取出目标物品（如 movie_id）的嵌入层
    item_embedding_table = embedding_table_dict[label_name]
    # 从特征列配置中获取物品词汇表大小（视频总数）
    item_vocab_size = None
    for fc in feature_columns:
        if fc.name == label_name:
            item_vocab_size = fc.vocab_size
            break
    # ==================== 6. 构建用户塔（User Tower） ====================
    # 通过多层全连接网络将用户输入映射为低维向量，最后一层输出维度为 emb_dim
    user_dnn_output = DNNs(
        units=dnn_units + [emb_dim],   # 例如 [1024, 512, 256]
        activation="relu",
        use_bn=False
    )(user_dnn_inputs)                 # 形状 (batch_size, emb_dim)
    # 对用户向量进行 L2 归一化，使得内积等于余弦相似度，便于线上 ANN 检索
    user_dnn_output = L2NormalizeLayer(axis=-1)(user_dnn_output)   # 形状 (batch_size, emb_dim)
    # ==================== 7. 构建 Sampled Softmax 损失层 ====================
    # 该层负责计算训练损失：对每个正样本，随机采样 neg_sample 个负样本，
    # 计算二分类交叉熵损失（正样本标为1，负样本标为0），避免全量 Softmax 的庞大计算量
    sampled_softmax_layer = SampledSoftmaxLayer(
        item_vocab_size,
        neg_sample,
        emb_dim
    )
    # 传入三个必需张量：
    #   - 物品嵌入矩阵（形状: vocab_size × emb_dim）
    #   - 用户向量（形状: batch_size × emb_dim）
    #   - 真实物品 ID（形状: batch_size, 1）
    output = sampled_softmax_layer([
        item_embedding_table.embeddings,   # 物品权重矩阵
        user_dnn_output,                   # 用户向量
        input_layer_dict[label_name]       # 真实标签（物品ID）
    ])
    # output 是一个标量损失值（形状: () 或 (1,)），可直接用于反向传播
    # ==================== 8. 组装训练模型 ====================
    # 训练模型：输入为所有特征字典，输出为 Sampled Softmax 损失
    model = tf.keras.Model(inputs=input_layer_dict, outputs=output)
    # 注意：因为 output 已经是损失，所以 compile 时 loss 参数可以设为 None
    # ==================== 9. 构建物品向量生成模型（用于离线构建索引） ====================
    # 输入物品 ID，输出归一化的物品向量
    # 从嵌入表中查找物品 ID 对应的嵌入，形状 (batch_size, 1, emb_dim)
    output_item_embedding = SqueezeLayer(axis=1)(
        embedding_table_dict[label_name](input_layer_dict[label_name])
    )   # 去除第1维，变为 (batch_size, emb_dim)
    # 对物品向量也进行 L2 归一化，与用户向量保持一致
    output_item_embedding = L2NormalizeLayer(axis=-1)(output_item_embedding)
    # 构建物品模型
    item_inputs_dict = {label_name: input_layer_dict[label_name]}
    item_model = tf.keras.Model(
        inputs=item_inputs_dict,
        outputs=output_item_embedding
    )
    # ==================== 10. 构建用户向量生成模型（用于线上实时计算） ====================
    # 选出所有属于 "user_dnn" 或 "raw_hist_seq" 组的特征名
    user_feature_names = [
        fc.name
        for fc in feature_columns
        if "user_dnn" in fc.group or "raw_hist_seq" in fc.group
    ]
    # 构建用户模型的输入字典（只保留用户相关特征）
    user_inputs_dict = {name: input_layer_dict[name] for name in user_feature_names}
    # 用户模型的输出就是之前计算的 user_dnn_output（归一化后的用户向量）
    user_model = tf.keras.Model(
        inputs=user_inputs_dict,
        outputs=user_dnn_output
    )
    # ==================== 11. 返回三个模型 ====================
    # 训练时使用 model；线上服务时：
    #   - 用户请求：调用 user_model 生成用户向量
    #   - 离线阶段：调用 item_model 生成所有物品向量并构建 Faiss 索引
    return model, user_model, item_model
```