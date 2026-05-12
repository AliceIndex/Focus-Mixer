/**
 * Focus Mixer - List Controller
 * blog/index.html および news/index.html で list.json を取得し、
 * 記事一覧を動的にレンダリングする。
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

(function () {
    const LANG = document.documentElement.lang === 'ja' ? 'ja' : 'en';
    const messages = {
        ja: {
            empty: '記事がありません。',
            error: '記事の読み込みに失敗しました。',
        },
        en: {
            empty: 'No articles yet.',
            error: 'Failed to load articles.',
        }
    };
    const msg = messages[LANG] || messages.ja;

    function escapeHtml(value) {
        if (value === undefined || value === null) return '';
        const div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML;
    }

    function formatDate(article) {
        if (article.date) return article.date;
        if (!article.pubDate) return '';
        const d = new Date(article.pubDate);
        if (isNaN(d.getTime())) return article.pubDate;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function renderBlogCard(article) {
        const tags = Array.isArray(article.tags) ? article.tags : [];
        const tagHtml = tags.length > 0
            ? `<span class="blog-card-tag">${escapeHtml(tags[0])}</span>`
            : '';
        const excerpt = article.excerpt
            ? `<div class="blog-card-desc">${escapeHtml(article.excerpt)}</div>`
            : '';
        return `
            <a href="${escapeHtml(article.url)}" class="blog-card-link">
                <div class="blog-card">
                    ${tagHtml}
                    <div class="blog-card-title">${escapeHtml(article.title)}</div>
                    ${excerpt}
                    <div class="blog-card-date">${escapeHtml(formatDate(article))}</div>
                </div>
            </a>
        `;
    }

    function renderNewsEntry(article) {
        const tags = Array.isArray(article.tags) ? article.tags : [];
        const tagHtml = tags.map(
            (tag) => `<span class="news-tag">${escapeHtml(tag)}</span>`
        ).join('');
        const excerpt = article.excerpt
            ? `<p>${escapeHtml(article.excerpt)}</p>`
            : '';
        return `
            <a href="${escapeHtml(article.url)}" class="news-entry">
                <div class="news-date">${escapeHtml(formatDate(article))}</div>
                <div class="news-body">
                    ${tagHtml}
                    <h3>${escapeHtml(article.title)}</h3>
                    ${excerpt}
                </div>
            </a>
        `;
    }

    function renderArticles(container, articles, type) {
        if (!articles || articles.length === 0) {
            container.innerHTML = `<p class="list-empty">${escapeHtml(msg.empty)}</p>`;
            return;
        }
        const renderer = type === 'news' ? renderNewsEntry : renderBlogCard;
        container.innerHTML = articles.map(renderer).join('');
    }

    async function init() {
        const container = document.getElementById('list-container');
        if (!container) return;

        const type = container.dataset.listType || 'blog';

        try {
            const response = await fetch('./list.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const articles = await response.json();
            renderArticles(container, articles, type);
        } catch (err) {
            console.error('Failed to load list.json:', err);
            container.innerHTML = `<p class="list-error">${escapeHtml(msg.error)}</p>`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
