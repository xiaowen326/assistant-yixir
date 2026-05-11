// == GM API 桥接（加载器模式） ==
// 从油猴沙箱获取GM API，通过window.__GM_XXX暴露给加载器注入的脚本
var GM_setValue = window.__GM_setValue || function(k, v) { try { localStorage.setItem('__ysx_' + k, JSON.stringify(v)); } catch(e) {} };
var GM_getValue = window.__GM_getValue || function(k, def) { try { var v = localStorage.getItem('__ysx_' + k); return v !== null ? JSON.parse(v) : def; } catch(e) { return def; } };
var GM_xmlhttpRequest = window.__GM_xmlhttpRequest || function(opts) {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'GET', opts.url, true);
    if (opts.headers) Object.keys(opts.headers).forEach(function(k) { xhr.setRequestHeader(k, opts.headers[k]); });
    xhr.onload = function() { opts.onload && opts.onload({ status: xhr.status, responseText: xhr.responseText }); };
    xhr.onerror = function() { opts.onerror && opts.onerror(xhr); };
    xhr.send();
};
// == 桥接结束 ==

// == 全局配置 ==
const BASE_URL = "https://ares.yxqiche.com";
let TOKEN = "";
let IS_TOKEN_VALID = false;

// == 水印控制 ==
let WATERMARK_HIDDEN = GM_getValue('watermark_hidden', true); // 默认隐藏水印

function toggleWatermark() {
    WATERMARK_HIDDEN = !WATERMARK_HIDDEN;
    GM_setValue('watermark_hidden', WATERMARK_HIDDEN);
    
    if (WATERMARK_HIDDEN) {
        enableWatermarkHide();
        createNotification('水印已隐藏', true, 2000);
    } else {
        disableWatermarkHide();
        createNotification('水印已显示', true, 2000);
    }
    
    // 更新按钮文字
    const btn = document.getElementById('watermark-toggle-btn');
    if (btn) {
        btn.textContent = WATERMARK_HIDDEN ? '显示水印' : '隐藏水印';
    }
}

function enableWatermarkHide() {
    // 应用CSS隐藏
    let style = document.getElementById('watermark-hide-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'watermark-hide-style';
        document.head.appendChild(style);
    }
    style.textContent = [
        '[style*="pointer-events: none"][style*="position: fixed"],',
        '[style*="pointer-events:none"][style*="position:fixed"],',
        '[style*="position: fixed"][style*="pointer-events: none"],',
        '[style*="position:fixed"][style*="pointer-events:none"] {',
        '    opacity: 0 !important;',
        '    visibility: hidden !important;',
        '}',
        '[class*="watermark"], [class*="water-mark"], [class*="mask-layer"],',
        '[id*="watermark"], [id*="water-mark"], [id*="mask-layer"] {',
        '    opacity: 0 !important;',
        '    visibility: hidden !important;',
        '}'
    ].join('\n');
    
    // 隐藏当前页面上的水印元素
    document.querySelectorAll('*').forEach(function(el) {
        var s = getComputedStyle(el);
        if (s.position === 'fixed' && s.pointerEvents === 'none' && el.innerText && el.innerText.length > 5) {
            el.style.opacity = '0';
        }
    });
}

function disableWatermarkHide() {
    // 移除隐藏样式
    let style = document.getElementById('watermark-hide-style');
    if (style) {
        style.remove();
    }
    // 恢复水印显示
    document.querySelectorAll('*').forEach(function(el) {
        var s = getComputedStyle(el);
        if (s.position === 'fixed' && s.pointerEvents === 'none' && el.innerText && el.innerText.length > 5) {
            el.style.opacity = '';
        }
    });
}

// == 工具函数 ==
function getTokenFromCookies() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') {
            return value;
        }
    }
    return null;
}

function validateToken() {
    if (!TOKEN) {
        TOKEN = getTokenFromCookies() || GM_getValue('yixin_token', '') || TOKEN;
    }
    IS_TOKEN_VALID = !!TOKEN;
    return IS_TOKEN_VALID;
}

function createNotification(message, isSuccess = true, duration = 3000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    // 根据成功/失败状态选择不同的发光颜色
    const glowColor = isSuccess ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 59, 48, 0.6)';
    const bgColor = isSuccess 
        ? 'linear-gradient(135deg, rgba(0, 201, 87, 0.85) 0%, rgba(0, 255, 136, 0.75) 100%)'
        : 'linear-gradient(135deg, rgba(255, 59, 48, 0.85) 0%, rgba(255, 82, 82, 0.75) 100%)';
    
    notification.style = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        padding: 14px 28px;
        background: ${bgColor};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: white;
        border-radius: 12px;
        border: 1px solid ${glowColor};
        box-shadow: 
            0 0 20px ${glowColor},
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                    top 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.3s ease;
        max-width: 80vw;
        text-align: center;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        letter-spacing: 0.5px;
        animation: notificationPulse 2s ease-in-out infinite;
    `;
    
    // 添加动画样式
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        @keyframes notificationPulse {
            0%, 100% { box-shadow: 0 0 20px ${glowColor}, 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
            50% { box-shadow: 0 0 30px ${glowColor}, 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
        }
    `;
    document.head.appendChild(styleEl);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.top = '35px';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 50);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.top = '20px';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
            notification.remove();
            styleEl.remove();
        }, 400);
    }, duration);
}

// == 错误处理函数 ==
function handleError(error, context) {
    console.error(`${context} 错误:`, error);
    const errorMessage = error.message || '未知错误';
    createNotification(`${context}失败: ${errorMessage}`, false, 4000);
}

function showPrompt(title, message) {
    return prompt(`${title}\n\n${message}`);
}



// == 批量实时扣款 ==
async function batchRealTimeCharge() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量实时扣款', '请输入申请编号（多个用逗号或空格分隔）:');
    if (!input) return;

    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请编号!', false);
        return;
    }

    // 使用公共进度条组件
    const { loadingElement, counterElement, progressBar } = createProgressBar(`正在实时扣款 (${applyNos.length}个申请号)`, applyNos.length);

    // 创建标题栏（含最小化按钮）
    const header = loadingElement.querySelector('div');
    const minimizeBtn = header.querySelector('button');
    if (minimizeBtn) {
        minimizeBtn.onclick = () => {
            loadingElement.style.display = 'none';
            const taskContainer = document.getElementById('background-task');
            if (taskContainer) {
                document.getElementById('task-title').textContent = '任务: 批量实时扣款';
                document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${applyNos.length}`;
                document.getElementById('task-progress-bar').style.width = `${(completed / applyNos.length) * 100}%`;
                taskContainer.style.display = 'block';
            }
        };
    }

    document.body.appendChild(loadingElement);

    const results = new Array(applyNos.length);
    let completed = 0;

    try {
        // 逐个处理（扣款需要顺序执行，避免并发问题）
        for (let index = 0; index < applyNos.length; index++) {
            const applyNo = applyNos[index].trim();
            try {
                // 第一步：查询未还明细
                const detailResp = await fetch('https://ares.yxqiche.com/ares-web/recall/baseinfo/showNotRepayDetail', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'content-type': 'application/json;charset=UTF-8',
                    },
                    body: JSON.stringify({ applyNo: applyNo }),
                    credentials: 'include'
                });
                const detailData = await detailResp.json();

                if (!detailData.success || !detailData.data || !detailData.data.plans || detailData.data.plans.length === 0) {
                    results[index] = {
                        申请编号: applyNo,
                        扣款状态: '查询失败',
                        失败原因: detailData.message || '无逾期计划',
                        扣款金额: '-',
                        期数: '-'
                    };
                    continue;
                }

                // 从plans拼装参数
                const plans = detailData.data.plans;
                let totalAmount = 0;
                let actualPenaltyAmt = 0;
                const planList = [];

                for (const p of plans) {
                    const amt = parseFloat(p.remainingOutstandingAmount) || 0;
                    totalAmount += amt;
                    actualPenaltyAmt += parseFloat(p.totalOverduePenalty) || 0;
                    planList.push({
                        actualRepayTotalMoney: amt,
                        currentRepayPeriod: p.currentRepayPeriod
                    });
                }

                totalAmount = Math.round(totalAmount * 100) / 100;
                actualPenaltyAmt = Math.round(actualPenaltyAmt * 100) / 100;

                // 第二步：发起实时扣款
                const chargeResp = await fetch('https://ares.yxqiche.com/ares-web/recall/baseinfo/realTimeCharge', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'content-type': 'application/json;charset=UTF-8',
                    },
                    body: JSON.stringify({
                        applyNo: applyNo,
                        totalAmount: String(totalAmount),
                        actualPenaltyAmt: actualPenaltyAmt,
                        planList: planList
                    }),
                    credentials: 'include'
                });
                const chargeData = await chargeResp.json();

                if (chargeData.success) {
                    results[index] = {
                        申请编号: applyNo,
                        扣款状态: '扣款成功',
                        失败原因: '-',
                        扣款金额: totalAmount + '元',
                        期数: plans.length + '期'
                    };
                } else {
                    results[index] = {
                        申请编号: applyNo,
                        扣款状态: '扣款失败',
                        失败原因: chargeData.message || '未知原因',
                        扣款金额: totalAmount + '元',
                        期数: plans.length + '期'
                    };
                }
            } catch (error) {
                results[index] = {
                    申请编号: applyNo,
                    扣款状态: '请求异常',
                    失败原因: error.message,
                    扣款金额: '-',
                    期数: '-'
                };
            } finally {
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }

            // 间隔500ms，避免请求过快
            if (index < applyNos.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 确保进度条100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = '100%';

        const successCount = results.filter(r => r.扣款状态 === '扣款成功').length;
        const failCount = results.filter(r => r.扣款状态 !== '扣款成功').length;
        createNotification(`扣款完成! 成功: ${successCount}, 失败: ${failCount}`);
    } finally {
        // 任务完成后隐藏悬浮窗进度
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        // 展示结果
        displayResults(results, '批量实时扣款结果');
    }
}


// == 公共函数 ==
function createProgressBar(title, totalTasks) {
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        padding: 24px;
        border: 1px solid rgba(0, 255, 136, 0.3);
        z-index: 9999;
        min-width: 340px;
        border-radius: 16px;
        box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: progressGlow 3s ease-in-out infinite;
    `;
    
    // 添加动画样式
    const progressStyle = document.createElement('style');
    progressStyle.textContent = `
        @keyframes progressGlow {
            0%, 100% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
            50% { box-shadow: 0 0 50px rgba(0, 255, 136, 0.25), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    `;
    document.head.appendChild(progressStyle);

    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        margin-bottom: 16px;
    `;

    const titleElement = document.createElement('div');
    titleElement.textContent = title;
    titleElement.style.fontWeight = 'bold';
    titleElement.style.color = '#e0e0e0';
    titleElement.style.fontSize = '14px';
    titleElement.style.letterSpacing = '0.5px';
    titleElement.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
        color: #e0e0e0;
    `;
    minimizeBtn.addEventListener('mouseover', () => {
        minimizeBtn.style.background = 'rgba(0, 255, 136, 0.2)';
        minimizeBtn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
        minimizeBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
    });
    minimizeBtn.addEventListener('mouseout', () => {
        minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        minimizeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        minimizeBtn.style.boxShadow = 'none';
    });
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: ${title}`;
            document.getElementById('task-progress-text').textContent = `已完成: 0/${totalTasks}`;
            document.getElementById('task-progress-bar').style.width = `0%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(titleElement);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    const counterElement = document.createElement('div');
    counterElement.id = 'query-counter';
    counterElement.textContent = `已完成: 0/${totalTasks}`;
    counterElement.style.marginBottom = '12px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    counterElement.style.color = '#00ff88';
    counterElement.style.fontWeight = '600';
    counterElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
    loadingElement.appendChild(counterElement);

    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 136, 0.2);
        position: relative;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'query-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00c853, #00ff88, #69f0ae, #00c853);
        background-size: 200% 100%;
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        animation: shimmer 2s linear infinite;
        position: relative;
    `;
    
    // 添加进度条光效
    const progressGlow = document.createElement('div');
    progressGlow.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        border-radius: 6px;
    `;
    progressBar.appendChild(progressGlow);

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);

    return { loadingElement, counterElement, progressBar };
}

function updateProgress(counterElement, progressBar, completed, totalTasks) {
    counterElement.textContent = `已完成: ${completed}/${totalTasks}`;
    progressBar.style.width = `${(completed / totalTasks) * 100}%`;
    
    const taskContainer = document.getElementById('background-task');
    if (taskContainer && taskContainer.style.display !== 'none') {
        document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${totalTasks}`;
        document.getElementById('task-progress-bar').style.width = `${(completed / totalTasks) * 100}%`;
    }
}

// == 结果显示函数 ==
function displayResults(results, title) {
    const oldResult = document.getElementById('result-container');
    if (oldResult) oldResult.remove();
    
    const container = document.createElement('div');
    container.id = 'result-container';
    container.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #4CAF50;
        border-radius: 10px;
        padding: 20px;
        padding-right: 30px; /* 为滚动条预留空间 */
        max-width: 90vw;
        max-height: 80vh;
        overflow: auto;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        font-family: Arial, sans-serif;
        box-sizing: content-box;
    `;
    
    // === 顶部标题栏（包含复制按钮、标题、关闭按钮） ===
    const headerContainer = document.createElement('div');
    headerContainer.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 15px;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        background: linear-gradient(135deg, #f8fff8 0%, #ffffff 100%);
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
        position: sticky;
        top: 0;
        z-index: 100;
    `;
    
    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制结果';
    copyButton.style = `
        padding: 8px 20px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    copyButton.onclick = () => {
        let text = '';
        if (results.length > 0) {
            const headers = Object.keys(results[0]);
            text = headers.join('\t') + '\r\n';
            results.forEach(result => {
                const row = headers.map(header => result[header] || '');
                text += row.join('\t') + '\r\n';
            });
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style = `
            position: fixed;
            top: -100px;
            left: -100px;
            opacity: 0;
        `;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            const success = document.execCommand('copy');
            if (success) {
                createNotification('结果已复制到剪贴板');
            } else {
                createNotification('复制失败，请手动复制', false);
            }
        } catch (err) {
            createNotification('复制失败: ' + err.message, false);
        } finally {
            document.body.removeChild(textarea);
        }
    };
    headerContainer.appendChild(copyButton);
    
    // 标题
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style = 'margin: 0; color: #333; text-align: center; flex: 1;';
    headerContainer.appendChild(titleElement);
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style = `
        padding: 8px 20px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    closeButton.onclick = () => container.remove();
    headerContainer.appendChild(closeButton);
    
    container.appendChild(headerContainer);
    
    if (results.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = '未查询到结果';
        emptyMessage.style = 'text-align: center;';
        container.appendChild(emptyMessage);
    } else {
        const table = document.createElement('table');
        table.style = 'width: 100%; border-collapse: collapse; min-width: 600px;';
        
        // 创建表头
        const headerRow = document.createElement('tr');
        const headers = Object.keys(results[0]);
        
        for (const header of headers) {
            const th = document.createElement('th');
            th.textContent = header;
            th.style = 'padding: 12px; background: #f2f2f2; text-align: center;';
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);
        
        // 创建数据行
        for (const result of results) {
            const row = document.createElement('tr');
            
            for (const key in result) {
                const td = document.createElement('td');
                td.textContent = result[key];
                td.style = 'padding: 10px; text-align: center;';

                // 特殊处理locationUrl显示为可点击链接
                if (key === 'locationUrl') {
                    td.innerHTML = result[key] !== "无" ? 
                        `<a href="${result[key]}" target="_blank">查看地图</a>` : "无";
                } 
                // 特殊处理historyComplaint字段
                else if (key === 'historyComplaint') {
                    if (result[key] === true || result[key] === 'true') {
                        td.textContent = '有投诉';
                        td.style.color = 'red';
                        td.style.fontWeight = '500';
                    } else if (result[key] === false || result[key] === 'false') {
                        td.textContent = '无';
                    } else {
                        td.textContent = result[key];
                    }
                }
                // 其他字段正常显示
                else {
                    td.textContent = result[key];
                }
                
                // 修改还款状态的颜色显示
                if (key === 'status') {
                    // 其他功能的status字段
                    td.style.color = result[key] === '成功' ? 'green' : 'red';
                } else if (key === 'status1') {
                    // 还款状态的第一轮查询结果
                    if (result[key] === '已还款') {
                        td.style.color = 'green';
                    } else if (result[key] === '查询失败') {
                        td.style.color = 'red';
                    }
                } else if (key === 'status2') {
                    // 还款状态的第二轮查询结果
                    if (result[key].includes('成功')) {
                        td.style.color = 'green';
                    } else if (result[key].includes('失败')) {
                        td.style.color = 'red';
                    }
                }
                
                row.appendChild(td);
            }
            
            table.appendChild(row);
        }
        
        container.appendChild(table);
    }
    
    // 返回顶部按钮
    const backToTopButton = document.createElement('button');
    backToTopButton.textContent = '返回顶部';
    backToTopButton.style = `
        display: block;
        margin: 20px auto 0;
        padding: 8px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    backToTopButton.onclick = () => {
        container.scrollTop = 0;
    };
    container.appendChild(backToTopButton);

    document.body.appendChild(container);
}

// ===== 新增的查询短信数据功能 =====
async function batchQuerySMSData() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('查询短信数据', '请输入要查询的记录条数（例如：10）:');
    if (!input) return;
    
    const pageSize = parseInt(input);
    if (isNaN(pageSize) || pageSize <= 0) {
        createNotification('请输入有效的数字!', false);
        return;
    }
    
    // 创建带进度条的加载提示
    const { loadingElement, counterElement, progressBar } = createProgressBar(`正在查询短信数据 (${pageSize}条)`, pageSize);
    document.body.appendChild(loadingElement);
    
    let totalTasks = 0;
    const resultsArray = [];
    let completed = 0;
    
    try {
        // 获取申请号列表
        const list = await queryList(pageSize);
        totalTasks = list.length;
        
        if (totalTasks === 0) {
            createNotification('未查询到任何申请号，请检查登录状态是否正常或刷新网页重试', false);
            loadingElement.remove();
            return;
        }
        
        counterElement.textContent = `已完成: 0/${totalTasks}`;
        progressBar.style.width = `0%`;
        
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = list.map(async (item, index) => {
            try {
                const { applyNo, name, repayAmount, contributePartyName, overdueDays } = item;
                
                // 并行获取基础信息和联系人信息
                const [info, contacts] = await Promise.all([
                    getInfo(applyNo),
                    getContact(applyNo)
                ]);
                
                // 处理地址为null的情况
                const base = info?.base || {};
                const home = info?.home || {};
                
                const plaintextPhone = base.plaintextPhone || '无';
                const certificateNumber = base.certificateNumber || '无';
                
                // 地址为null时显示"无地址"
                const registerAddress = home.registerAddress || '无地址';
                const livingAddress = home.livingAddress || '无地址';
                
                const itemResults = [];
                if (contacts && contacts.length) {
                    for (const contact of contacts) {
                        itemResults.push({
                            申请号: applyNo,
                            姓名: name || '无',
                            电话: plaintextPhone,
                            还款金额: repayAmount || '无',
                            证件号: certificateNumber,
                            资方: contributePartyName || '无',
                            户籍地址: registerAddress, // 已处理null值
                            居住地址: livingAddress,   // 已处理null值
                            逾期天数: overdueDays || '无',
                            关系: contact.relation || '无',
                            联系人姓名: contact.name || '无',
                            联系人电话: contact.plaintextPhone || '无'
                        });
                    }
                } else {
                    itemResults.push({
                        申请号: applyNo,
                        姓名: name || '无',
                        电话: plaintextPhone,
                        还款金额: repayAmount || '无',
                        证件号: certificateNumber,
                        资方: contributePartyName || '无',
                        户籍地址: registerAddress, // 已处理null值
                        居住地址: livingAddress,   // 已处理null值
                        逾期天数: overdueDays || '无',
                        关系: '无',
                        联系人姓名: '无联系人',
                        联系人电话: '无'
                    });
                }
                
                resultsArray[index] = itemResults;
            } catch (error) {
                console.error(`处理申请号 ${item.applyNo} 失败:`, error);
                resultsArray[index] = [{
                    申请号: item.applyNo || '未知',
                    状态: `请求失败: ${error.message}`,
                    姓名: '无',
                    电话: '无',
                    还款金额: '无',
                    证件号: '无',
                    资方: '无',
                    户籍地址: '无地址', // 错误时保持"无地址"
                    居住地址: '无地址', // 错误时保持"无地址"
                    逾期天数: '无',
                    联系人姓名: '无',
                    联系人电话: '无'
                }];
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, totalTasks);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 按顺序展开结果
        const results = resultsArray.flat();
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${totalTasks}/${totalTasks}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 条短信数据`);
        displayResults(results, '短信数据查询结果');
        
    } catch (error) {
        console.error('全局处理错误:', error);
        createNotification('批量查询失败，请检查网络或重新登录账号', false);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
    }
}

// ===== 短信数据查询相关函数 =====
async function queryList(pageSize = 10) {
    const url = `${BASE_URL}/ares-web/recall/pageQuery`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Origin": BASE_URL,
                "Cookie": `token=${TOKEN}`
            },
            body: JSON.stringify({
                "index": 1,
                "pageSize": pageSize,
                "searchInfoAll": "",
                "applyNo": ""
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(`API错误: ${data.message || data.code}`);
        }
        
        return data.data?.items || [];
    } catch (error) {
        console.error('queryList错误:', error);
        throw new Error(`获取申请列表失败: ${error.message}`);
    }
}

async function getInfo(applyNo) {
    const url = `${BASE_URL}/ares-web/recall/baseinfo/query1`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Origin": BASE_URL,
                "Cookie": `token=${TOKEN}`
            },
            body: JSON.stringify({ applyNo })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error(`getInfo错误 (${applyNo}):`, error);
        throw new Error(`获取基础信息失败: ${error.message}`);
    }
}

async function getContact(applyNo) {
    const url = `${BASE_URL}/ares-web/recall/recallContactInfo/getContact`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Origin": BASE_URL,
                "Cookie": `token=${TOKEN}`
            },
            body: JSON.stringify({ 
                "applyNo": applyNo,
                "pageSize": 1000 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data?.items || [];
    } catch (error) {
        console.error(`getContact错误 (${applyNo}):`, error);
        throw new Error(`获取联系人信息失败: ${error.message}`);
    }
}

// == 查询销售功能 ==
async function batchQueryApplyNos() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询销售信息', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        padding: 24px;
        border: 1px solid rgba(0, 255, 136, 0.3);
        z-index: 9999;
        min-width: 340px;
        border-radius: 16px;
        box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: progressGlow 3s ease-in-out infinite;
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        margin-bottom: 16px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在查询申请号 (${applyNos.length}个)`;
    title.style.fontWeight = 'bold';
    title.style.color = '#e0e0e0';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.5px';
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
        color: #e0e0e0;
    `;
    minimizeBtn.addEventListener('mouseover', () => {
        minimizeBtn.style.background = 'rgba(0, 255, 136, 0.2)';
        minimizeBtn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
        minimizeBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
    });
    minimizeBtn.addEventListener('mouseout', () => {
        minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        minimizeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        minimizeBtn.style.boxShadow = 'none';
    });
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 查询申请号`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${applyNos.length}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / applyNos.length) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'query-counter';
    counterElement.textContent = `已完成: 0/${applyNos.length}`;
    counterElement.style.marginBottom = '12px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    counterElement.style.color = '#00ff88';
    counterElement.style.fontWeight = '600';
    counterElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 136, 0.2);
        position: relative;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'query-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00c853, #00ff88, #69f0ae, #00c853);
        background-size: 200% 100%;
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        animation: shimmer 2s linear infinite;
        position: relative;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    const url = `${BASE_URL}/ares-web/recall/orderInfo/getSalesAndShopsInfoByApplyNo`;
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Origin": BASE_URL,
                        "Cookie": `token=${TOKEN}`
                    },
                    body: JSON.stringify({ applyNo })
                });

                const data = await response.json();
                
                results[index] = {
                    applyNo,
                    status: data.code === 0 ? '成功' : `失败: ${data.message || data.code}`,
                    //channelManagerName: data.data?.channelManagerName || "无",
                    //channelManagerPhone: data.data?.channelManagerPhone || "无",
                    businessType: data.data?.businessType || "无",
                    advisorName: data.data?.advisorName || "无",
                    advisorPhone: data.data?.advisorPhone || "无",
                    directorName: data.data?.directorName || "无",
                    directorPhone: data.data?.directorPhone || "无"
                };
            } catch (error) {
                results[index] = {
                    applyNo,
                    status: '请求失败',
                    //channelManagerName: "无",
                    //channelManagerPhone: "无",
                    businessType: "无",
                    advisorName: "无",
                    advisorPhone: "无",
                    directorName: "无",
                    directorPhone: "无",
                    message: error.message
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '申请号查询结（陈伟彬，陈小龙，莫婷婷，行凯凯，邓琴，白伦全，崔峰，佟妹，不是真实销售，请手动剔除）');
    }
}

// == 系统短信功能 ==
const SMS_TEMPLATES = {
    "委外低账龄-违约2": "018f04fe48248a8085bc8ef0c5d430e3",
    "委外低账龄-违约3": "018f04fea8ea8a8085bc8ef0c5d43122",
    "委外低账龄-违约4": "018f04ff22b48a8085bc8ef0c5d4315c",
    "委外低账龄-违约5": "018f04ff830b8a8085bc8ef0c5d431a5",
    "委外低账龄-违约6": "018f04fff43e8a8085bc8ef0c5d431c6",
    "委外低账龄-违约7": "018f2371e3138a8085bc8f14e37f2709",
    "委外低账龄-违约8": "018f237204968a8085bc8f14e37f2716",
    "委外低账龄-违约9": "018f237221128a8085bc8f14e37f2724",
    "委外低账龄-违约10": "018f23723ca98a8085bc8f14e37f272f",
    "委外低账龄-违约11": "018f2372598d8a8085bc8f14e37f2749",
    "委外低账龄-违约12": "018f237275d58a8085bc8f14e37f274e",
    "委外低账龄-违约13": "019d3dfc8d7e8a80b6b79d1a3b2d0ab0",
    "委外低账龄-违约14": "019d3dfce01b8a80b6b79d1a3b2d0b24",
    "委外低账龄-违约15": "019d3dfd319c8a80b6b79d1a3b2d0b85",
    "委外低账龄-诉讼1": "018f05175d698a8085bc8ef0c5d43d5d",
    "委外低账龄-诉讼2": "018f0517b0ba8a8085bc8ef0c5d43d8d",
    "委外低账龄-诉讼3": "018f051808888a8085bc8ef0c5d43dc0",
    "委外低账龄-诉讼4": "018f0519203e8a8085bc8ef0c5d43e70",
    "委外低账龄-诉讼5": "018f05198e608a8085bc8ef0c5d43eb2",
    "委外低账龄-诉讼6": "018f2372ba718a8085bc8f14e37f2771",
    "委外低账龄-诉讼7": "018f2372d9518a8085bc8f14e37f278a",
    "委外低账龄-征信3": "018f23729c7d8a8085bc8f14e37f2758",
    "委外低账龄-转告1": "019d3df933d48a80b6b79d1a3b2d0571",
    "委外低账龄-转告2": "019d3df99c168a80b6b79d1a3b2d066c",
    "委外低账龄-转告3": "019d3dfa1aaa8a80b6b79d1a3b2d071a",
    "委外低账龄-转告4": "019d3dfa7eda8a80b6b79d1a3b2d077f",
    "委外低账龄-转告5": "019d3dfad79c8a80b6b79d1a3b2d07dc",
    "委外低账龄-转告6": "019d3dfb3d568a80b6b79d1a3b2d0841",
    "委外低账龄-转告7": "019d3dfbb1e08a80b6b79d1a3b2d08b8",
    "委外低账龄-转告8": "019d3dfc083b8a80b6b79d1a3b2d0957",
    "通知联系紧急联系人（委外）2": "019b0234ff8f8a80b6b79ae8e0c65c6b"
};


// 扩展：自定义带分页按钮的弹窗（适配你的嵌入式页面）
function showTemplatePrompt(title, message) {
    return new Promise((resolve) => {
        // 1. 创建弹窗容器（适配ares.yxqiche.com嵌入式页面样式）
        const promptContainer = document.createElement('div');
        promptContainer.style.position = 'fixed';
        promptContainer.style.top = '50%';
        promptContainer.style.left = '50%';
        promptContainer.style.transform = 'translate(-50%, -50%)';
        promptContainer.style.width = '500px';
        promptContainer.style.backgroundColor = '#fff';
        promptContainer.style.border = '1px solid #ccc';
        promptContainer.style.borderRadius = '8px';
        promptContainer.style.padding = '20px';
        promptContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        promptContainer.style.zIndex = 9999;

        // 2. 弹窗标题
        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        titleEl.style.margin = '0 0 15px 0';
        titleEl.style.fontSize = '16px';
        promptContainer.appendChild(titleEl);

        // 3. 模板列表区域（带滚动）
        const contentEl = document.createElement('div');
        contentEl.textContent = message;
        contentEl.style.whiteSpace = 'pre-wrap';
        contentEl.style.maxHeight = '300px';
        contentEl.style.overflowY = 'auto';
        contentEl.style.margin = '0 0 15px 0';
        contentEl.style.fontSize = '14px';
        promptContainer.appendChild(contentEl);

        // 4. 输入框（选择模板编号）
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = '请输入模板编号';
        inputEl.style.width = '100%';
        inputEl.style.padding = '8px';
        inputEl.style.boxSizing = 'border-box';
        inputEl.style.margin = '0 0 15px 0';
        inputEl.style.border = '1px solid #ccc';
        inputEl.style.borderRadius = '4px';
        promptContainer.appendChild(inputEl);

        // 5. 按钮区域（上一页 + 下一页 + 确定 + 取消）
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'center';
        promptContainer.appendChild(btnContainer);

        // 5.1 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.style.padding = '8px 20px';
        prevBtn.style.border = 'none';
        prevBtn.style.borderRadius = '4px';
        prevBtn.style.backgroundColor = '#409EFF';
        prevBtn.style.color = '#fff';
        prevBtn.style.cursor = 'pointer';
        btnContainer.appendChild(prevBtn);

        // 5.2 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.style.padding = '8px 20px';
        nextBtn.style.border = 'none';
        nextBtn.style.borderRadius = '4px';
        nextBtn.style.backgroundColor = '#409EFF';
        nextBtn.style.color = '#fff';
        nextBtn.style.cursor = 'pointer';
        btnContainer.appendChild(nextBtn);

        // 5.3 确定按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.padding = '8px 20px';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.backgroundColor = '#67C23A';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.cursor = 'pointer';
        btnContainer.appendChild(confirmBtn);

        // 5.4 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.backgroundColor = '#F56C6C';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.cursor = 'pointer';
        btnContainer.appendChild(cancelBtn);

        // 6. 挂载到页面
        document.body.appendChild(promptContainer);
        inputEl.focus();

        // 7. 按钮事件绑定
        let result = null;
        // 上一页按钮：返回特定标识
        prevBtn.addEventListener('click', () => {
            resolve('上一页');
            document.body.removeChild(promptContainer);
        });
        // 下一页按钮：返回特定标识
        nextBtn.addEventListener('click', () => {
            resolve('下一页');
            document.body.removeChild(promptContainer);
        });
        // 确定按钮：返回输入值
        confirmBtn.addEventListener('click', () => {
            result = inputEl.value.trim();
            resolve(result);
            document.body.removeChild(promptContainer);
        });
        // 取消按钮：返回null
        cancelBtn.addEventListener('click', () => {
            resolve(null);
            document.body.removeChild(promptContainer);
        });
        // 回车触发确定
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmBtn.click();
        });

        // 8. 销毁弹窗（防止残留）
        window.addEventListener('beforeunload', () => {
            if (document.body.contains(promptContainer)) {
                document.body.removeChild(promptContainer);
            }
        });
    });
}

async function sendBatchSMS() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const applyNosInput = showPrompt('批量发送系统短信', '请输入申请号列表（多个用逗号或换行分隔）:');
    if (!applyNosInput) return;
    
    const applyNos = applyNosInput.split(/[\n,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    const phonesInput = showPrompt('发送系统短信', `请按顺序输入 ${applyNos.length} 个手机号（用相同分隔符）:`);
    if (!phonesInput) return;
    
    const phones = phonesInput.split(/[\n,，\s]+/).filter(p => p.trim());
    
    if (applyNos.length !== phones.length) {
        createNotification(`申请号数量 (${applyNos.length}) 与手机号数量 (${phones.length}) 不匹配!`, false);
        return;
    }
    
    // -------------------------- 核心修改：带按钮的分页逻辑 --------------------------
    const templateNames = Object.keys(SMS_TEMPLATES);
    const PAGE_SIZE = 16; // 每页显示16个模板（匹配你的截图显示效果）
    let currentPage = 1;
    const totalPages = Math.ceil(templateNames.length / PAGE_SIZE);
    let templateChoice = null;

    // 分页选择模板的循环
    while (true) {
        // 计算当前页的模板范围
        const startIdx = (currentPage - 1) * PAGE_SIZE;
        const endIdx = Math.min(startIdx + PAGE_SIZE, templateNames.length);
        const currentPageTemplates = templateNames.slice(startIdx, endIdx);

        // 生成当前页的模板列表（保留原格式：编号. 模板名）
        const templateList = currentPageTemplates.map((t, i) => {
            const realIndex = startIdx + i + 1; // 模板的真实全局编号
            return `${realIndex}. ${t}`;
        }).join('\n');

        // 拼接分页提示语（简化，因为新增了按钮）
        const promptMessage = `请选择短信模板(转告1-转告8用来发送三方)：
							【测试中，如遇问题及时反馈】
当前页：${currentPage}/${totalPages} | 每页显示${PAGE_SIZE}个
----------------------------------------
${templateList}
----------------------------------------
总模板数：${templateNames.length} | 可选编号：1-${templateNames.length}`;

        // 调用【带分页按钮】的自定义弹窗（替代原showPrompt）
        const userInput = await showTemplatePrompt('选择短信模板', promptMessage);
        
        // 用户点击取消
        if (!userInput) {
            templateChoice = null;
            break;
        }

        const input = userInput.trim();
        // 处理按钮触发的分页指令
        if (input === '上一页' || input === '下一页') {
            if (input === '上一页' && currentPage > 1) {
                currentPage--;
            } else if (input === '下一页' && currentPage < totalPages) {
                currentPage++;
            } else {
                // 页码越界提示
                createNotification(`已到${input === '上一页' ? '第一页' : '最后一页'}!`, false);
            }
            continue; // 继续循环，展示切换后的页码
        }

        // 处理输入框的模板编号选择
        const templateIndex = parseInt(input) - 1;
        if (isNaN(templateIndex) || templateIndex < 0 || templateIndex >= templateNames.length) {
            createNotification(`无效的模板选择! 请输入1-${templateNames.length}之间的数字`, false);
            continue;
        }

        // 选择有效，退出循环
        templateChoice = input;
        break;
    }

    // 用户取消选择模板
    if (!templateChoice) return;
    
    const templateIndex = parseInt(templateChoice) - 1;
    const templateName = templateNames[templateIndex];
    const templateId = SMS_TEMPLATES[templateName];
    
    // 创建映射关系
    const mapping = {};
    for (let i = 0; i < applyNos.length; i++) {
        const applyNo = applyNos[i];
        const phone = phones[i];
        
        if (!mapping[applyNo]) {
            mapping[applyNo] = [];
        }
        mapping[applyNo].push(phone);
    }
    
    const totalTasks = Object.keys(mapping).length;
    let successCount = 0;
    let errorCount = 0;
    const resultsArray = new Array(totalTasks);
    const mappingKeys = Object.keys(mapping);
    let results = [];
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border: 1px solid #ccc;
        z-index: 9999;
        min-width: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在发送短信 (${totalTasks}个申请号)`;
    title.style.fontWeight = 'bold';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
    `;
    minimizeBtn.addEventListener('mouseover', () => minimizeBtn.style.background = '#f0f0f0');
    minimizeBtn.addEventListener('mouseout', () => minimizeBtn.style.background = 'none');
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        // 在系统助手悬浮窗上显示进度
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 发送短信`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${totalTasks}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / totalTasks) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'sms-counter';
    counterElement.textContent = `已完成: 0/${totalTasks}`;
    counterElement.style.marginBottom = '10px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 10px;
        background: #e0e0e0;
        border-radius: 5px;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'sms-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: #4CAF50;
        border-radius: 5px;
        transition: width 0.3s ease;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    let completed = 0; // 跟踪完成数量
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = mappingKeys.map(async (applyNo, index) => {
            const phoneList = mapping[applyNo];
            try {
                const response = await fetch(`${BASE_URL}/ares-web/message/send/record/outsource/low/send`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json;charset=UTF-8',
                        'Cookie': `token=${TOKEN}`
                    },
                    body: JSON.stringify({
                        applyNo,
                        messageTemplateId: templateId,
                        phones: phoneList,
                        params: {}
                    })
                });
                
                if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
                
                const data = await response.json();
                if (data.code === 0) {
                    successCount++;
                    resultsArray[index] = {
                        applyNo,
                        phones: phoneList.join(', '),
                        status: '成功',
                        message: '短信发送成功'
                    };
                } else {
                    errorCount++;
                    resultsArray[index] = {
                        applyNo,
                        phones: phoneList.join(', '),
                        status: '失败',
                        message: data.message || `错误代码: ${data.code}`
                    };
                }
            } catch (error) {
                errorCount++;
                resultsArray[index] = {
                    applyNo,
                    phones: phoneList.join(', '),
                    status: '失败',
                    message: error.message
                };
            } finally {
                // 更新进度
                completed++;
                counterElement.textContent = `已完成: ${completed}/${totalTasks}`;
                progressBar.style.width = `${(completed / totalTasks) * 100}%`;
                
                // 更新悬浮窗进度（如果已最小化）
                const taskContainer = document.getElementById('background-task');
                if (taskContainer && taskContainer.style.display !== 'none') {
                    document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${totalTasks}`;
                    document.getElementById('task-progress-bar').style.width = `${(completed / totalTasks) * 100}%`;
                }
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${totalTasks}/${totalTasks}`;
        progressBar.style.width = `100%`;
        
        // 过滤掉undefined的结果（如果有的话）
        results = resultsArray.filter(result => result !== undefined);
        
        createNotification(`短信发送完成! 成功: ${successCount}, 失败: ${errorCount}`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '短信发送结果');
    }
}
// == 查询还款功能 ==
async function batchQueryRepayment() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询还款状态', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        padding: 24px;
        border: 1px solid rgba(0, 255, 136, 0.3);
        z-index: 9999;
        min-width: 340px;
        border-radius: 16px;
        box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: progressGlow 3s ease-in-out infinite;
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        margin-bottom: 16px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在查询还款状态 (${applyNos.length}个申请号)`;
    title.style.fontWeight = 'bold';
    title.style.color = '#e0e0e0';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.5px';
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
        color: #e0e0e0;
    `;
    minimizeBtn.addEventListener('mouseover', () => {
        minimizeBtn.style.background = 'rgba(0, 255, 136, 0.2)';
        minimizeBtn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
        minimizeBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
    });
    minimizeBtn.addEventListener('mouseout', () => {
        minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        minimizeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        minimizeBtn.style.boxShadow = 'none';
    });
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 查询还款状态`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${applyNos.length}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / applyNos.length) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'repayment-counter';
    counterElement.textContent = `已完成: 0/${applyNos.length}`;
    counterElement.style.marginBottom = '12px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    counterElement.style.color = '#00ff88';
    counterElement.style.fontWeight = '600';
    counterElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 136, 0.2);
        position: relative;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'repayment-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00c853, #00ff88, #69f0ae, #00c853);
        background-size: 200% 100%;
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        animation: shimmer 2s linear infinite;
        position: relative;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                const result = await checkRepaymentStatus(applyNo);
                results[index] = result;
            } catch (error) {
                results[index] = {
                    applyNo,
                    status1: '查询失败',
                    status2: '查询失败',
                    message: error.message
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '还款状态查询结果');
    }
}

// 工具函数 - 提取日期
function extractDatesFromText(text) {
    const datePatterns = [
        '\\d{4}-\\d{1,2}-\\d{1,2}',  // YYYY-MM-DD
        '\\d{4}/\\d{1,2}/\\d{1,2}',  // YYYY/MM/DD
        '\\d{4}年\\d{1,2}月\\d{1,2}日'  // YYYY年MM月DD日
    ];
    
    const dates = [];
    datePatterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'g');
        const matches = text.match(regex);
        if (matches) dates.push(...matches);
    });
    
    return dates;
}

// 工具函数 - 检查是否最近日期
function isRecentDate(dateStr) {
    try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return false;
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        return (
            dateObj.toDateString() === today.toDateString() ||
            dateObj.toDateString() === yesterday.toDateString()
        );
    } catch {
        return false;
    }
}

// 第一轮查询
async function firstRoundQuery(applyNo) {
    try {
        const response = await fetch(`${BASE_URL}/ares-web/recall/baseinfo/query2`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json;charset=UTF-8',
                'Referer': `${BASE_URL}/ares-web/ares-vue/index.html?_rp-1346634870=-1346634870`,
                'Origin': BASE_URL,
                'Cookie': `token=${TOKEN}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ applyNo })
        });
        
        if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
        
        const data = await response.text();
        return data.includes("已逾期") ? "未还款" : "已还款";
    } catch (error) {
        console.error(`第一轮查询失败 (${applyNo}):`, error);
        return "查询失败";
    }
}

// 第二轮查询 - 修复版
async function secondRoundQuery(applyNo) {
    try {
        const response = await fetch(`${BASE_URL}/ares-web/recall/baseinfo/charge/settleQuery`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json;charset=UTF-8',
                'Referer': `${BASE_URL}/ares-web/ares-vue/index.html?_rp493222382=493222382`,
                'Origin': BASE_URL,
                'Cookie': `token=${TOKEN}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ applyNo, index: 1, pageSize: 2 })
        });
        
        if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
        
        const data = await response.text();
        
        // 修复点：更精确地判断扣款状态
        if (data.includes("成功")) {
            const allDates = extractDatesFromText(data);
            for (const dateStr of allDates) {
                if (isRecentDate(dateStr)) {
                    return "扣款成功";
                }
            }
            return "扣款失败（扣款日期非今日或昨日）";
        }
        
        return "扣款失败";
    } catch (error) {
        console.error(`第二轮查询失败 (${applyNo}):`, error);
        return "查询失败";
    }
}

// 检查还款状态
async function checkRepaymentStatus(applyNo) {
    const status1 = await firstRoundQuery(applyNo);
    
    let status2 = "不适用";
    if (status1 === "未还款") {
        status2 = await secondRoundQuery(applyNo);
    }
    
    return { applyNo, status1, status2 };
}

// == 自动催记功能 ==
const DEFAULT_VALUES = {
    phoneState: "",
    relation: "99",
    phoneStatus: "100203",
    gpsStatus: "",
    communicateResult: "018bb723bbe78a8085bc8bb3a1b25c69",
    communicateDate: "",
    remarks: "",
    communicationType: "",
    promisePayType: "",
    promisePayer: "",
    promisePayMoney: "",
    promisePayChannel: "",
    planFollowTime: "",
    relationStr: "本人",
    overdueReason: ""
};

function parseBatchInput(input) {
    const lines = input.split('\n').filter(line => line.trim());
    const entries = [];
    
    for (const line of lines) {
        const parts = line.split(/[,\t\s]+/).filter(part => part.trim());
        if (parts.length >= 3) {
            const [applyNo, name, phone] = parts;
            entries.push({ applyNo, name, phone });
        }
    }
    return entries;
}

async function addBatchRemarks() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const batchInput = showPrompt('批量添加催记', `请输入批量数据（每行一组）：\n格式：申请号,姓名,手机号\n例如：\n3299717605,刘明,13800138000\n\n请复制粘贴您的数据：`);
    if (!batchInput) return;
    
    const entries = parseBatchInput(batchInput);
    if (entries.length === 0) {
        createNotification("未找到有效数据!", false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        padding: 24px;
        border: 1px solid rgba(0, 255, 136, 0.3);
        z-index: 9999;
        min-width: 340px;
        border-radius: 16px;
        box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: progressGlow 3s ease-in-out infinite;
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        margin-bottom: 16px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在添加催记 (${entries.length}个)`;
    title.style.fontWeight = 'bold';
    title.style.color = '#e0e0e0';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.5px';
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
        color: #e0e0e0;
    `;
    minimizeBtn.addEventListener('mouseover', () => {
        minimizeBtn.style.background = 'rgba(0, 255, 136, 0.2)';
        minimizeBtn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
        minimizeBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
    });
    minimizeBtn.addEventListener('mouseout', () => {
        minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        minimizeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        minimizeBtn.style.boxShadow = 'none';
    });
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 添加催记`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${entries.length}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / entries.length) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'remark-counter';
    counterElement.textContent = `已完成: 0/${entries.length}`;
    counterElement.style.marginBottom = '12px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    counterElement.style.color = '#00ff88';
    counterElement.style.fontWeight = '600';
    counterElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 136, 0.2);
        position: relative;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'remark-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00c853, #00ff88, #69f0ae, #00c853);
        background-size: 200% 100%;
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        animation: shimmer 2s linear infinite;
        position: relative;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    const results = new Array(entries.length);
    let completed = 0; // 跟踪完成数量
    let successCount = 0;
    let errorCount = 0;
    
    try {
        // 并发处理所有条目，使用索引保持顺序
        const processingPromises = entries.map(async (entry, index) => {
            const { applyNo, name, phone } = entry;
            try {
                const response = await fetch(`${BASE_URL}/ares-web/outsourceTask/low/remark/create`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json;charset=UTF-8',
                        'Cookie': `token=${TOKEN}`
                    },
                    body: JSON.stringify({
                        ...DEFAULT_VALUES,
                        applyNo,
                        name,
                        phone
                    })
                });
                
                if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
                
                const data = await response.json();
                if (data.code === 0) {
                    successCount++;
                    results[index] = {
                        applyNo,
                        name,
                        phone,
                        status: '成功',
                        message: '添加成功'
                    };
                } else {
                    errorCount++;
                    results[index] = {
                        applyNo,
                        name,
                        phone,
                        status: '失败',
                        message: data.message || `错误代码: ${data.code}`
                    };
                }
            } catch (error) {
                errorCount++;
                results[index] = {
                    applyNo,
                    name,
                    phone,
                    status: '失败',
                    message: error.message
                };
            } finally {
                // 更新进度
                completed++;
                counterElement.textContent = `已完成: ${completed}/${entries.length}`;
                progressBar.style.width = `${(completed / entries.length) * 100}%`;
                
                // 更新悬浮窗进度（如果已最小化）
                const taskContainer = document.getElementById('background-task');
                if (taskContainer && taskContainer.style.display !== 'none') {
                    document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${entries.length}`;
                    document.getElementById('task-progress-bar').style.width = `${(completed / entries.length) * 100}%`;
                }
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${entries.length}/${entries.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`催记添加完成! 成功: ${successCount}, 失败: ${errorCount}`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '催记添加结果');
    }
}


// == 查询客户画像功能 ==
async function AiBaseInfo() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询客户ai画像', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        padding: 24px;
        border: 1px solid rgba(0, 255, 136, 0.3);
        z-index: 9999;
        min-width: 340px;
        border-radius: 16px;
        box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: progressGlow 3s ease-in-out infinite;
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        margin-bottom: 16px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在查询客户画像 (${applyNos.length}个)`;
    title.style.fontWeight = 'bold';
    title.style.color = '#e0e0e0';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.5px';
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
        color: #e0e0e0;
    `;
    minimizeBtn.addEventListener('mouseover', () => {
        minimizeBtn.style.background = 'rgba(0, 255, 136, 0.2)';
        minimizeBtn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
        minimizeBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
    });
    minimizeBtn.addEventListener('mouseout', () => {
        minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        minimizeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        minimizeBtn.style.boxShadow = 'none';
    });
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 查询客户画像`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${applyNos.length}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / applyNos.length) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'query-counter';
    counterElement.textContent = `已完成: 0/${applyNos.length}`;
    counterElement.style.marginBottom = '12px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    counterElement.style.color = '#00ff88';
    counterElement.style.fontWeight = '600';
    counterElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 136, 0.2);
        position: relative;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'query-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00c853, #00ff88, #69f0ae, #00c853);
        background-size: 200% 100%;
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        animation: shimmer 2s linear infinite;
        position: relative;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    const url = `${BASE_URL}/ares-web/recall/baseinfo/queryAiBaseInfo`;
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Origin": BASE_URL,
                        "Cookie": `token=${TOKEN}`
                    },
                    body: JSON.stringify({ applyNo })
                });

                const data = await response.json();
                
                results[index] = {
                    applyNo,
                    status: data.code === 0 ? '成功' : `失败: ${data.message || data.code}`,
collectionLanguage: data.data?.collectionLanguage || "无",
collectionSms: data.data?.collectionSms || "无",
recentOverdueImage: data.data?.recentOverdueImage || "无"
                };
            } catch (error) {
                results[index] = {
                    applyNo,
                    status: `请求失败: ${error.message}`,
                    collectionLanguage: "无",
                    collectionSms: "无",
                    recentOverdueImage: "无",
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '申请号查询结果');
    }
}

// == 查询车牌号功能 ==
async function batchQuery2ApplyNos() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询车辆信息', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const loadingElement = document.createElement('div');
    loadingElement.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border: 1px solid #ccc;
        z-index: 9999;
        min-width: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

    // 创建标题栏（含最小化按钮）
    const header = document.createElement('div');
    header.style = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
    `;

    const title = document.createElement('div');
    title.textContent = `正在查询申请号 (${applyNos.length}个)`;
    title.style.fontWeight = 'bold';

    // 创建最小化按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
    `;
    minimizeBtn.addEventListener('mouseover', () => minimizeBtn.style.background = '#f0f0f0');
    minimizeBtn.addEventListener('mouseout', () => minimizeBtn.style.background = 'none');
    minimizeBtn.addEventListener('click', () => {
        loadingElement.style.display = 'none';
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            document.getElementById('task-title').textContent = `任务: 查询申请号`;
            document.getElementById('task-progress-text').textContent = `已完成: ${completed}/${applyNos.length}`;
            document.getElementById('task-progress-bar').style.width = `${(completed / applyNos.length) * 100}%`;
            taskContainer.style.display = 'block';
        }
    });

    header.appendChild(title);
    header.appendChild(minimizeBtn);
    loadingElement.appendChild(header);

    // 创建计数器显示
    const counterElement = document.createElement('div');
    counterElement.id = 'query-counter';
    counterElement.textContent = `已完成: 0/${applyNos.length}`;
    counterElement.style.marginBottom = '10px';
    counterElement.style.textAlign = 'center';
    counterElement.style.fontSize = '14px';
    loadingElement.appendChild(counterElement);

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style = `
        width: 100%;
        height: 10px;
        background: #e0e0e0;
        border-radius: 5px;
    `;

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'query-progress';
    progressBar.style = `
        width: 0%;
        height: 100%;
        background: #4CAF50;
        border-radius: 5px;
        transition: width 0.3s ease;
    `;

    progressContainer.appendChild(progressBar);
    loadingElement.appendChild(progressContainer);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    const url = `${BASE_URL}/ares-web/recall/baseinfo/query2`;
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Origin": BASE_URL,
                        "Cookie": `token=${TOKEN}`
                    },
                    body: JSON.stringify({ applyNo })
                });

                const data = await response.json();
                
                results[index] = {
                    applyNo,
                    status: data.code === 0 ? '成功' : `失败: ${data.message || data.code}`,
                    color: data.data?.overdue?.color || "无",
                    brand: data.data?.overdue?.brand || "无",
                    model: data.data?.overdue?.model || "无",
                    licensePlateNum: data.data?.overdue?.licensePlateNum || "无",
                    对公期数: data.data?.repay?.examinePeriod || "无对公记录"
                };
            } catch (error) {
                results[index] = {
                    applyNo,
                    status: `请求失败: ${error.message}`,
                    color: "无",
                    brand: "无",
                    model: "无",
                    licensePlateNum: "无",
                    examinePeriod: "无"
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '申请号查询结果');
    }
}

// == 查询历史客诉功能 ==
async function batchhistoryComplaint() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询历史客诉', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const { loadingElement, counterElement, progressBar } = createProgressBar(`正在查询申请号 (${applyNos.length}个)`, applyNos.length);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    const url = `${BASE_URL}/ares-web/recall/baseinfo/query1`;
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Origin": BASE_URL,
                        "Cookie": `token=${TOKEN}`
                    },
                    body: JSON.stringify({ applyNo })
                });

                const data = await response.json();
                
                results[index] = {
                    applyNo,
                    status: data.code === 0 ? '成功' : `失败: ${data.message || data.code}`,
                    historyComplaint: data.data?.base?.historyComplaint ?? "无"
                };
            } catch (error) {
                results[index] = {
                    applyNo,
                    status: `请求失败: ${error.message}`,
                    historyComplaint: "无"
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '申请号查询结果');
    }
}

// == 合并查询功能：车辆位置+车辆信息 ==
async function batchQueryCarAndBaseInfo() {
    if (!validateToken()) {
        createNotification('请先设置有效的Token', false);
        return;
    }

    const input = showPrompt('批量查询车辆信息', '请输入申请号（多个用逗号或空格分隔）:');
    if (!input) return;
    
    const applyNos = input.split(/[,，\s]+/).filter(no => no.trim());
    if (applyNos.length === 0) {
        createNotification('未输入有效的申请号!', false);
        return;
    }
    
    // === 创建带进度条的加载提示 ===
    const { loadingElement, counterElement, progressBar } = createProgressBar(`正在查询车辆信息 (${applyNos.length}个)`, applyNos.length);
    document.body.appendChild(loadingElement);
    
    const results = new Array(applyNos.length);
    let completed = 0; // 跟踪完成数量
    const carLocalUrl = `${BASE_URL}/ares-web/recall/car`;
    const baseInfoUrl = `${BASE_URL}/ares-web/recall/baseinfo/query2`;
    
    try {
        // 并发处理所有申请号，使用索引保持顺序
        const processingPromises = applyNos.map(async (applyNo, index) => {
            try {
                // 同时发起两个请求
                const [carLocalResponse, baseInfoResponse] = await Promise.all([
                    fetch(carLocalUrl, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Origin": BASE_URL,
                            "Cookie": `token=${TOKEN}`
                        },
                        body: JSON.stringify({ applyNo })
                    }),
                    fetch(baseInfoUrl, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Origin": BASE_URL,
                            "Cookie": `token=${TOKEN}`
                        },
                        body: JSON.stringify({ applyNo })
                    })
                ]);

                const carLocalData = await carLocalResponse.json();
                const baseInfoData = await baseInfoResponse.json();
                
                // 合并两个接口的结果
                const mergedResult = {
                    applyNo,
                    //status_location: carLocalData.code === 0 ? '成功' : `失败: ${carLocalData.message || carLocalData.code}`,
                    //status_baseinfo: baseInfoData.code === 0 ? '成功' : `失败: ${baseInfoData.message || baseInfoData.code}`,
                    // 车辆位置信息
                    locationUrl: carLocalData.data?.devices?.[0]?.locationUrl || "无",
                    //online: carLocalData.data?.devices?.[0]?.online || "无",
                    vin: carLocalData.data?.devices?.[0]?.vin || "无",
                    //num: carLocalData.data?.devices?.[0]?.num || "无",
                    // 车辆基础信息
                    color: baseInfoData.data?.overdue?.color || "无",
                    brand: baseInfoData.data?.overdue?.brand || "无",
                    model: baseInfoData.data?.overdue?.model || "无",
                    licensePlateNum: baseInfoData.data?.overdue?.licensePlateNum || "无",
                    对公期数: baseInfoData.data?.repay?.examinePeriod || "无对公记录"
                };
                
                results[index] = mergedResult;
            } catch (error) {
                results[index] = {
                    applyNo,
                    //status_location: `请求失败: ${error.message}`,
                    //status_baseinfo: `请求失败: ${error.message}`,
                    locationUrl: "无",
                    //online: "无",
                    vin: "无",
                    //num: "无",
                    color: "无",
                    brand: "无",
                    model: "无",
                    licensePlateNum: "无",
                    对公期数: "无"
                };
            } finally {
                // 更新进度
                completed++;
                updateProgress(counterElement, progressBar, completed, applyNos.length);
            }
        });
        
        // 等待所有处理完成
        await Promise.all(processingPromises);
        
        // 确保进度条显示为100%
        counterElement.textContent = `已完成: ${applyNos.length}/${applyNos.length}`;
        progressBar.style.width = `100%`;
        
        createNotification(`成功查询 ${results.length} 个申请号`);
    } finally {
        // 任务完成后隐藏进度显示
        const taskContainer = document.getElementById('background-task');
        if (taskContainer) {
            taskContainer.style.display = 'none';
        }
        
        // 移除进度窗口
        if (loadingElement.parentNode) {
            loadingElement.remove();
        }
        
        displayResults(results, '车辆信息查询结果');
    }
}


// == 主界面 ==

// == 励志名言数组（可扩展） ==
const INSPIRATION_QUOTES = [
  "成功不是终点，失败不是致命的，继续前进的勇气才是最重要的。",
  "每一次努力都不会白费，每一步都在靠近目标。",
  "相信自己，你比想象中更强大。",
  "困难像弹簧，你强它就弱，你弱它就强。",
  "不为失败找借口，只为成功找方法。",
  "人生没有彩排，每天都是现场直播。",
  "只要功夫深，铁杵磨成针。",
  "宝剑锋从磨砺出，梅花香自苦寒来。",
  "天生我材必有用，千金散尽还复来。",
  "路漫漫其修远兮，吾将上下而求索。",
"海上生明月，天涯共此时",
"春风又绿江南岸，明月何时照我还",
"人生若只如初见，何事秋风悲画扇",
"醉后不知天在水，满船清梦压星河",
"落花人独立，微雨燕双飞",
"小楼一夜听春雨，深巷明朝卖杏花",
"孤帆远影碧空尽，唯见长江天际流",
"欲买桂花同载酒，终不似，少年游",
"沾衣欲湿杏花雨，吹面不寒杨柳风",
"疏影横斜水清浅，暗香浮动月黄昏",
"溪云初起日沉阁，山雨欲来风满楼",
"二十四桥明月夜，玉人何处教吹箫",
"月落乌啼霜满天，江枫渔火对愁眠",
"两个黄鹂鸣翠柳，一行白鹭上青天",
"云想衣裳花想容，春风拂槛露华浓",
"此情可待成追忆，只是当时已惘然",
"我见青山多妩媚，料青山见我应如是",
"竹外桃花三两枝，春江水暖鸭先知",
"天街小雨润如酥，草色遥看近却无",
"接天莲叶无穷碧，映日荷花别样红",
"迟日江山丽，春风花草香",
"长风破浪会有时，直挂云帆济沧海",
"露从今夜白，月是故乡明",
"明月松间照，清泉石上流",
"落霞与孤鹜齐飞，秋水共长天一色",
"山重水复疑无路，柳暗花明又一村",
"大漠孤烟直，长河落日圆",
"疏影横斜水清浅，暗香浮动月黄昏"
];

// == 获取随机名言 ==
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * INSPIRATION_QUOTES.length);
  return INSPIRATION_QUOTES[randomIndex];
}

// == 主界面（悬浮窗） ==
function createHelperUI() {
  if (document.getElementById('helper-container')) return;
  
  // 添加全局动画样式
  const helperStyle = document.createElement('style');
  helperStyle.textContent = `
    @keyframes borderGlow {
      0%, 100% { border-color: rgba(0, 255, 136, 0.4); box-shadow: 0 0 20px rgba(0, 255, 136, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
      50% { border-color: rgba(0, 255, 136, 0.6); box-shadow: 0 0 30px rgba(0, 255, 136, 0.35), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
    }
    @keyframes breathe {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    #helper-container { animation: slideIn 0.4s ease-out; }
  `;
  document.head.appendChild(helperStyle);
  
  const container = document.createElement('div');
  container.id = 'helper-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(145deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
    border: 1px solid rgba(0, 255, 136, 0.4);
    border-radius: 16px;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 300px;
    max-width: 90vw;
    overflow: hidden;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: borderGlow 4s ease-in-out infinite;
  `;
    // === 新增：后台任务进度显示区域 ===
    const taskProgressContainer = document.createElement('div');
    taskProgressContainer.id = 'background-task';
    taskProgressContainer.style.cssText = `
        display: none;
        position: relative;
        border-top: 1px solid rgba(46,125,50,0.1);
        padding: 10px 14px;
        background: rgba(46,125,50,0.03);
    `;
    
    // 任务标题
    const taskTitle = document.createElement('div');
    taskTitle.id = 'task-title';
    taskTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
    taskProgressContainer.appendChild(taskTitle);
    
    // 进度文本
    const taskProgressText = document.createElement('div');
    taskProgressText.id = 'task-progress-text';
    taskProgressText.style.cssText = 'font-size: 12px; margin-bottom: 5px;';
    taskProgressContainer.appendChild(taskProgressText);
    
    // 进度条容器
    const taskProgressBarContainer = document.createElement('div');
    taskProgressBarContainer.style.cssText = `
        width: 100%;
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        margin-bottom: 5px;
    `;
    const taskProgressBar = document.createElement('div');
    taskProgressBar.id = 'task-progress-bar';
    taskProgressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: #4CAF50;
        border-radius: 3px;
        transition: width 0.3s ease;
    `;
    taskProgressBarContainer.appendChild(taskProgressBar);
    taskProgressContainer.appendChild(taskProgressBarContainer);
    
    // 取消按钮（可选）
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #ef5350;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 3px 10px;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.2s;
    `;
    cancelButton.addEventListener('mouseover', () => cancelButton.style.background = '#f44336');
    cancelButton.addEventListener('mouseout', () => cancelButton.style.background = '#ef5350');
    taskProgressContainer.appendChild(cancelButton);
    
    container.appendChild(taskProgressContainer); // 将后台任务区域添加到悬浮窗
 

  // === 1. 标题栏（包含拖拽、标题、折叠按钮） ===
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(0, 200, 83, 0.9) 0%, rgba(0, 255, 136, 0.7) 50%, rgba(105, 240, 174, 0.6) 100%);
    color: white;
    border-radius: 16px 16px 0 0;
  `;
	
  // 拖拽手柄（左）
  const dragHandle = document.createElement('div');
  dragHandle.textContent = '≡';
  dragHandle.style.cssText = `
    cursor: move;
    font-size: 20px;
    color: rgba(255,255,255,0.9);
    transition: all 0.3s ease;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
  `;
  dragHandle.addEventListener('mouseover', () => {
    dragHandle.style.color = 'white';
    dragHandle.style.textShadow = '0 0 15px rgba(255, 255, 255, 0.9)';
    dragHandle.style.background = 'rgba(255, 255, 255, 0.1)';
  });
  dragHandle.addEventListener('mouseout', () => {
    dragHandle.style.color = 'rgba(255,255,255,0.9)';
    dragHandle.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
    dragHandle.style.background = 'transparent';
  });
  titleBar.appendChild(dragHandle);

  // 标题（中）
  const title = document.createElement('div');
  title.textContent = '易鑫云系统助手';
  title.style.cssText = `
    font-size: 15px;
    font-weight: 700;
    color: white;
    letter-spacing: 1.5px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255, 255, 255, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  titleBar.appendChild(title);

  // 缩放控制按钮组
  const zoomControls = document.createElement('div');
  zoomControls.style.cssText = `
    display: flex;
    align-items: center;
    gap: 5px;
  `;
  
  // 缩小按钮
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.textContent = '−';
  zoomOutBtn.style.cssText = `
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    font-size: 14px;
    color: white;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;
  zoomOutBtn.addEventListener('mouseover', () => {
    zoomOutBtn.style.background = 'rgba(0, 255, 136, 0.3)';
    zoomOutBtn.style.borderColor = 'rgba(0, 255, 136, 0.6)';
    zoomOutBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
  });
  zoomOutBtn.addEventListener('mouseout', () => {
    zoomOutBtn.style.background = 'rgba(255,255,255,0.15)';
    zoomOutBtn.style.borderColor = 'rgba(255,255,255,0.2)';
    zoomOutBtn.style.boxShadow = 'none';
  });
  
  // 缩放级别显示
  const zoomLevel = document.createElement('span');
  zoomLevel.textContent = '100%';
  zoomLevel.style.cssText = `
    font-size: 11px;
    color: rgba(255,255,255,0.9);
    min-width: 36px;
    text-align: center;
    text-shadow: 0 0 6px rgba(255,255,255,0.3);
  `;
  
  // 放大按钮
  const zoomInBtn = document.createElement('button');
  zoomInBtn.textContent = '+';
  zoomInBtn.style.cssText = `
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    font-size: 14px;
    color: white;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;
  zoomInBtn.addEventListener('mouseover', () => {
    zoomInBtn.style.background = 'rgba(0, 255, 136, 0.3)';
    zoomInBtn.style.borderColor = 'rgba(0, 255, 136, 0.6)';
    zoomInBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
  });
  zoomInBtn.addEventListener('mouseout', () => {
    zoomInBtn.style.background = 'rgba(255,255,255,0.15)';
    zoomInBtn.style.borderColor = 'rgba(255,255,255,0.2)';
    zoomInBtn.style.boxShadow = 'none';
  });
  
  zoomControls.appendChild(zoomOutBtn);
  zoomControls.appendChild(zoomLevel);
  zoomControls.appendChild(zoomInBtn);
  
  // 折叠按钮（右）
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = '−'; // 初始为折叠状态（显示内容）
  collapseBtn.style.cssText = `
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    font-size: 16px;
    color: white;
    cursor: pointer;
    padding: 2px 8px;
    margin-left: 8px;
    transition: all 0.3s ease;
  `;
  collapseBtn.addEventListener('mouseover', () => {
    collapseBtn.style.background = 'rgba(0, 255, 136, 0.3)';
    collapseBtn.style.borderColor = 'rgba(0, 255, 136, 0.6)';
    collapseBtn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
  });
  collapseBtn.addEventListener('mouseout', () => {
    collapseBtn.style.background = 'rgba(255,255,255,0.15)';
    collapseBtn.style.borderColor = 'rgba(255,255,255,0.2)';
    collapseBtn.style.boxShadow = 'none';
  });
  
  zoomControls.appendChild(collapseBtn);
  titleBar.appendChild(zoomControls);

  container.appendChild(titleBar);

  // === 2. 随机励志名言（标题栏下方） ===
  const quoteElement = document.createElement('div');
  quoteElement.className = 'inspiration-quote';
  quoteElement.style.cssText = `
    padding: 10px 16px;
    color: #7c9a82;
    font-style: italic;
    font-size: 12px;
    border-bottom: 1px solid rgba(46,125,50,0.1);
    min-height: 36px;
    background: rgba(46,125,50,0.03);
    line-height: 1.5;
  `;
  container.appendChild(quoteElement);

  // === 3. 内容容器（状态提示+功能按钮，可折叠） ===
  const helperContent = document.createElement('div');
  helperContent.className = 'helper-content';
  helperContent.style.cssText = `
    padding: 12px 14px;
  `;

  // === 3.1 Token状态提示（放在内容容器内） ===
  const tokenStatus = document.createElement('div');
  tokenStatus.id = 'token-status';
  tokenStatus.style.cssText = `
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  `;

  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'token-status-indicator';
  statusIndicator.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #f44336;
    margin-right: 8px;
    box-shadow: 0 0 6px rgba(244, 67, 54, 0.4);
    transition: all 0.3s;
  `;

  const statusText = document.createElement('span');
  statusText.id = 'token-status-text';
  statusText.textContent = '未设置Token';
  statusText.style.cssText = 'color: #f44336; font-size: 12px; font-weight: 500;';

  tokenStatus.appendChild(statusIndicator);
  tokenStatus.appendChild(statusText);
  helperContent.appendChild(tokenStatus); // 将状态提示放入内容容器


  // === 3.2 功能按钮（放在内容容器内） ===
  const buttons = [
    { text: '批量查询销售', action: batchQueryApplyNos, color: '#2E7D32' }, // 深绿色 - 代表成功和效率
    { text: '发送系统短信', action: sendBatchSMS, color: '#1976D2' }, // 深蓝色 - 代表沟通和信任
    { text: '查询还款状态', action: batchQueryRepayment, color: '#FF9800' }, // 橙色 - 代表提醒和警告
    { text: '批量添加催记', action: addBatchRemarks, color: '#7B1FA2' }, // 深紫色 - 代表专业和创新
    //{ text: '查询车辆信息', action: batchQuery2ApplyNos, color: '#607D8B' },
    { text: '查询客户画像', action: AiBaseInfo, color: '#0288D1' }, // 亮蓝色 - 代表智能和分析
    { text: '查询历史客诉', action: batchhistoryComplaint, color: '#C62828' }, // 深红色 - 代表警示和重要
    { text: '合并查询车辆信息', action: batchQueryCarAndBaseInfo, color: '#E64A19' }, // 橙红色 - 代表综合和整合
    { text: '查询短信数据', action: batchQuerySMSData, color: '#455A64' }, // 深灰色 - 代表数据和信息
    { text: '批量实时扣款', action: batchRealTimeCharge, color: '#E91E63' }, // 红色 - 代表扣款操作
    { text: '显示/隐藏水印' , action: toggleWatermark, color: '#5D4037',}, // 水印控制
    // { text: '设置Token', action: setToken, color: '#607D8B' }
  ];

  for (const button of buttons) {
    const btn = document.createElement('button');
    btn.textContent = button.text;
    btn.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 12px;
      margin: 4px 0;
      background: ${button.color};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      letter-spacing: 0.5px;
    `;
        btn.addEventListener('mouseover', () => {
            btn.style.filter = 'brightness(1.2)';
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35), 0 0 20px rgba(255, 255, 255, 0.1)';
            btnGlow.style.left = '100%';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.filter = 'none';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
            btnGlow.style.left = '-100%';
        });
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'translateY(1px)';
            btn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'translateY(-2px)';
        });
        if (button.id) btn.id = button.id;
        btn.addEventListener('click', button.action);
    helperContent.appendChild(btn); // 将按钮放入内容容器
  }

  container.appendChild(helperContent); // 将内容容器加入悬浮窗

  // === 4. 折叠按钮交互逻辑 ===
  collapseBtn.addEventListener('click', () => {
    const isCollapsed = helperContent.style.display === 'none';
    // 切换内容容器显示状态
    helperContent.style.display = isCollapsed ? 'block' : 'none';
    // 切换折叠按钮图标（−/+)
    collapseBtn.textContent = isCollapsed ? '−' : '+';
    // 展开时更新名言
    if (!isCollapsed) {
      quoteElement.textContent = getRandomQuote();
    }
  });

  // === 5. 初始化励志名言 ===
  quoteElement.textContent = getRandomQuote();

  // === 6. 拖拽功能（保持原有逻辑，调整手柄位置） ===
  let isDragging = false;
  let offsetX, offsetY;

  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    e.preventDefault(); // 防止文本选中
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    // 限制悬浮窗不超出窗口边界（可选）
    const maxLeft = window.innerWidth - container.offsetWidth;
    const maxTop = window.innerHeight - container.offsetHeight;
    container.style.left = `${Math.min(Math.max(newLeft, 0), maxLeft)}px`;
    container.style.top = `${Math.min(Math.max(newTop, 0), maxTop)}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // === 7. 缩放功能 ===
  let currentZoom = 100; // 初始缩放级别
  const minZoom = 50;    // 最小缩放级别
  const maxZoom = 150;   // 最大缩放级别
  const zoomStep = 10;   // 缩放步长

  // 缩放函数
  function zoom(amount) {
    currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + amount));
    zoomLevel.textContent = `${currentZoom}%`;
    container.style.transform = `scale(${currentZoom / 100})`;
    container.style.transformOrigin = 'top right';
  }

  // 缩小按钮点击事件
  zoomOutBtn.addEventListener('click', () => {
    zoom(-zoomStep);
  });

  // 放大按钮点击事件
  zoomInBtn.addEventListener('click', () => {
    zoom(zoomStep);
  });

  document.body.appendChild(container);

       // 初始检查Token
    updateTokenStatus();
}
function updateTokenStatus() {
    const statusIndicator = document.getElementById('token-status-indicator');
    const statusText = document.getElementById('token-status-text');
    
    if (validateToken()) {
        statusIndicator.style.backgroundColor = '#00ff88';
        statusIndicator.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.8)';
        statusText.textContent = 'Token已设置 ✓';
        statusText.style.color = '#00ff88';
    } else {
        statusIndicator.style.backgroundColor = '#ff3b30';
        statusIndicator.style.boxShadow = '0 0 12px rgba(255, 59, 48, 0.6)';
        statusText.textContent = '未设置Token ✗';
        statusText.style.color = '#ff6b6b';
    }
}

function setToken() {
    const newToken = showPrompt('设置Token', '请输入新的Token值:');
    if (newToken) {
        TOKEN = newToken;
        GM_setValue('yixin_token', newToken);  // 持久化到油猴存储
        updateTokenStatus();
        createNotification('Token已更新并保存!');
    }
}

// == 密码验证 ==
// 正确密码的SHA-256哈希值（防止密码明文暴露在代码中）
// 默认密码: 888888 — 如需修改，请替换下方HASH值为新密码的SHA-256哈希
const PASSWORD_HASH = '92925488b28ab12584ac8fcaa8a27a0f497b2c62940c8f4fbc8ef19ebc87c43e';
let IS_AUTHENTICATED = false;

// SHA-256哈希函数
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 创建密码输入弹窗
function createPasswordDialog(callback) {
    // 如果已验证过，直接跳过
    const savedHash = GM_getValue('auth_hash', '');
    if (savedHash === PASSWORD_HASH) {
        IS_AUTHENTICATED = true;
        callback();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 99999;
        display: flex; justify-content: center; align-items: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; border-radius: 12px; padding: 30px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); width: 340px; text-align: center;
        font-family: Arial, sans-serif;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #333;';
    title.textContent = '🔒 系统助手验证';

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size: 13px; color: #888; margin-bottom: 20px;';
    subtitle.textContent = '请输入授权密码以启用助手';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = '请输入密码';
    input.style.cssText = `
        width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0;
        border-radius: 8px; font-size: 15px; outline: none;
        transition: border-color 0.3s; box-sizing: border-box;
    `;
    input.addEventListener('focus', function() { this.style.borderColor = '#4CAF50'; });
    input.addEventListener('blur', function() { this.style.borderColor = '#e0e0e0'; });

    const errorTip = document.createElement('div');
    errorTip.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 8px; height: 16px;';

    const btn = document.createElement('button');
    btn.textContent = '确认解锁';
    btn.style.cssText = `
        width: 100%; padding: 12px; margin-top: 16px;
        background: #4CAF50; color: white; border: none;
        border-radius: 8px; font-size: 15px; font-weight: bold;
        cursor: pointer; transition: background 0.3s;
    `;
    btn.addEventListener('mouseenter', function() { this.style.background = '#43A047'; });
    btn.addEventListener('mouseleave', function() { this.style.background = '#4CAF50'; });

    const rememberLabel = document.createElement('label');
    rememberLabel.style.cssText = 'display: flex; align-items: center; margin-top: 12px; font-size: 13px; color: #666; cursor: pointer;';
    const rememberCheck = document.createElement('input');
    rememberCheck.type = 'checkbox';
    rememberCheck.style.cssText = 'margin-right: 6px;';
    rememberCheck.checked = true;
    rememberLabel.appendChild(rememberCheck);
    rememberLabel.appendChild(document.createTextNode('记住密码（本次浏览器会话有效）'));

    async function verify() {
        const pwd = input.value.trim();
        if (!pwd) { errorTip.textContent = '请输入密码'; return; }
        const hash = await sha256(pwd);
        if (hash === PASSWORD_HASH) {
            IS_AUTHENTICATED = true;
            if (rememberCheck.checked) {
                GM_setValue('auth_hash', hash);
            }
            overlay.remove();
            callback();
        } else {
            errorTip.textContent = '密码错误，请重试';
            input.value = '';
            input.style.borderColor = '#f44336';
            setTimeout(() => { input.style.borderColor = '#e0e0e0'; }, 1500);
        }
    }

    btn.addEventListener('click', verify);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') verify(); });

    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(input);
    dialog.appendChild(errorTip);
    dialog.appendChild(btn);
    dialog.appendChild(rememberLabel);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    setTimeout(() => input.focus(), 100);
}

// == 初始化助手 ==
// 三层防护：window变量（同页面）+ DOM检测（同页面）+ GM锁心跳过期（跨标签页，崩溃自动恢复）
(function initHelper() {
    if (window.location.hostname !== 'ares.yxqiche.com' && !window.location.hostname.includes('ares.yxqiche')) {
        return;
    }

    // 第一层：window变量检测（同页面防重复，最可靠）
    if (window.__yixinHelperInitialized) {
        console.log('[易鑫云系统助手] window标记已存在，跳过');
        return;
    }

    // 第二层：DOM检测（同页面兜底）
    if (document.getElementById('helper-container') || document.getElementById('auth-overlay')) {
        console.log('[易鑫云系统助手] DOM已存在UI实例，跳过');
        return;
    }

    // 第三层：GM锁 + 心跳过期（跨标签页防重复，崩溃后30秒自动过期）
    var lockTime = GM_getValue('helper_instance_active', 0);
    var now = Date.now();
    if (lockTime && (now - lockTime) < 30000) {
        console.log('[易鑫云系统助手] 其他标签页实例运行中（' + Math.round((now - lockTime)/1000) + '秒前活跃），跳过');
        return;
    }

    function tryInit() {
        // 再次三层检测
        if (window.__yixinHelperInitialized) return;
        if (document.getElementById('helper-container') || document.getElementById('auth-overlay')) return;

        var lockTime2 = GM_getValue('helper_instance_active', 0);
        if (lockTime2 && (Date.now() - lockTime2) < 30000) return;

        // 标记本页面已初始化
        window.__yixinHelperInitialized = true;

        // 写入心跳时间戳（而非简单的true/false）
        GM_setValue('helper_instance_active', Date.now());

        // 心跳：每10秒刷新一次，让其他标签页知道本实例还活着
        var heartbeat = setInterval(function() {
            GM_setValue('helper_instance_active', Date.now());
        }, 10000);

        // 页面卸载时清除
        window.addEventListener('beforeunload', function() {
            GM_setValue('helper_instance_active', 0);
            clearInterval(heartbeat);
        });
        // 页面隐藏/关闭时也清除（移动端兼容）
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                // 延迟3秒再判断，避免切tab误清
                setTimeout(function() {
                    if (document.visibilityState === 'hidden') {
                        GM_setValue('helper_instance_active', 0);
                        clearInterval(heartbeat);
                    } else {
                        // 又回来了，重新激活
                        GM_setValue('helper_instance_active', Date.now());
                        heartbeat = setInterval(function() {
                            GM_setValue('helper_instance_active', Date.now());
                        }, 10000);
                    }
                }, 3000);
            }
        });

        // 先验证密码，通过后再初始化
        createPasswordDialog(function() {
            TOKEN = getTokenFromCookies() || GM_getValue('yixin_token', '') || TOKEN;
            createHelperUI();
            createNotification('易鑫云系统助手已加载!');
        });
    }

    if (document.body) {
        tryInit();
    } else {
        document.addEventListener('DOMContentLoaded', tryInit);
        var checkCount = 0;
        var checkTimer = setInterval(function() {
            checkCount++;
            if (document.body) {
                clearInterval(checkTimer);
                tryInit();
            } else if (checkCount > 50) {
                clearInterval(checkTimer);
                console.log('[易鑫云系统助手] 等待document.body超时，强制尝试');
                tryInit();
            }
        }, 100);
    }
})();
(function() {
    'use strict';

    console.log('[号码替换] 脱敏还原脚本已加载 v1.6');

    // 全局状态
    var currentObserver = null;
    var currentApplyNo = null;
    var isReplacing = false;

    function getApplyNo() {
        var m = location.hash.match(/applyNo=(\d+)/);
        if (m) return m[1];
        m = location.search.match(/applyNo=(\d+)/);
        if (m) return m[1];
        m = location.pathname.match(/applyNo[\/=](\d+)/);
        if (m) return m[1];
        return null;
    }

    function getToken() {
        var TOKEN = "";
        document.cookie.split(';').forEach(function(c) {
            var p = c.trim().split('=');
            if (p[0] === 'token') TOKEN = p[1];
        });
        return TOKEN;
    }

    function cleanup() {
        if (currentObserver) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        isReplacing = false;
    }

    function replaceAll(maskedToReal) {
        if (isReplacing) return 0;
        isReplacing = true;

        var count = 0;
        function walk(n) {
            if (n.nodeType === 3) {
                var t = n.textContent, changed = false;
                for (var m in maskedToReal) {
                    if (t.indexOf(m) !== -1) {
                        t = t.split(m).join(maskedToReal[m]);
                        changed = true; count++;
                    }
                }
                if (changed) n.textContent = t;
            } else if (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') {
                if (n.tagName === 'INPUT' && n.value) {
                    var v = n.value, vc = false;
                    for (var m in maskedToReal) {
                        if (v.indexOf(m) !== -1) {
                            v = v.split(m).join(maskedToReal[m]);
                            vc = true; count++;
                        }
                    }
                    if (vc) n.value = v;
                }
                for (var i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i]);
            }
        }
        walk(document.body);
        isReplacing = false;
        return count;
    }

    function startObserver(maskedToReal) {
        cleanup();
        var debounceTimer = null;

        currentObserver = new MutationObserver(function(mutations) {
            var hasTextChange = false;
            for (var i = 0; i < mutations.length; i++) {
                var mut = mutations[i];
                if (mut.type === 'characterData' || mut.addedNodes.length > 0) {
                    hasTextChange = true;
                    break;
                }
            }
            if (!hasTextChange) return;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                currentObserver.disconnect();
                var cnt = replaceAll(maskedToReal);
                if (cnt > 0) console.log('[号码替换] 动态替换', cnt, '处');
                currentObserver.observe(
                    document.body,
                    {childList: true, subtree: true, characterData: true}
                );
            }, 300);
        });

        currentObserver.observe(
            document.body,
            {childList: true, subtree: true, characterData: true}
        );
    }

    function startReplace(applyNo) {
        var TOKEN = getToken();
        if (!TOKEN) {
            console.log('[号码替换] 未找到Token，请确认已登录');
            return;
        }

        console.log('[号码替换] 启动 | applyNo:', applyNo);
        cleanup();

        var maskedToReal = {};

        // API 1: query1 - 本人号码
        try {
            var x1 = new XMLHttpRequest();
            x1.open('POST', '/ares-web/recall/baseinfo/query1', false);
            x1.setRequestHeader('token', TOKEN);
            x1.setRequestHeader('Content-Type', 'application/json');
            x1.send(JSON.stringify({applyNo: applyNo}));
            var d1 = JSON.parse(x1.responseText);
            if (d1.data && d1.data.base) {
                if (d1.data.base.phoneNumber && d1.data.base.plaintextPhone) {
                    maskedToReal[d1.data.base.phoneNumber] = d1.data.base.plaintextPhone;
                }
                if (d1.data.base.plaintextPhone) {
                    var plain = d1.data.base.plaintextPhone;
                    var masked = plain.substring(0, 3) + '****' + plain.substring(7);
                    if (d1.data.base.phoneNumber !== masked) {
                        maskedToReal[masked] = plain;
                    }
                }
            }
        } catch(e) { console.log('[号码替换] query1异常:', e.message); }

        // API 2: query2 - 配偶/亲属号码
        try {
            var x2 = new XMLHttpRequest();
            x2.open('POST', '/ares-web/recall/baseinfo/query2', false);
            x2.setRequestHeader('token', TOKEN);
            x2.setRequestHeader('Content-Type', 'application/json');
            x2.send(JSON.stringify({applyNo: applyNo}));
            var d2 = JSON.parse(x2.responseText);
            if (d2.data) {
                [d2.data.partnerList || [], d2.data.relativesList || []].forEach(function(l) {
                    l.forEach(function(c) {
                        if (c.phoneNumber && c.plaintextPhoneNumber) {
                            maskedToReal[c.phoneNumber] = c.plaintextPhoneNumber;
                        }
                        if (c.plaintextPhoneNumber) {
                            var plain = c.plaintextPhoneNumber;
                            var masked = plain.substring(0, 3) + '****' + plain.substring(7);
                            maskedToReal[masked] = plain;
                        }
                    });
                });
            }
        } catch(e) { console.log('[号码替换] query2异常:', e.message); }

        // API 3: getContact - 所有联系人
        try {
            var x3 = new XMLHttpRequest();
            x3.open('POST', '/ares-web/recall/recallContactInfo/getContact', false);
            x3.setRequestHeader('token', TOKEN);
            x3.setRequestHeader('Content-Type', 'application/json');
            x3.send(JSON.stringify({applyNo: applyNo}));
            var d3 = JSON.parse(x3.responseText);
            if (d3.data && d3.data.items) {
                d3.data.items.forEach(function(c) {
                    if (c.phone && c.plaintextPhone) {
                        maskedToReal[c.phone] = c.plaintextPhone;
                    }
                    if (c.plaintextPhone) {
                        var plain = c.plaintextPhone;
                        var masked = plain.substring(0, 3) + '****' + plain.substring(7);
                        maskedToReal[masked] = plain;
                    }
                });
            }
        } catch(e) { console.log('[号码替换] getContact异常:', e.message); }

        var total = Object.keys(maskedToReal).length;
        if (!total) {
            console.log('[号码替换] 未获取到号码映射');
            return;
        }
        console.log('[号码替换] 获取到', total, '个号码映射');

        var cnt = replaceAll(maskedToReal);
        console.log('[号码替换] 首次替换', cnt, '处');

        startObserver(maskedToReal);
        console.log('[号码替换] 运行中');
    }

    // 监听hash变化
    window.addEventListener('hashchange', function() {
        var applyNo = getApplyNo();
        if (applyNo && applyNo !== currentApplyNo) {
            currentApplyNo = applyNo;
            console.log('[号码替换] 页面切换，applyNo:', applyNo);
            startReplace(applyNo);
        }
    });

    // 初始检测
    var checkInterval = setInterval(function() {
        var applyNo = getApplyNo();
        if (!applyNo) return;
        currentApplyNo = applyNo;
        clearInterval(checkInterval);
        startReplace(applyNo);
    }, 1000);
})();
(function() {
    'use strict';

    console.log('[水印去除] 启动...');

    // 检查水印状态，如果已设置为显示水印则跳过
    if (!WATERMARK_HIDDEN) {
        console.log('[水印去除] 水印已设置为显示模式，跳过隐藏');
        return;
    }

    // 方法1：通过CSS覆盖设置opacity=0（最稳定）
    const style = document.createElement('style');
    style.id = 'watermark-hide-style';
    style.textContent = [
        /* 隐藏fixed+pointer-events:none的元素（水印特征） */
        '[style*="pointer-events: none"][style*="position: fixed"],',
        '[style*="pointer-events:none"][style*="position:fixed"],',
        '[style*="position: fixed"][style*="pointer-events: none"],',
        '[style*="position:fixed"][style*="pointer-events:none"] {',
        '    opacity: 0 !important;',
        '    visibility: hidden !important;',
        '}',
        /* 隐藏水印相关class/id */
        '[class*="watermark"], [class*="water-mark"], [class*="mask-layer"],',
        '[id*="watermark"], [id*="water-mark"], [id*="mask-layer"] {',
        '    opacity: 0 !important;',
        '    visibility: hidden !important;',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // 方法2：拦截getWatermark API（阻止水印重新生成）
    if (window.getWatermark) {
        const originalGetWatermark = window.getWatermark;
        window.getWatermark = function() { return null; };
        console.log('[水印去除] getWatermark API已拦截');
    }

    // 方法3：MutationObserver持续监控（兜底，应对动态刷新）
    var watermarkObserver = null;
    function hideWatermark() {
        document.querySelectorAll('*').forEach(function(el) {
            var s = getComputedStyle(el);
            // 水印特征：fixed定位 + 不可点击 + 有文本内容
            if (s.position === 'fixed' &&
                s.pointerEvents === 'none' &&
                el.innerText &&
                el.innerText.length > 5) {
                el.style.opacity = '0';
            }
        });
    }

    watermarkObserver = new MutationObserver(function(mutations) {
        hideWatermark();
    });

    // 立即执行一次
    hideWatermark();
    console.log('[水印去除] 首次清除完成');

    // 持续监控DOM变化
    watermarkObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log('[水印去除] 已启动持续监控，页面刷新需重新执行');
})();
