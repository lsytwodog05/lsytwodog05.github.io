---
title: swing
tags:
  - swing
  - 召回
categories:
  - 推荐系统
  - 学习笔记
abbrlink: 59811
date: 2026-06-15 17:50:52
---

**Swing** 是阿里巴巴原创的一种基于图结构的 **i2i（Item-to-Item）召回算法**。

### 核心思想

- **传统 ItemCF 的思路**：如果两个物品被**大量用户**共同购买/点击过，则它们相似。它只关注**共现用户的数量**（Count）。
- **Swing 的思路**：两个物品相似，不仅因为它们被共同购买，更因为共同购买它们的**那些用户之间相关性很低**。Swing 会给来自不同兴趣圈子的用户更高的权重，从而挖掘出更广泛、更小众的关联。

### 小圈子问题

ItemCF 的一个主要缺陷是容易受到**小圈子用户**的影响。

- **问题**：假设一群程序员都喜欢买格子衫和电子产品。ItemCF 会认为「格子衫」和「电子产品」高度相似，导致推荐结果出现偏差。
- **解决方案**：Swing 会判断这些共同购买的用户是否来自同一个「小圈子」。如果两个用户共同购买的商品重合度很高，则说明他们可能来自一个小圈子，他们共同产生的共现行为在计算相似度时会被**降低权重**。

### Swing 相似度计算公式

$$
\text{sim}(i, j) = \sum_{u \in U_i \cap U_j} \sum_{v \in U_i \cap U_j} \frac{1}{\alpha + |I_u \cap I_v|}
$$

- **`i, j`**：两个需要计算相似度的物品。
- **`U_i, U_j`**：分别与物品 `i` 和物品 `j` 有过交互的用户集合。
- **`u, v`**：分别来自共现用户集合的用户；`u` 和 `v` 与物品 `i`、`j` 共同构成一个「秋千」结构。
- **`I_u, I_v`**：用户 `u` 和用户 `v` 分别交互过的物品集合。
- **$|I_u \cap I_v|$**：用户 `u` 和用户 `v` 共同交互过的物品数量。**这个值越大，说明两个用户兴趣越重合，越可能来自同一个小圈子**。
- **`α`**：平滑参数，通常取值为 1。

对每一对用户 `u` 和 `v`，计算他们对物品 `i` 和 `j` 相似度的贡献。贡献值的大小与 $|I_u \cap I_v|$ 成反比：`u` 和 `v` 共同交互过的物品越少，说明他们越不属于同一个小圈子，其贡献权重就越高；反之，若他们共同交互过的物品很多，则贡献权重会被压低。最终，所有用户对的贡献累加起来，就是物品 `i` 和 `j` 的最终相似度。

| 维度 | ItemCF（基于物品的协同过滤） | Swing（基于图的协同过滤） |
| :--- | :--- | :--- |
| **核心关注点** | 共现用户的数量 | 共现用户的结构（是否来自小圈子） |
| **用户权重** | 所有用户平等，高频用户权重更高 | 根据用户间的兴趣重合度加权，低频用户权重更高 |
| **推荐倾向** | 更偏大众流行，高频物品更容易被召回 | 小众兴趣挖掘更精准，长尾物品覆盖更好 |
| **抗噪能力** | 较弱，易受小圈子噪声影响 | **较强**，能有效抑制小圈子噪声 |
| **相似度结果** | 同类目比例可能更高（更集中） | **同类目比例更低**，能实现「破圈」效果 |

### 细节与优化

- **数据结构**：需要维护 `User -> Items` 的倒排表，以快速计算用户间的重合度 $|I_u \cap I_v|$。
- **性能瓶颈与优化**：
  - **瓶颈**：最坏情况下时间复杂度为 $O(N^2 K^2)$，其中 $N$ 是物品数，$K$ 是平均每个物品的共现用户数。
  - **优化 1（控制 K）**：对热门商品（共现用户极多）的共现用户列表进行**截断**，例如只取前 200~500 个用户参与计算。
  - **优化 2（过滤稀疏）**：如果两个物品的共现用户少于一定阈值（如 5 个），则不进行计算，因为数据太少，结果不可靠。
- **增量更新**：当有新行为发生时，需要更新受影响的 $\text{Swing}(i, \text{other})$ 和 $\text{Swing}(\text{other}, i)$ 权重。
- **热点打压**：对于活跃度极高的用户（Big User），他们几乎与所有物品都有交互，容易产生噪声。Swing 公式中的 $1 / |I_u \cap I_v|$ 机制天然能降低这类用户的权重。

### 面试题

1. **Swing 和 ItemCF 的区别是什么？**  
   核心区别在于**如何定义物品相似度**。ItemCF 只看**共现用户的数量**，而 Swing 在此基础上，进一步考虑了**共现用户之间的相关性**，通过降低小圈子用户的权重来提高相似度的准确性。

2. **Swing 相比于 ItemCF，i2i 出现同类目的比例会更多还是更少？**  
   **更少**。Swing 能挖掘出不同兴趣圈层之间的潜在关联（如男女都喜欢的 Labubu），起到「**破圈**」效果，因此同类目比例会降低。

3. **Swing 的时间复杂度是多少？如何优化？**  
   最坏情况为 $O(N^2 K^2)$。优化方法主要是**对共现用户列表进行截断**（如限制为 200~500），同时**过滤掉共现用户数少于阈值的物品对**。

4. **overlap(u1, u2) 高活跃用户怎么打压？**  
   Swing 公式通过 $\frac{1}{\alpha + |I_u \cap I_v|}$ 对用户对进行加权，使得两个用户共同交互过的物品越多（重叠度越高），他们在计算中的权重就越低，从而自动降低了来自「小圈子」或高活跃度用户群体的影响。

5. **Swing 怎么做增量更新？**  
   需要维护 `User -> Items` 倒排表。新增一条 `(User, Item)` 交互时，需要更新该 User 与所有相关 Item 的 Swing 分数。为了加速，通常会缓存用户间的重叠度 `overlap(u1, u2)`。

## 完整代码

```python
import os
import logging
import numpy as np
import pandas as pd
from collections import defaultdict
from tqdm import tqdm
from operator import itemgetter

logger = logging.getLogger(__name__)


class Swing:
    """
    基于Swing评分的协同过滤推荐系统。
    
    该类实现了一个完整的 Swing 召回算法流程：
        1. 训练阶段：构建倒排索引 → 计算用户权重 → 计算物品相似度
        2. 推荐阶段：基于用户历史物品，聚合相似物品并排序返回
    
    优化特性：
        - 仅使用正向交互（label=1）构建模型
        - 稀疏存储相似度矩阵（只存储相似度 > 阈值的物品对）
        - 只枚举有共同用户的物品对，避免 O(|I|²) 的复杂度
        - 使用用户权重打压高活跃用户
    """

    def __init__(self, alpha=1.0, k_neighbors=20, min_similarity=0):
        """
        初始化Swing模型。
        
        参数:
        -----------
        alpha : float, 默认=1.0
            平滑参数，公式中的 α。当两个用户的共同交互物品很少时，防止分数过大。
            值越大，对"用户间重叠度"的惩罚越平缓。
            
        k_neighbors : int, 默认=20
            推荐时，对每个用户已交互物品，最多考虑多少个最相似的邻居物品。
            类似于 ItemCF 中的 K 值，值越大，候选物品来源越广，但计算量也越大。
            
        min_similarity : float, 默认=0.0
            相似度阈值。只有相似度 >= 该值的物品对才会被存入内存。
            值越大，存储越稀疏，内存占用越小，但可能丢失低相似度的长尾关联。
        """
        self.alpha = alpha
        self.k_neighbors = k_neighbors
        self.min_similarity = min_similarity
        
        # ---------- 核心数据结构 ----------
        # 稀疏存储相似度矩阵：swing_similarity[item_i][item_j] = similarity_score
        # 只存储有相似度的物品对，避免创建巨大的二维矩阵（如 10万物品 × 10万物品）
        self.swing_similarity = {}
        
        # ---------- ID映射 ----------
        # 原始ID（可能是字符串或大整数）→ 内部索引（0, 1, 2, ...）
        # 作用：用连续整数作为数组索引，提高访问效率
        self.user_map = None
        self.item_map = None
        
        # 内部索引 → 原始ID（反向映射，推荐时输出原始ID）
        self.reverse_user_map = None
        self.reverse_item_map = None
        
        # ---------- 用户权重 ----------
        # 用户权重 = 1 / sqrt(用户交互物品数)
        # 高活跃用户（交互了很多物品）权重被压低，避免他们主导相似度计算
        self.user_weights = None
        
        # ---------- 倒排索引 ----------
        # user_items: {user_idx: set(item_idx)}  每个用户交互过的物品集合
        # 用途：快速计算两个用户的共同交互物品数 |I_u ∩ I_v|
        self.user_items = {}
        
        # item_users: {item_idx: set(user_idx)}  每个物品被哪些用户交互过
        # 用途：快速找到两个物品的共同用户 U_i ∩ U_j
        self.item_users = {}

    def fit(self, user_item_interactions):
        """
        使用用户-物品交互数据训练 Swing 模型。
        
        训练流程：
            1. 过滤出正向交互（label=1）
            2. 构建用户/物品ID映射
            3. 构建倒排索引（user_items, item_users）
            4. 计算用户权重
            5. 计算 Swing 相似度矩阵（核心步骤）
        
        参数:
        -----------
        user_item_interactions : 元组列表 [(user_id, item_id, label), ...] 或 DataFrame
            训练数据，包含用户ID、物品ID和0/1标签。
            1表示点击/购买（正向交互），0表示未点击（负向交互）。
            注意：Swing 仅使用正向交互来学习物品相似度。
            
        返回:
        --------
        self : Swing实例
            拟合后的模型，可直接调用 recommend() 方法。
        """
        # ---------- 1. 数据标准化 ----------
        # 如果输入不是 DataFrame，转换为 DataFrame 统一处理
        if not isinstance(user_item_interactions, pd.DataFrame):
            user_item_interactions = pd.DataFrame(
                user_item_interactions, columns=["user_id", "item_id", "label"]
            )

        # 仅保留正向交互（点击/购买），负样本不参与相似度学习
        positive_interactions = user_item_interactions[
            user_item_interactions["label"] == 1
        ]
        
        if len(positive_interactions) == 0:
            logger.warning("没有找到正向交互数据，模型无法训练")
            return self

        # ---------- 2. 创建ID映射 ----------
        # 将原始ID（可能为非连续的字符串或大整数）映射为连续整数索引
        # 好处：可以用数组/列表高效访问，且节省内存
        unique_users = positive_interactions["user_id"].unique()
        unique_items = positive_interactions["item_id"].unique()

        self.user_map = {user: idx for idx, user in enumerate(unique_users)}
        self.item_map = {item: idx for idx, item in enumerate(unique_items)}
        self.reverse_user_map = {idx: user for user, idx in self.user_map.items()}
        self.reverse_item_map = {idx: item for item, idx in self.item_map.items()}

        # ---------- 3. 构建倒排索引 ----------
        # user_items: 用户 → 物品集合（用于计算用户共同交集）
        # item_users: 物品 → 用户集合（用于计算物品共同用户）
        self._build_inverted_index(positive_interactions)

        # ---------- 4. 计算用户权重 ----------
        # 高活跃用户权重低，避免热门物品过度影响
        self._calculate_user_weights()

        # ---------- 5. 计算 Swing 相似度矩阵（核心） ----------
        # 只计算有共同用户的物品对，复杂度 O(R * avg_user_items)
        self._calculate_swing_similarity_optimized()

        logger.info(
            f"Swing 训练完成: {len(self.user_map)} 用户, "
            f"{len(self.item_map)} 物品, "
            f"{sum(len(v) for v in self.swing_similarity.values())} 个相似物品对"
        )
        return self

    def _build_inverted_index(self, positive_interactions):
        """
        构建倒排索引以进行高效的相似度计算。
        
        倒排索引是协同过滤算法的核心数据结构：
            - user_items: 快速获取用户的所有交互物品
            - item_users: 快速获取物品的所有交互用户
            
        这两张表使得枚举共同用户、计算用户交集等操作变得非常高效。
        
        参数:
        -----------
        positive_interactions : DataFrame
            包含 user_id, item_id 的正向交互数据（已映射为原始ID）
        """
        self.user_items = defaultdict(set)
        self.item_users = defaultdict(set)

        # 逐行遍历，将交互关系插入倒排表
        for _, row in positive_interactions.iterrows():
            user_idx = self.user_map[row["user_id"]]
            item_idx = self.item_map[row["item_id"]]

            self.user_items[user_idx].add(item_idx)
            self.item_users[item_idx].add(user_idx)

    def _calculate_user_weights(self):
        """
        计算用户权重以减少高活跃用户的影响。
        
        公式：weight(u) = 1 / sqrt(|I_u|)
        
        其中 |I_u| 是用户 u 交互过的物品数量。
        
        这样设计的原因：
            - 活跃用户（交互了大量物品）可能对物品相似度产生"噪声"
            - 降低他们的权重，让低频用户的共现行为贡献更大的相似度信号
            - 这是工业界对 Swing 的常见改进，能有效提升长尾物品的召回
        """
        # 计算每个用户的交互物品数量
        user_item_counts = np.array(
            [len(self.user_items.get(u, set())) for u in range(len(self.user_map))]
        )
        
        # 避免除零（理论上不会发生，因为所有用户都有正向交互）
        # 使用 1/sqrt(count)，count=0 时保持为0（但实际不会）
        with np.errstate(divide='ignore', invalid='ignore'):
            self.user_weights = 1.0 / np.sqrt(user_item_counts)
            self.user_weights[user_item_counts == 0] = 0.0

    def _calculate_swing_similarity_optimized(self):
        """
        使用优化方法计算 Swing 相似度。
        
        优化策略：
            1. 只计算有共同用户的物品对（通过枚举每个用户的交互物品对来实现）
            2. 只存储相似度 >= min_similarity 的物品对（节省内存）
            3. 对每个物品对，只计算一次，然后对称存储
            
        时间复杂度：O(R * avg_user_items²)，其中 R 是总交互数。
        对于稀疏数据（每个用户平均交互几百个物品），这个复杂度是可接受的。
        
        如果数据极稀疏，可进一步加速：对 item_users 中长度 > 阈值的物品做截断。
        """
        self.swing_similarity = defaultdict(dict)

        # ---------- 第一步：枚举所有"可能"有相似度的物品对 ----------
        # 对于每个用户，将他的交互物品两两组合，这些组合就是潜在相似的物品对
        # 注意：使用 set 去重，避免同一对物品被多次创建
        logger.info("正在枚举潜在的物品对...")
        for user_idx in tqdm(
            range(len(self.user_map)),
            desc="查找每个用户的物品对",
            disable=not logger.isEnabledFor(logging.DEBUG),
        ):
            user_items = list(self.user_items.get(user_idx, set()))
            
            # 如果用户交互物品少于2个，无法形成物品对，跳过
            if len(user_items) < 2:
                continue

            # 枚举所有两两组合
            for i in range(len(user_items)):
                for j in range(i + 1, len(user_items)):
                    item_i, item_j = user_items[i], user_items[j]
                    
                    # 初始化相似度槽位（值稍后计算）
                    if item_j not in self.swing_similarity[item_i]:
                        self.swing_similarity[item_i][item_j] = 0.0
                    if item_i not in self.swing_similarity[item_j]:
                        self.swing_similarity[item_j][item_i] = 0.0

        # ---------- 第二步：计算每个物品对的实际 Swing 分数 ----------
        logger.info("正在计算 Swing 评分...")
        total_pairs = sum(len(v) for v in self.swing_similarity.values()) // 2  # 对称，除以2
        processed = 0
        
        # 遍历所有物品对（只计算一次，利用对称性）
        for item_i in tqdm(
            list(self.swing_similarity.keys()),
            desc="计算 Swing 评分",
            disable=not logger.isEnabledFor(logging.DEBUG),
        ):
            for item_j in list(self.swing_similarity[item_i].keys()):
                # 只计算 i < j 的情况，避免重复
                if item_i >= item_j:
                    continue

                # ---------- 3.1 找到物品 i 和 j 的共同用户 ----------
                # 直接从倒排索引中取交集
                common_users = self.item_users.get(item_i, set()).intersection(
                    self.item_users.get(item_j, set())
                )

                # Swing 至少需要 2 个共同用户才能形成"秋千"结构
                if len(common_users) < 2:
                    # 删除这对物品（不存储低于阈值的相似度）
                    del self.swing_similarity[item_i][item_j]
                    del self.swing_similarity[item_j][item_i]
                    continue

                # ---------- 3.2 计算 Swing 分数 ----------
                swing_score = 0.0
                common_users_list = list(common_users)

                # 枚举共同用户中的所有用户对 (u, v)
                # 注意：这里 u 和 v 是有序的，所以每个组合会被计算两次
                # 对应公式中的双重求和 Σ_{u∈U_i} Σ_{v∈U_j}
                for u_idx in range(len(common_users_list)):
                    for v_idx in range(len(common_users_list)):
                        if u_idx == v_idx:
                            continue  # 跳过同一个用户

                        u, v = common_users_list[u_idx], common_users_list[v_idx]

                        # 计算用户 u 和 v 的共同交互物品数 |I_u ∩ I_v|
                        common_items_uv = self.user_items.get(u, set()).intersection(
                            self.user_items.get(v, set())
                        )

                        # 计算该用户对的贡献
                        # 贡献 = (weight_u * weight_v) / (α + |I_u ∩ I_v|)
                        # 如果两个用户共同交互物品很多（重叠度高），则说明他们可能来自小圈子
                        # 贡献被降低，从而抑制小圈子噪声
                        user_weight_u = self.user_weights[u] if u < len(self.user_weights) else 0.0
                        user_weight_v = self.user_weights[v] if v < len(self.user_weights) else 0.0

                        contribution = (user_weight_u * user_weight_v) / (
                            self.alpha + len(common_items_uv)
                        )
                        swing_score += contribution

                # ---------- 3.3 过滤低质量相似度 ----------
                if swing_score >= self.min_similarity:
                    # 存储相似度（对称存储）
                    self.swing_similarity[item_i][item_j] = swing_score
                    self.swing_similarity[item_j][item_i] = swing_score
                else:
                    # 删除低相似度，节省内存
                    del self.swing_similarity[item_i][item_j]
                    del self.swing_similarity[item_j][item_i]

                processed += 1

        # 将 defaultdict 转换为普通 dict，提升后续访问速度
        self.swing_similarity = dict(self.swing_similarity)
        for k, v in self.swing_similarity.items():
            self.swing_similarity[k] = dict(v)

    def recommend(self, user_id, n_recommendations=10, exclude_interacted=True):
        """
        为用户生成推荐列表。
        
        推荐流程：
            1. 获取用户已交互的物品列表
            2. 对每个已交互物品，找到最相似的 k_neighbors 个物品
            3. 将这些相似物品的相似度累加作为候选分数
            4. 按分数排序，返回 Top-N
        
        这种方法本质上是 ItemCF 的变体：用用户历史物品的相似物品来构建推荐。
        
        参数:
        -----------
        user_id : 原始用户ID（未经映射的ID）
        n_recommendations : int, 默认=10
            推荐数量
        exclude_interacted : bool, 默认=True
            是否排除用户已交互的物品（通常设为 True，避免重复推荐）
            
        返回:
        --------
        元组列表: [(item_id, score), ...]
            每个元组包含推荐物品的原始ID和对应的推荐分数。
            分数越高，表示该物品越值得推荐。
            如果用户没有交互记录或模型未训练，返回空列表。
        """
        # ---------- 1. 检查用户是否存在 ----------
        if user_id not in self.user_map:
            logger.debug(f"用户 {user_id} 不在训练数据中，无法推荐")
            return []

        user_idx = self.user_map[user_id]

        # ---------- 2. 获取用户已交互物品 ----------
        user_interacted_items = self.user_items.get(user_idx, set())
        if not user_interacted_items:
            logger.debug(f"用户 {user_id} 没有交互记录")
            return []

        # 构建已交互物品集合（用于排除）
        interacted_items = set(user_interacted_items) if exclude_interacted else set()

        # ---------- 3. 基于物品的推荐 ----------
        rank = defaultdict(float)

        # 对每个已交互物品 j
        for j in user_interacted_items:
            # 获取与 j 最相似的 k_neighbors 个物品（按相似度降序排列）
            similar_items = sorted(
                self.swing_similarity.get(j, {}).items(),
                key=itemgetter(1),
                reverse=True
            )[:self.k_neighbors]

            # 对于每个相似物品 i 及其相似度 wji
            for i, wji in similar_items:
                # 跳过用户已交互的物品
                if i in interacted_items:
                    continue

                # 累加相似度作为推荐分数
                # 因为所有已交互物品的"偏好权重"都是 1（二元反馈），
                # 所以直接用相似度累加即可
                rank[i] += wji

        # ---------- 4. 排序并返回结果 ----------
        # 转换为 (score, item_idx) 列表，方便排序
        recommendations = [
            (score, item_idx) for item_idx, score in rank.items()
        ]
        # 按分数降序排列
        recommendations.sort(reverse=True)

        # 截取前 N 个，并映射回原始 ID
        results = []
        for score, item_idx in recommendations[:n_recommendations]:
            # 原始ID可能不在 reverse_item_map 中（如果物品是训练后新增的）
            if item_idx in self.reverse_item_map:
                results.append((self.reverse_item_map[item_idx], score))

        logger.debug(f"为用户 {user_id} 推荐了 {len(results)} 个物品")
        return results


def build_swing_model(feature_columns, model_config):
    """
    使用标准化接口构建 Swing 模型（工厂函数）。
    
    该函数遵循 funrec 框架的模型构建约定，使得 Swing 可以作为
    funrec.models 下的一个标准模型使用。
    
    参数:
        feature_columns: Swing 不使用特征列（保留参数以符合接口规范）
        model_config: 模型配置字典，包含：
            - alpha: 平滑参数（默认：1.0）
            - k_neighbors: 邻居数量（默认：20）
            - min_similarity: 最小相似度阈值（默认：0.0）
            
    返回:
        Swing 模型实例
    """
    alpha = model_config.get("alpha", 1.0)
    k_neighbors = model_config.get("k_neighbors", 20)
    min_similarity = model_config.get("min_similarity", 0.0)

    return Swing(alpha=alpha, k_neighbors=k_neighbors, min_similarity=min_similarity)
```
项目中用的是近似版swing：

| 对比维度 | **完整 Swing 类** | **离线训练脚本（近似版）** |
| :--- | :--- | :--- |
| **惩罚对象** | **用户对的重叠度**：如果两个用户共同喜欢的物品很多，说明他们来自同一小圈子，权重被压低。 | **单个用户的活跃度**：如果某个用户喜欢的物品很多，说明他是泛兴趣用户，权重被压低。 |
| **公式灵魂** | `weight(u)*weight(v) / (alpha + overlap(u, v))` | `weight(u)^2 / (alpha + len(items_u))` |
| **物理含义** | 打压“兴趣高度重合的用户对”带来的共现噪声。 | 打压“什么都能看的高活跃用户”带来的共现噪声。 |
| **精确度** | **高**（严格遵循论文定义） | **略低**（工程近似，但工业界证明足够有效） |


#### （1）外层循环的对象不同
- **完整 Swing 类**：先锁定物品对 `(i, j)`，再去找它们的共同用户。  
  代码：`common_users = self.item_users[item_i].intersection(self.item_users[item_j])`
- **离线脚本**：先锁定单个用户 `u`，再枚举该用户内部的所有物品对。  
  代码：`for items in user_items.values():` 然后两层 `for` 循环枚举 `items_list[i]` 和 `items_list[j]`。

#### （2）内层循环的计算维度不同
- **完整 Swing 类**：对共同用户集合 `common_users` 做双重 `for u, v` 循环，计算 `|I_u ∩ I_v|`（需要频繁取集合交集）。  
  复杂度：`O(物品对数量 * 共同用户数²)`
- **离线脚本**：直接拿当前用户的物品数 `n_items` 计算一个固定贡献值 `contrib`，一次性加到该用户的所有物品对中。  
  复杂度：`O(Σ 用户内部物品对数量)` = `O(Σ C(|I_u|, 2))`

#### （3）用户权重的应用时机
- **完整 Swing 类**：`user_weights[u] * user_weights[v]` 在每对用户循环时相乘。
- **离线脚本**：先算出 `w_u = 1 / sqrt(n_items)`，再平方得到 `w_u^2`，作为该用户的总贡献基数。


#### 场景：用户 A 喜欢 [101, 102, 103]

**完整 Swing 类的处理方式**：
```python
# 1. 先看物品对 (101,102)，找共同用户
common_users = {A, B, C}  # 假设有3个
# 2. 双重循环用户对 (A,B), (A,C), (B,C)
for u in common_users:
    for v in common_users:
        overlap = len(user_items[u] & user_items[v])
        score += weight[u] * weight[v] / (alpha + overlap)
```
**离线脚本的处理方式**：
```python
# 1. 只看用户 A 自己
items = [101, 102, 103]
n = 3
w = 1 / sqrt(3)
contrib = (w * w) / (alpha + 3)  # 一次性算出贡献值
# 2. 把这个贡献值加到用户 A 内部所有物品对
for i in [101,102,103]:
    for j in [101,102,103]:
        swing_scores[i][j] += contrib
```

| 维度 | 完整 Swing 类 | 离线训练脚本 |
| :--- | :--- | :--- |
| **适用数据规模** | 中小数据集（< 10万用户，< 50万交互） | **大规模数据集**（百万级用户，千万级交互） |
| **计算速度** | 慢（涉及大量集合交运算） | **快 10~100 倍**（只做加法，不做交集运算） |
| **模型精度** | 基准（Ground Truth） | 略有损失，但推荐效果通常只下降不到 5% |
| **代码复杂度** | 较高（需要维护倒排索引） | 较低（只需用户物品表） |
| **最终产物** | 相似度矩阵 | **Top-K 邻居表**（在线服务直接加载） |

