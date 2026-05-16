// ==UserScript==
// @name         易鑫云测试版
// @namespace    http://tampermonkey.net/
// @version      14.0
// @description  易鑫云助手测试版 - 从远程加载核心脚本
// @match        https://yun.yxqiche.com/*
// @match        https://ares.yxqiche.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// @connect      raw.githubusercontent.com
// @connect      xiaowen326.github.io
// @connect      cx.shouji.360.cn
// ==/UserScript==

(function() {
    'use strict';

    // 暴露GM API到window，供核心脚本使用
    window.__GM_setValue = GM_setValue;
    window.__GM_getValue = GM_getValue;
    window.__GM_xmlhttpRequest = GM_xmlhttpRequest;

    // 测试版远程地址
    var REMOTE_URL = 'https://xiaowen326.github.io/assistant-yixir/ceshi.js';

    console.log('[易鑫云测试版-加载器] 初始化...');

    GM_xmlhttpRequest({
        method: 'GET',
        url: REMOTE_URL + '?t=' + Date.now(),
        headers: { 'Cache-Control': 'no-cache' },
        onload: function(resp) {
            if (resp.status === 200) {
                console.log('[易鑫云测试版-加载器] 核心脚本加载成功');
                var script = document.createElement('script');
                script.textContent = resp.responseText;
                (document.head || document.documentElement).appendChild(script);
            } else {
                console.error('[易鑫云测试版-加载器] 加载失败: HTTP ' + resp.status);
            }
        },
        onerror: function(err) {
            console.error('[易鑫云测试版-加载器] 网络错误', err);
        }
    });
})();
