'use strict';

/**
 * 在 Markdown 渲染前把 $...$ / $$...$$ 转成 SVG，
 * 避免 hexo-renderer-marked 把公式里的 _ 解析成斜体。
 */

const mjConfig = Object.assign({
  tags: 'none',
  single_dollars: true,
  cjk_width: 0.9,
  normal_width: 0.6,
  every_page: true,
  extension_options: {}
}, hexo.config.mathjax || {});

const mathjax = require('../node_modules/hexo-filter-mathjax/lib/filter')(mjConfig);
const mathCss = require('../node_modules/hexo-filter-mathjax/lib/css');

function extractCode(markdown) {
  const blocks = [];
  let text = markdown.replace(/```[\s\S]*?```/g, (m) => {
    const key = `@@CODE${blocks.length}@@`;
    blocks.push(m);
    return key;
  });
  text = text.replace(/`[^`\n]+`/g, (m) => {
    const key = `@@CODE${blocks.length}@@`;
    blocks.push(m);
    return key;
  });
  return { text, blocks };
}

function restoreCode(text, blocks) {
  return text.replace(/@@CODE(\d+)@@/g, (_, i) => blocks[Number(i)]);
}

hexo.extend.filter.register('before_post_render', async (data) => {
  // 对所有含 $ 公式的文章开启预处理
  if (!data.content || !data.content.includes('$')) return data;

  const { text: withoutCode, blocks } = extractCode(data.content);
  const parts = [];
  let cursor = 0;
  const re = /\$\$([\s\S]+?)\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
  let match;
  let out = '';

  while ((match = re.exec(withoutCode)) !== null) {
    out += withoutCode.slice(cursor, match.index);
    const body = (match[1] !== undefined ? match[1] : match[2]).trim();
    const isBlock = match[1] !== undefined;
    const key = `@@MATH${parts.length}@@`;
    parts.push({ isBlock, body });
    out += key;
    cursor = match.index + match[0].length;
  }
  out += withoutCode.slice(cursor);

  if (!parts.length) return data;

  const rendered = [];
  for (const part of parts) {
    const tex = part.isBlock ? `$$${part.body}$$` : `$${part.body}$`;
    try {
      rendered.push(await mathjax(tex));
    } catch (err) {
      hexo.log.warn(`[math-protect] ${err.message}`);
      rendered.push(tex);
    }
  }

  rendered.forEach((html, i) => {
    out = out.split(`@@MATH${i}@@`).join(html);
  });

  data.content = restoreCode(out, blocks);
  return data;
}, 1);

hexo.extend.filter.register('after_render:html', (html) => {
  if (!html.includes('mjx-container')) return html;
  if (html.includes('mjx-container[jax="SVG"]')) return html;
  return html.replace(/<\/head>/i, `<style>${mathCss}</style></head>`);
});
