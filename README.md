# lsytwodog05.github.io

基于 [Hexo](https://hexo.io/) + [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 的个人网站，参考 [xfliu1998.github.io](https://github.com/xfliu1998/xfliu1998.github.io) 风格搭建。

站点地址：https://lsytwodog05.github.io

## 站点结构

| 模块 | 说明 |
|------|------|
| 简历 | 右上角导航「简历」，编辑 `source/resume/index.md` |
| 博客 | 分类为 `博客` 的文章 |
| 学习笔记 | 分类为 `学习笔记` 的文章 |

## 本地开发

```bash
npm install
hexo server
```

浏览器打开 http://localhost:4000

## 写文章

```bash
# 博客
hexo new "文章标题"
# 编辑 source/_posts/xxx.md，设置 categories: [博客]

# 学习笔记
hexo new "笔记标题"
# 编辑 source/_posts/xxx.md，设置 categories: [学习笔记]
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布。

首次部署前，请在 GitHub 仓库 **Settings → Pages** 中，将 Source 设为 **GitHub Actions**。

## 自定义

- 站点配置：`_config.yml`
- 主题配置：`_config.butterfly.yml`（导航栏、侧边栏、搜索等）
- 简历样式：`source/css/resume.css`
- 头像与图片：`source/img/`
