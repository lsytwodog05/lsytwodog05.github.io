---
title: DeepFM排序
tags:
  - DeepFM
  - 排序
categories:
  - 推荐系统
  - 学习笔记
abbrlink: 56577
date: 2026-07-14 22:32:16
---

## Wide & Deep

参考：[funrec - Wide & Deep](https://datawhalechina.github.io/fun-rec/chapter_2_ranking/1.wide_and_deep.html)

## 模型概述

**Wide & Deep 是什么？**

Wide & Deep 是 Google 在 2016 年提出的推荐模型，核心思想是**通过联合训练（Joint Training）一个线性模型（Wide部分）和一个深度模型（Deep部分），同时实现记忆和泛化**。

- **记忆（Memorization）**：学习高频共现的特征组合（如“安装了App A的用户也喜欢安装App B”），依赖Wide部分。
- **泛化（Generalization）**：利用低维稠密Embedding挖掘长尾、稀疏特征间的相似性（如“喜欢恐怖片的用户可能也喜欢悬疑片”），依赖Deep部分。

## 模型架构详解

### Wide部分

- **输入**：原始稀疏特征 + **交叉积变换**。
- **核心公式**：

  
$$
\phi_k(x) = \prod_{i=1}^{d} x_i^{c_{ki}}, \quad c_{ki} \in \{0, 1\}
$$

  即如果特征组合中所有特征都为1，则该交叉特征为1（如 `AND(gender=female, language=en)`）。
- **作用**：记忆特定的、频繁出现的特征组合模式。
- **输出**：$y_{wide} = w_{wide}^T [x, \phi(x)] + b_{wide}$

Wide部分需要**人工设计特征交叉**，这是其相对于DeepFM的短板。

### Deep部分

- **输入**：所有特征的**稠密Embedding向量**（离散特征） + 连续特征（可直接输入）。
- **结构**：经典多层感知机（MLP），通常使用ReLU激活函数。
- **作用**：通过低维Embedding捕获特征间的语义相似性，泛化到未见过的新组合。
- **输出**：$y_{deep} = f_{DNN}(x_{embedding})$

### 联合训练与输出


$$
\hat{y} = \text{sigmoid}(y_{wide} + y_{deep})
$$


- **联合训练**：Wide和Deep部分在训练时**同时、端到端**地更新参数，共享同一个损失函数。
- **与集成的区别**：集成是分别训练两个模型，最后做加权平均；联合训练让Wide部分也能感知Deep部分的梯度信号，两者协同优化。

“Wide & Deep的Wide部分和Deep部分是分开训练再融合的吗？”  

→ 答 **联合训练，不是集成**。

## 优势与适用场景

| 维度 | 说明 |
| :--- | :--- |
| **记忆与泛化兼顾** | 既能记住高频模式（Wide），又能探索长尾特征关系（Deep） |
| **无需预训练** | Embedding与DNN可端到端训练，业务接入方便 |
| **冷启动友好** | Deep部分的泛化能力对低频物品/特征表现更好 |

**适用场景**：App推荐、广告CTR预估、搜索排序等既有高频热门内容又有长尾需求的场景。

## 关键工程细节

**1. 特征工程**

- 交叉特征通常是**业务强相关的**（如“用户所在城市”与“广告品类”的交叉）。
- 在实际应用中，通常只选取**频次较高的交叉特征**，避免Wide部分参数爆炸。

**2. 优化器选择**

- **Wide部分**：使用 **FTRL**，因其能产生稀疏解（大量权重归零），适合大规模稀疏线性模型。
- **Deep部分**：使用 **AdaGrad**，适合处理高维、稀疏特征的学习率自适应调整。

**3. 正则化**

- Wide部分：L1正则化（FTRL自带，产生稀疏性）。
- Deep部分：L2正则化 + Dropout（防过拟合）。

**4. 样本处理**

- 需要**随机打乱**，避免同一用户数据连续出现导致梯度震荡。
- 类别特征需做 **One-Hot或Embedding**，连续特征需做标准化或分桶。


### Wide & Deep vs LR

- **LR**：只能学习一阶特征，无法捕捉交叉关系（除非人工组合）。
- **W&D**：通过Deep部分自动学习高阶交叉，通过Wide部分记忆特定的高频交叉，性能显著提升。

### Wide & Deep vs DNN

- **纯DNN**：泛化能力强，但可能**过拟合高频特征模式**（对热门内容过度倾向）。
- **W&D**：Wide部分专门用来记忆高频模式，弥补了DNN对稀疏交叉特征“记忆不牢”的问题。

## FM

参考：[funrec - FM](https://datawhalechina.github.io/fun-rec/chapter_2_ranking/2.feature_crossing/1.second_order.html)

FM 是一种**通用的预测模型**，它通过为每个特征学习一个**隐向量**，用隐向量的内积来建模**任意两个特征之间的二阶交互（交叉）**，从而解决高维稀疏数据下特征组合难以学习的问题。

在 LR（逻辑回归）中，特征交叉 $w_{ij}$ 需要同时看到特征 $i$ 和 $j$ 都不为0的样本才能学到。但在稀疏数据中，这种共现样本极少。FM 将其拆解为两个隐向量的内积 $\langle v_i, v_j \rangle$，使得即使特征 $i$ 和 $j$ 在训练样本中很少同时出现，它们的隐向量也能通过与其他特征的共现样本被间接学习到。


### 数学公式与时间复杂度

FM 模型的预测公式包含三部分：


$$
\hat{y}(x) = \underbrace{w_0}_{\text{全局偏置}} + \underbrace{\sum_{i=1}^n w_i x_i}_{\text{一阶线性部分}} + \underbrace{\sum_{i=1}^n \sum_{j=i+1}^n \langle v_i, v_j \rangle x_i x_j}_{\text{二阶特征交叉部分}}
$$


其中：

- $n$ 是特征数量
- $v_i$ 是第 $i$ 个特征的 $k$ 维隐向量
- $\langle v_i, v_j \rangle = \sum_{f=1}^k v_{i,f} v_{j,f}$

**时间复杂度如何从 O(kn²) 优化到 O(kn)？**

利用数学恒等式，二阶交叉项可以化简为：


$$
\sum_{i=1}^n \sum_{j=i+1}^n \langle v_i, v_j \rangle x_i x_j
= \frac{1}{2} \sum_{f=1}^k \left( \left( \sum_{i=1}^n v_{i,f} x_i \right)^2 - \sum_{i=1}^n v_{i,f}^2 x_i^2 \right)
$$


> 这个化简把原本需要两两循环（$O(kn^2)$）的计算，变成了先对所有特征求和（$O(kn)$），再做平方和相减，使 FM 可以轻松部署到工业级大特征规模的场景中。


### 优势

| 优势点 | 详细解释 |
| :--- | :--- |
| **1. 自动特征交叉** | 无需像 LR 那样手动做特征工程，模型自动学习特征组合。 |
| **2. 解决稀疏学习问题** | 通过隐向量共享参数，即使特征 $i$ 和 $j$ 没共现过，只要它们分别与其他特征共现过，隐向量也能被更新，从而算出它们的交叉权重。 |
| **3. 线性时间复杂度** | 计算复杂度为 $O(kn)$，与特征数量成线性关系，极其适合在线服务。 |
| **4. 灵活性高** | FM 不仅适用于回归（CTR预估），也适用于分类和二值化标签预测，且能处理**连续特征**和**离散特征**的混合输入。 |


### 工程实践

**1. 特征归一化为什么重要？**

- **原因**：隐向量内积 $\langle v_i, v_j \rangle$ 的大小受特征值尺度（Scale）直接影响。如果 `age` 取值范围 1~100，而 `price` 是 0~1，内积会被 `age` 主导。
- **做法**：连续特征必须做 Z-score 标准化或 Min-Max 缩放，离散特征做 One-Hot 后也需考虑。

**2. 隐向量维度 $k$ 怎么选？**

- **经验值**：通常 8 ~ 256 之间。面对复杂交互数据（如极大规模特征）可偏大（如 128），简单场景 16 足够。
- **调参依据**：太小欠拟合（不足以表达特征间的复杂关系），太大过拟合（参数过多）。


### 常见面试题汇总

### 1. 介绍一下 FM 模型的核心思想。

FM 的核心思想是：**通过为每个特征学习一个低维稠密的隐向量（Latent Vector），并利用隐向量之间的内积来建模任意两个特征之间的二阶交互关系。**

在传统线性模型（如 LR）中，特征之间是独立的。如果要考虑特征交叉，需要人工构造交叉特征（如 `gender=男 & age=20`），这不仅工作量大，而且在高维稀疏数据中，很多交叉特征在训练样本中从未出现过，导致权重无法学习。

FM 通过**参数共享**解决了这一问题：
- 对于特征 $i$，学习一个隐向量 $v_i \in \mathbb{R}^k$。
- 特征 $i$ 和 $j$ 的交叉权重不再是独立的 $w_{ij}$，而是由 $\langle v_i, v_j \rangle$ 决定。

这样做的好处是：即使特征 $i$ 和 $j$ 从未同时出现在一个样本中，只要它们分别与其它特征共现过，它们的隐向量就能被更新，从而间接计算出 $\langle v_i, v_j \rangle$。


### 2. FM 的数学公式是什么？解释各项含义。

FM 的预测公式为：


$$
\hat{y}(x) = \underbrace{w_0}_{\text{全局偏置}} + \underbrace{\sum_{i=1}^{n} w_i x_i}_{\text{一阶线性项}} + \underbrace{\sum_{i=1}^{n-1} \sum_{j=i+1}^{n} \langle v_i, v_j \rangle x_i x_j}_{\text{二阶交叉项}}
$$


- **$w_0$**：全局偏置（截距），反映整体的平均点击率基准。
- **$w_i$**：第 $i$ 个特征的一阶权重，衡量该特征对目标的独立影响能力。
- **$x_i$**：第 $i$ 个特征的值（离散特征 one-hot 后为 0/1，连续特征为实际数值）。
- **$v_i$**：第 $i$ 个特征的 $k$ 维隐向量，是模型需要学习的参数。
- **$\langle v_i, v_j \rangle$**：两个隐向量的内积，表示特征 $i$ 和 $j$ 的交互强度。

> 内积计算：$\langle v_i, v_j \rangle = \sum_{f=1}^{k} v_{i,f} \cdot v_{j,f}$


### 3. 为什么 FM 能在高维稀疏数据下工作得很好？
FM 在稀疏场景下依然有效，是因为隐向量的学习**不依赖于特定特征对的同时出现**，而是通过全局特征共现信息间接完成。

### 4. 写出 FM 的化简公式，并说明时间复杂度是多少。

二阶交叉项的直接计算需要对所有 $i < j$ 进行两两内积，复杂度为 $O(k n^2)$，不适用于大规模特征场景。

利用数学恒等式，可以化简为：


$$
\sum_{i=1}^{n} \sum_{j=i+1}^{n} \langle v_i, v_j \rangle x_i x_j
= \frac{1}{2} \sum_{f=1}^{k} \left( \left( \sum_{i=1}^{n} v_{i,f} x_i \right)^2 - \sum_{i=1}^{n} v_{i,f}^2 x_i^2 \right)
$$


**推导过程**：

因为 $(\sum x_i)^2 = \sum x_i^2 + 2\sum_{i<j} x_i x_j$，所以：


$$
\sum_{i<j} \langle v_i, v_j \rangle x_i x_j
= \frac{1}{2} \left( \sum_{i,j} \langle v_i, v_j \rangle x_i x_j - \sum_i \langle v_i, v_i \rangle x_i^2 \right)
$$


其中 $\sum_{i,j} \langle v_i, v_j \rangle x_i x_j = \sum_{f=1}^k (\sum_i v_{i,f} x_i)(\sum_j v_{j,f} x_j) = \sum_{f=1}^k (\sum_i v_{i,f} x_i)^2$。

化简后的计算只需：
1. 对所有特征做一次求和（$O(n)$）
2. 对所有特征做一次平方和（$O(n)$）
3. 对 $k$ 个维度分别计算（$O(kn)$）

因此，**时间复杂度为 $O(k n)$**，与特征数量 $n$ 成线性关系。


### 5. 如果特征数量 $n = 10^7$，维度 $k = 128$，FM 计算一次前向传播的复杂度是多少？为什么说这个计算是线性的？


- **复杂度计算**：$O(k \times n) = 128 \times 10^7 = 1.28 \times 10^9$，即约 **12.8 亿次浮点运算**（1.28e9 FLOPs）。
- **为什么说是线性的**：这个量级虽然很大，但它是**随着特征数量 $n$ 线性增长**的，而不是平方级（$O(n^2)$）增长。对于工业级的 $10^7$ 特征规模，$O(n)$ 是工程上可接受的，而 $O(n^2)$ 则完全不可行（会达到 $10^{14}$ 量级）。

> 在工程实现中，由于稀疏特征（One-Hot）的 $x_i$ 大部分为 0，实际有效计算量远小于这个值，通常只遍历非零特征即可。

### 6. 在工业界线上服务中，FM 的隐向量更新策略是怎样的？（实时梯度更新 vs 全量离线更新）

工业界通常采用 **“全量离线训练 + 增量在线更新”** 的混合策略，而非单一的实时或全量更新。

**1. 全量离线训练**
- 使用过去 N 天的全量日志数据（如 7~15 天），从头训练或从上一轮 checkpoint 继续训练。
- 产出稳定的基模型（Base Model），覆盖绝大多数用户的长期兴趣。
- 优点：稳定性高，抗噪性强；缺点：无法捕捉分钟级/小时级的热点变化。

**2. 实时增量更新**
- 对于最新产生的样本（最近 1~2 小时的曝光和点击），使用 **FTRL** 或 **在线梯度下降** 对模型参数进行增量修正。
- 由于 FM 的隐向量维度较高，通常只对**高频特征**（如当前热门视频ID、实时关键词）的隐向量做实时更新，低频特征仍使用离线版本。
- 优点：能迅速捕捉热点；缺点：对样本噪声敏感，容易过拟合。

**3. 工业界落地架构**：
- 参数服务器（Parameter Server）架构中，worker 节点计算梯度，PS 节点汇总并更新参数。
- 线上服务通常**不直接对每个请求做梯度更新**（因为 QPS 高，来不及），而是采用“**在线样本流 → 微批（Mini-batch）→ 异步更新 PS**”的模式，延迟通常在分钟级。

### 7. 如果有亿级别的特征，如何存储 FM 的隐向量？（参数服务器架构，或者分片存储）

对于亿级别的特征（如 $10^9$ 个特征 ID），每个特征需要存储一个 $k$ 维浮点数向量（如 $k=128$，每个 float=4 字节），理论上需要 $10^9 \times 128 \times 4 = 512\text{GB}$ 内存，单机无法承载。工业界通常采用以下方案：

**1. 参数服务器架构（Parameter Server, PS）**
- 将隐向量表（Key: Feature ID, Value: Vector）**水平分片**存储在多台 PS 节点上。
- 常见的分片策略：**按特征 ID 取模（Range Partitioning）** 或 **一致性哈希（Consistent Hashing）**。
- 训练时，worker 向 PS 请求所需特征的向量并计算梯度，PS 汇总梯度后更新并同步给 worker。

**2. 内存优化技术**
- **使用 float16 / int8 量化**：在精度损失可控的前提下，将 32 位浮点压缩为 16 位甚至 8 位。
- **低频特征过滤**：对出现次数低于阈值的特征，不分配独立隐向量，统一映射为 `[UNK]` 的共享向量。
- **Embedding 层使用 Hashing Trick**：通过哈希函数将无限特征映射到固定大小的桶（Bucket），牺牲一定碰撞精度换省内存（常见于大规模稀疏场景）。

**3. 存储分层**
- **热数据（高频特征）** 驻留内存（如最近 30 天活跃的特征），部署在 PS 的 DRAM 中。
- **冷数据（低频/历史特征）** 存放在 SSD 或分布式文件系统（如 HDFS）中，访问时按需加载。

**4. Redis + SSD 混合存储**（适用于在线服务）
- 线上服务读取隐向量时，热数据直接走 Redis 内存，冷数据从 SSD 加载，采用 LRU 淘汰策略。

## DeepFM

参考：[funrec - DeepFM](https://datawhalechina.github.io/fun-rec/chapter_2_ranking/2.feature_crossing/1.second_order.html#deepfm)

**DeepFM 是什么？**

DeepFM 是一种将**因子分解机（FM）** 与**深度神经网络（DNN）** 相结合的推荐模型。它通过端到端的方式，自动学习**低阶**（二阶）和**高阶**的特征交互，无需人工特征工程。

- **FM 部分**：负责捕捉**低阶**（一阶和二阶）的特征交互。
- **DNN 部分**：负责捕捉**高阶**的特征交互。
- **共享 Embedding**：FM 和 DNN 共享相同的特征嵌入层，这不仅减少了参数量，也让模型能更高效地训练。


### 架构题

DeepFM 的架构是面试的重点，通常需要画出结构图或描述数据流动

1.  **输入层与嵌入层**
    - 接收**离散特征**（如用户ID、物品ID、类别）和**连续特征**。
    - **嵌入层**将高维稀疏的离散特征映射为低维稠密的向量（Embedding）。
    - 这是模型的基础，所有特征都会经过这层转换成 DNN 能处理的稠密向量。

2.  **FM 部分**
    - 这部分与标准的 FM 模型一样，输出包含三部分：
        1.  **一阶部分（Linear）**：每个特征自身的权重，类似于线性回归。
        2.  **二阶部分（二阶交叉）**：通过特征隐向量的内积 `<vi, vj>` 来建模两两特征之间的交互。
        3.  全局偏置
    - 通过数学优化，FM 的计算复杂度可以从 O(kn²) 降低到 O(kn)。

3.  **DNN 部分**
    - **输入**：将嵌入层输出的所有特征的 Embedding 拼接（Concat）成一个长向量。
    - **结构**：一个经典的多层感知机（MLP），通常使用 ReLU 激活函数。
    - **作用**：通过多层非线性变换，自动学习特征之间复杂的高阶组合模式。

4.  **输出层（Output Layer）**
    - 将 FM 部分和 DNN 部分的输出相加，再经过 Sigmoid 函数，得到最终的 CTR 预测概率（0到1之间）。
    - 公式：`ˆy = sigmoid(y_FM + y_DNN)`。


### 工程实践

**1. 为什么 FM 和 DNN 要共享 Embedding？**

-   **减少过拟合**：共享的 Embedding 层同时被 FM 和 DNN 两部分训练，可以学习到更泛化的特征表示。
-   **提高效率**：只需维护一份 Embedding 矩阵，减少了模型参数量和计算开销。

**2. Embedding 怎么初始化？**

-   **常规做法**：使用 **Xavier 初始化**，让输入和输出的方差保持一致，使信号在网络中稳定传播。
-   **使用 ReLU 激活时**：推荐使用 **He 初始化**，它能更好地适应 ReLU 在负数区置零的特性。

**3. 如何处理欠拟合和过拟合？**

| 问题 | 解决方案 |
| :--- | :--- |
| **欠拟合** (Underfitting) | 增加 DNN 层数/神经元数、增加训练轮数（epoch）、增大学习率、减少正则化强度。 |
| **过拟合** (Overfitting) | 增大 Dropout 比率、减少训练轮数、增加数据量、增大正则化强度（L1/L2）、打乱数据。 |


-   **为什么不用 RNN 和 FM 结合？**
    -   因为 CTR 预估任务中，通常假设每次点击是独立的，不依赖序列信息，所以用 DNN 更合适。


```python
import tensorflow as tf

from .utils import (
    build_input_layer,
    build_group_feature_embedding_table_dict,
    concat_group_embedding,
    add_tensor_func,
    get_linear_logits,
)
from .layers import FM, DNNs


def build_deepfm_model(feature_columns, model_config):
    """
    构建 DeepFM (深度分解机) 排序模型。

    DeepFM 由 FM 组件（学习一阶和二阶特征交叉）和 DNN 组件（学习高阶非线性交叉）组成，
    两者共享相同的 Embedding 输入，输出 logit 相加后经过 Sigmoid 得到点击率。

    参数:
        feature_columns: FeatureColumn 列表，定义每个特征的名称、类型、分组、词汇表大小等
        model_config: 模型超参字典，包含:
            - dnn_units: list, DNN 隐藏层单元数 (默认 [64, 32])
            - dropout_rate: float, dropout 率 (默认 0.1)
            - linear_logits: bool, 是否在 FM 部分添加一阶线性项 (默认 True)

    返回:
        (model, None, None): 排序模型元组（后两个 None 用于统一接口）
    """
    # ==================== 1. 提取超参数 ====================
    # DNN 隐藏层神经元数量，例如 [64, 32] 表示两层，输出层为 1（logit）
    dnn_units = model_config.get("dnn_units", [64, 32])
    # Dropout 比率，防止 DNN 过拟合
    dropout_rate = model_config.get("dropout_rate", 0.1)
    # 是否添加线性项（一阶特征权重），对应公式中的 Σ w_i * x_i
    linear_logits = model_config.get("linear_logits", True)

    # ==================== 2. 构建输入层 ====================
    # 为每个特征创建 tf.keras.Input 占位符，返回字典 {特征名: Input张量}
    # 例如：{'user_id': Input(shape=(1,), name='user_id', dtype=tf.int32), ...}
    input_layer_dict = build_input_layer(feature_columns)

    # ==================== 3. 构建分组嵌入 ====================
    # 为每个离散特征创建 Embedding 层，并将输入特征映射为稠密向量。
    # 同时根据特征配置中的 group 字段，将同一组的特征 Embedding 拼接到一起（保留特征维度）。
    # 返回字典 {组名: 该组特征的 Embedding 张量}，形状为 (batch_size, num_features_in_group, embedding_dim)
    # 例如：'deepfm_user' 组包含 user_id 和 age，则张量形状 (B, 2, D)
    group_embedding_feature_dict = build_group_feature_embedding_table_dict(
        feature_columns, input_layer_dict, prefix="embedding/"
    )

    # ==================== 4. 准备收集各组 FM 和 DNN 输出的列表 ====================
    # 每个组独立计算 FM 和 DNN，最后分别相加
    fm_outputs = []
    dnn_outputs = []

    # ==================== 5. 遍历每个特征组，构建 FM 和 DNN 组件 ====================
    for (
        group_feature_name,
        group_feature_embedding,
    ) in group_embedding_feature_dict.items():
        # 只处理组名以 "deepfm" 开头的组（其他组可能用于辅助任务）
        if group_feature_name.startswith("deepfm"):

            # ---------- 5.1 拼接该组内所有特征的 Embedding ----------
            # concat_group_embedding 取出该组的 Embedding 并在特征维度 (axis=1) 上拼接
            # flatten=False 保持 (B, N, D) 形状，因为 FM 需要保留每个特征的向量
            # 例如：组内有 user_id 和 age，每个 embedding 长度为 D，则 concat 后形状 (B, 2, D)
            concat_feature = concat_group_embedding(
                group_embedding_feature_dict, group_feature_name, axis=1, flatten=False
            )  # B x N x D

            # ---------- 5.2 FM 组件：学习二阶特征交叉 ----------
            # FM 层输入 (B, N, D)，计算二阶交叉项：0.5 * ( (sum(v))^2 - sum(v^2) )
            # 输出形状 (B, 1)，表示该组的 FM logit（仅二阶部分，一阶部分可选加）
            fm_out = FM(name=f"fm_{group_feature_name}")(concat_feature)
            fm_outputs.append(fm_out)

            # ---------- 5.3 DNN 组件：学习高阶非线性交叉 ----------
            # 先将 (B, N, D) 展平为 (B, N*D) 作为 DNN 输入
            flatten_feature = tf.keras.layers.Flatten()(concat_feature)
            # DNNs 为自定义多层感知机，隐藏层为 dnn_units，最后输出维度为 1（logit）
            # 内部包含 BatchNormalization? 此处未加，但可配置
            dnn_out = DNNs(
                name=f"dnn_{group_feature_name}",
                units=dnn_units + [1],      # 例如 [64, 32, 1]
                dropout_rate=dropout_rate,
            )(flatten_feature)
            dnn_outputs.append(dnn_out)

    # ==================== 6. 合并所有组的 FM 输出 ====================
    # 如果有多组，将各组 FM logit 按元素相加（对应论文中 FM 部分合并）
    if len(fm_outputs) > 1:
        fm_logit = add_tensor_func(fm_outputs, name="fm_logits")
    else:
        fm_logit = fm_outputs[0]   # 形状 (B, 1)

    # ==================== 7. 合并所有组的 DNN 输出 ====================
    if len(dnn_outputs) > 1:
        dnn_logit = add_tensor_func(dnn_outputs, name="dnn_logits")
    else:
        dnn_logit = dnn_outputs[0]   # 形状 (B, 1)

    # ==================== 8. 可选：添加一阶线性项 ====================
    # 对应公式中的 Σ w_i * x_i，其中 x_i 为原始特征值（离散特征 one-hot 后为 1）
    if linear_logits:
        linear_logit = get_linear_logits(input_layer_dict, feature_columns)  # (B, 1)
        # 将线性项加到 FM logit 上，得到完整的 FM 部分（一阶 + 二阶）
        fm_logit = add_tensor_func([fm_logit, linear_logit], name="fm_linear_logits")

    # ==================== 9. 合并 FM 和 DNN 得到最终 logit ====================
    # DeepFM 的最终 logit = FM_logit + DNN_logit
    deepfm_logits = add_tensor_func([fm_logit, dnn_logit], name="deepfm_logits")  # (B, 1)

    # ==================== 10. 输出层：Sigmoid 得到点击率 ====================
    # 先展平确保形状为 (B,)，避免后续 Dense 产生多余维度
    deepfm_logits = tf.keras.layers.Flatten()(deepfm_logits)   # (B,)
    # Dense(1, activation='sigmoid') 输出概率，形状 (B, 1)
    output = tf.keras.layers.Dense(1, activation="sigmoid", name="deepfm_output")(
        deepfm_logits
    )
    # 再次展平得到 (B,)，便于与标签 (B,) 计算损失
    output = tf.keras.layers.Flatten()(output)

    # ==================== 11. 构建 Keras 模型并返回 ====================
    # 输入为所有 Input 张量的列表（按任意顺序，Keras 通过名称匹配）
    model = tf.keras.models.Model(
        inputs=list(input_layer_dict.values()), outputs=output
    )
    # 返回三个值，后两个 None 为统一接口（排序模型无需用户/物品子模型）
    return model, None, None
```