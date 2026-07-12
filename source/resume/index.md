---
title: 简历
date: 2026-07-09 00:00:00
type: resume
comments: false
top_img: /img/resume-banner.jpg
---



# 李思怡

中科大研究生在读 · 2 本 9 硕 · 寻找搜广推算法实习

📧 [15115977083@163.com](mailto:15115977083@163.com) [GitHub](https://github.com/lsytwodog05)

## 教育背景

**西南交通大学 · 软件工程** 2022.09 - 至今

本科 · 在校排名 1/86

**中国科学技术大学 · 电子信息** 2026.09 入学

硕士

## 论文发表

- **[[ICITCS 2025](https://dl.acm.org/doi/10.1145/3788731.3788758)]** W. Sun, S. Li, Q. Zou, Z. Liao and J. Zhang, "Eval-PPO: Building an Efficient Threat Evaluator Using Proximal Policy Optimization," in *2025 8th IEEE International Conference on Information Technology and Computer Science (ICITCS), 2025.*



## 项目经历

**电影推荐系统** 个人项目

基于 MovieLens 数据集搭建的电影推荐系统，采用召回-精排-重排架构，集成 YoutubeDNN、Swing、Item2Vec 多路召回与 DeepFM 精排，并通过 Faiss 向量检索与 Docker 完成在线 serving 部署。

- 搭建召回-精排-重排推荐链路：多路召回（YoutubeDNN 双塔、Swing I2I、Item2Vec、用户偏好）经 Snake Merge 融合，DeepFM 精排，多样性重排，冷启动单独分流
- 离线侧完成特征工程、YoutubeDNN/DeepFM/Swing/Item2Vec 训练、Faiss 向量索引构建与模型部署；在线侧 FastAPI 提供推荐 API，Redis 存用户画像与行为序列，Elasticsearch 支持类目与热门召回
- YoutubeDNN 物品向量检索使用 Faiss IndexFlatIP；Swing 采用离线 Top-K 邻居表、Item2Vec 采用历史物品向量均值 + Faiss 检索
- 使用 Docker Compose 部署 PostgreSQL、Redis、Elasticsearch、后端与前端，支持本地一键启动与联调

**游戏智能中的强化学习** 2024.07 - 2025.07

西南交通大学 · 云计算与智能技术重点实验室 · 导师：张继

**[提交至 ICITCS 2025 的第二作者](http://arxiv.org/abs/2503.12098)**

作为团队核心成员参与国家重点实验室项目；本研究旨在解决游戏领域中威胁评估难以建模以及使用监督学习训练解决方案的困难。

- 将威胁评估问题转化为强化学习决策问题，为强化学习在该领域的应用提供了新的思路和方法
- 合作提出 **[Eval-PPO](https://github.com/sunwuzhou03/eval-ppo/tree/main)**，一种基于 PPO 强化学习的自适应评估打分模型
- 引入时序注意力建模连续行为序列，设计加权采样策略平衡难易样本，解决样本不均衡、梯度消失问题；相比传统规则基线，模型评估准确率提升 17.84%，完整实现端到端训练与推理流程

**合木智构（AI-structure）建筑结构智能设计平台** 2025.08 - 2025.10

西南交通大学 · 导师：廖文杰

基于图像生成 AI 大模型的设计平台，实现在线设计渲染建筑设计图，赋能土木工程数字化与智能化，采用 Vue2 + ElementUI + Ajax 进行前端开发。

- 运用 AI 辅助编程，完成充值界面以及钱包界面模块前端开发
- 完成管理员界面前端开发



## 技术技能

- **技术栈**：熟悉 Python 与 PyTorch 进行数据处理与推荐算法开发，掌握召回-精排-重排推荐链路设计与实现，熟悉 YoutubeDNN、DeepFM、Swing、Item2Vec 等召回与排序模型及协同过滤、向量检索等常见方法。熟悉 Faiss 向量检索、Redis 特征存储、MySQL/PostgreSQL 与 Elasticsearch 等中间件，了解 FastAPI 在线 serving 与 Docker 部署流程。能够使用 Cursor 等 AI 编程工具辅助开发。
- **语言**：英语四级 550 分，六级 529 分
- **其他**：SQL、FastAPI、SSM、Java、C/C++、Vue

## 所获荣誉及奖项

- **国家奖学金**：大二从经济管理学院转入计算机与人工智能学院后排名第一，2024 年 12 月
- **省二等奖**：第十五届全国大学生数学竞赛，2023 年 12 月
- **省三等奖**：第十五届 [蓝桥杯编程竞赛](https://dasai.lanqiao.cn/)（Java 组 A），2024 年 4 月



## 更多链接

- 博客文章：见本站 [归档](/archives/)
- 学习笔记：见 [学习笔记分类](/categories/学习笔记/)

