// iOS 17风格理财记录应用 - JavaScript核心功能

// 全局状态
let displayedYear, displayedMonth; // 当前显示的年份和月份（0-based）
let currentView = 'day'; // 当前视图：'day', 'month', 'year'
let selectedDate = null; // 当前选中的日期（YYYY-MM-DD格式）

// 数据管理函数
function loadData() {
    const raw = localStorage.getItem('financeRecords');
    return raw ? JSON.parse(raw) : {};
}

function saveData(data) {
    localStorage.setItem('financeRecords', JSON.stringify(data));
}

// 日期格式化辅助函数
function formatDateForDisplay(dateStr) {
    // 将 YYYY-MM-DD 转换为 YYYY/MM/DD
    return dateStr.replace(/-/g, '/');
}

function formatDateForInput(dateStr) {
    // 确保日期格式为 YYYY-MM-DD
    return dateStr;
}

function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 更新统计信息
function updateSummary(year = null, month = null) {
    const data = loadData();
    const now = new Date();

    if (year === null) year = now.getFullYear();
    if (month === null) month = now.getMonth(); // 0-based

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    let monthTotal = 0, yearTotal = 0;

    Object.entries(data).forEach(([date, record]) => {
        const amount = (record.alipay || 0) + (record.stock || 0);

        if (date.startsWith(monthKey)) {
            monthTotal += amount;
        }

        if (date.startsWith(String(year))) {
            yearTotal += amount;
        }
    });

    // 更新显示
    document.getElementById('monthTotal').textContent = `¥${monthTotal.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    document.getElementById('yearTotal').textContent = `¥${yearTotal.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// 生成日历
function generateCalendar(year = null, month = null) {
    const now = new Date();

    if (year === null) year = now.getFullYear();
    if (month === null) month = now.getMonth();

    displayedYear = year;
    displayedMonth = month;

    const data = loadData();

    // 更新日历标题
    const titleEl = document.getElementById('calendarTitle');
    const dateDisplay = document.getElementById('displayDateText');

    if (currentView === 'day') {
        titleEl.textContent = `${year}年 ${month + 1}月`;
        dateDisplay.textContent = formatDateForDisplay(getCurrentDate());
    } else if (currentView === 'month') {
        titleEl.textContent = `${year}年`;
    } else if (currentView === 'year') {
        titleEl.textContent = '年份';
    }

    const calendarContainer = document.querySelector('.calendar-container');

    if (currentView === 'day') {
        // 确保容器中有表格
        if (!calendarContainer.querySelector('#calendar')) {
            calendarContainer.innerHTML = '<table id="calendar"></table>';
        }

        generateDayView(year, month, data, calendarContainer);
    } else if (currentView === 'month') {
        generateMonthView(year, data, calendarContainer);
    } else if (currentView === 'year') {
        generateYearView(data, calendarContainer);
    }

    updateSummary(year, month);
}

// 生成日视图
function generateDayView(year, month, data, container) {
    const table = container.querySelector('#calendar');
    table.innerHTML = '';

    // 创建表头
    const headerRow = document.createElement('tr');
    ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 计算第一天是星期几
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0 = 星期日

    // 计算当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let currentRow = document.createElement('tr');
    let dayCount = 0;

    // 添加空白单元格
    for (let i = 0; i < startWeekday; i++) {
        currentRow.appendChild(document.createElement('td'));
        dayCount++;
    }

    // 添加日期单元格
    for (let day = 1; day <= daysInMonth; day++) {
        if (dayCount % 7 === 0 && dayCount > 0) {
            table.appendChild(currentRow);
            currentRow = document.createElement('tr');
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = createDayCell(day, dateStr, data);
        currentRow.appendChild(cell);
        dayCount++;
    }

    // 补充空白单元格
    while (dayCount % 7 !== 0) {
        currentRow.appendChild(document.createElement('td'));
        dayCount++;
    }

    if (currentRow.children.length > 0) {
        table.appendChild(currentRow);
    }
}

// 创建日期单元格
function createDayCell(day, dateStr, data) {
    const cell = document.createElement('td');
    cell.textContent = day;

    // 添加收益信息
    if (data[dateStr]) {
        const amount = (data[dateStr].alipay || 0) + (data[dateStr].stock || 0);
        if (amount !== 0) {
            const amountSpan = document.createElement('span');
            amountSpan.className = amount > 0 ? 'amount positive' : 'amount negative';
            amountSpan.textContent = `${amount > 0 ? '+' : ''}${amount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            cell.appendChild(amountSpan);
        }
    }

    // 点击事件
    cell.addEventListener('click', () => {
        selectedDate = dateStr;
        showDetailModal(dateStr);
        // 重新生成日历以更新选中状态
        generateCalendar(displayedYear, displayedMonth);
    });

    // 选中状态
    if (dateStr === selectedDate) {
        cell.classList.add('selected');
    }

    // 今天高亮
    if (dateStr === getCurrentDate()) {
        cell.classList.add('today');
    }

    return cell;
}

// 生成月视图
function generateMonthView(year, data, container) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'month-grid';

    for (let month = 0; month < 12; month++) {
        const cell = document.createElement('div');
        cell.className = 'month-cell';
        cell.textContent = `${month + 1}月`;

        // 计算该月总收益
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        let monthTotal = 0;

        Object.entries(data).forEach(([date, record]) => {
            if (date.startsWith(monthKey)) {
                monthTotal += (record.alipay || 0) + (record.stock || 0);
            }
        });

        if (monthTotal !== 0) {
            const amountSpan = document.createElement('span');
            amountSpan.className = monthTotal > 0 ? 'amount positive' : 'amount negative';
            amountSpan.textContent = `${monthTotal > 0 ? '+' : ''}${monthTotal.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            cell.appendChild(amountSpan);
        }

        cell.addEventListener('click', () => {
            setView('day');
            generateCalendar(year, month);
        });

        grid.appendChild(cell);
    }

    container.appendChild(grid);
}

// 生成年视图
function generateYearView(data, container) {
    container.innerHTML = '';

    // 收集所有有数据的年份
    const yearsSet = new Set();
    Object.keys(data).forEach(date => {
        yearsSet.add(date.split('-')[0]);
    });

    // 如果没有数据，显示最近5年
    if (yearsSet.size === 0) {
        const currentYear = new Date().getFullYear();
        for (let i = -2; i <= 2; i++) {
            yearsSet.add(String(currentYear + i));
        }
    }

    const years = Array.from(yearsSet).sort((a, b) => b - a); // 降序排列

    const grid = document.createElement('div');
    grid.className = 'year-grid';

    years.forEach(year => {
        const cell = document.createElement('div');
        cell.className = 'year-cell';
        cell.textContent = `${year}年`;

        // 计算该年总收益
        let yearTotal = 0;
        Object.entries(data).forEach(([date, record]) => {
            if (date.startsWith(year)) {
                yearTotal += (record.alipay || 0) + (record.stock || 0);
            }
        });

        if (yearTotal !== 0) {
            const amountSpan = document.createElement('span');
            amountSpan.className = yearTotal > 0 ? 'amount positive' : 'amount negative';
            amountSpan.textContent = `${yearTotal > 0 ? '+' : ''}${yearTotal.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            cell.appendChild(amountSpan);
        }

        cell.addEventListener('click', () => {
            setView('month');
            generateCalendar(parseInt(year, 10), 0);
        });

        grid.appendChild(cell);
    });

    container.appendChild(grid);
}

// 显示详情模态框
function showDetailModal(dateStr) {
    const data = loadData();
    const record = data[dateStr] || { alipay: 0, stock: 0 };

    // 更新模态框内容
    document.getElementById('modalDate').textContent = formatDateForDisplay(dateStr);
    document.getElementById('modalAlipayInput').value = record.alipay || 0;
    document.getElementById('modalStockInput').value = record.stock || 0;

    // 设置删除按钮事件
    document.getElementById('deleteRecord').onclick = () => {
        if (confirm(`确定要删除 ${formatDateForDisplay(dateStr)} 的记录吗？`)) {
            delete data[dateStr];
            saveData(data);
            generateCalendar(displayedYear, displayedMonth);
            closeModal();
        }
    };

    // 设置保存按钮事件
    document.getElementById('saveModal').onclick = () => {
        const alipay = parseFloat(document.getElementById('modalAlipayInput').value) || 0;
        const stock = parseFloat(document.getElementById('modalStockInput').value) || 0;

        data[dateStr] = { alipay, stock };
        saveData(data);
        generateCalendar(displayedYear, displayedMonth);
        closeModal();
    };

    // 显示模态框
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// 视图切换
function setView(view) {
    currentView = view;

    // 更新按钮状态
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // 重新生成日历
    generateCalendar(displayedYear, displayedMonth);
}

// 导航功能
function prevMonth() {
    let year = displayedYear;
    let month = displayedMonth;

    if (currentView === 'day') {
        month--;
        if (month < 0) {
            month = 11;
            year--;
        }
    } else if (currentView === 'month') {
        year--;
    } else if (currentView === 'year') {
        year--;
    }

    generateCalendar(year, month);
}

function nextMonth() {
    let year = displayedYear;
    let month = displayedMonth;

    if (currentView === 'day') {
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    } else if (currentView === 'month') {
        year++;
    } else if (currentView === 'year') {
        year++;
    }

    generateCalendar(year, month);
}

// 保存收益记录
function saveRecord() {
    const dateInput = document.getElementById('datePicker').value;
    if (!dateInput) {
        alert('请选择日期');
        return;
    }

    const alipay = parseFloat(document.getElementById('alipay').value) || 0;
    const stock = parseFloat(document.getElementById('stock').value) || 0;

    if (alipay === 0 && stock === 0) {
        alert('请输入至少一项收益');
        return;
    }

    const data = loadData();
    data[dateInput] = { alipay, stock };
    saveData(data);

    // 清空输入框
    document.getElementById('alipay').value = '';
    document.getElementById('stock').value = '';

    // 更新日历
    generateCalendar(displayedYear, displayedMonth);

    // 显示成功提示
    showToast('收益记录已保存');
}

// 导出CSV
function exportToCSV() {
    const data = loadData();

    if (Object.keys(data).length === 0) {
        alert('没有可导出的数据');
        return;
    }

    let csv = '日期,支付宝收益,股票收益,总收益\n';

    // 按日期排序
    const sortedDates = Object.keys(data).sort();

    sortedDates.forEach(date => {
        const record = data[date];
        const total = (record.alipay || 0) + (record.stock || 0);
        csv += `${date},${record.alipay || 0},${record.stock || 0},${total}\n`;
    });

    // 创建下载链接
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `理财记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('数据已导出为CSV文件');
}

// 导入CSV
function importFromCSV(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        const data = loadData();
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) { // 跳过标题行
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length < 3) continue;

            const date = parts[0].trim();
            const alipay = parseFloat(parts[1]) || 0;
            const stock = parseFloat(parts[2]) || 0;

            if (date && (alipay > 0 || stock > 0)) {
                data[date] = { alipay, stock };
                importedCount++;
            }
        }

        saveData(data);
        generateCalendar(displayedYear, displayedMonth);

        showToast(`成功导入 ${importedCount} 条记录`);
    };

    reader.readAsText(file);
}

// 清除所有数据
function clearAllData() {
    if (confirm('确定要清除所有数据吗？此操作不可撤销。')) {
        localStorage.removeItem('financeRecords');
        selectedDate = null;
        generateCalendar(new Date().getFullYear(), new Date().getMonth());
        showToast('所有数据已清除');
    }
}

// 显示Toast提示
function showToast(message) {
    // 移除已有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    // 添加样式
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--ios-surface);
        color: var(--ios-label);
        padding: 12px 20px;
        border-radius: var(--ios-radius-medium);
        box-shadow: var(--ios-shadow);
        z-index: 2000;
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: var(--ios-blur);
        -webkit-backdrop-filter: var(--ios-blur);
        animation: toastFadeIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 添加Toast动画样式
function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastFadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes toastFadeOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }

        .today {
            background-color: rgba(0, 122, 255, 0.1) !important;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
}

// 初始化应用
function initApp() {
    // 添加Toast样式
    addToastStyles();

    // 设置默认日期
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // 初始化日历
    generateCalendar(year, month);

    // 绑定事件监听器
    document.getElementById('saveBtn').addEventListener('click', saveRecord);
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('importCsv').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importFromCSV(file);
            // 清空文件输入，以便可以再次选择同一文件
            e.target.value = '';
        }
    });
    document.getElementById('clearAll').addEventListener('click', clearAllData);

    document.getElementById('prevMonth').addEventListener('click', prevMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);

    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    document.getElementById('closeModal').addEventListener('click', closeModal);

    // 点击模态框外部关闭
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    // 输入框回车保存
    document.getElementById('alipay').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRecord();
    });

    document.getElementById('stock').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRecord();
    });

    // 模态框输入框回车保存
    document.getElementById('modalAlipayInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('saveModal').click();
    });

    document.getElementById('modalStockInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('saveModal').click();
    });

    // 显示初始化提示
    setTimeout(() => {
        const data = loadData();
        if (Object.keys(data).length === 0) {
            showToast('欢迎使用理财记录应用！');
        }
    }, 1000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);