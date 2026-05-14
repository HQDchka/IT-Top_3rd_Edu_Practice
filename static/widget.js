(function() {
    if (window.supportWidget) return;
    
    let currentUser = null;
    let currentTicketId = null;
    let currentView = 'new';
    
    const styles = `
        .ws-widget-trigger {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
            transition: transform 0.2s;
        }
        .ws-widget-trigger:hover { transform: scale(1.05); background: #0056b3; }
        .ws-widget-trigger svg { width: 30px; height: 30px; fill: white; }
        .ws-widget-panel {
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 450px;
            height: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ws-widget-panel.open { display: flex; }
        .ws-widget-header {
            background: #1a1a2e;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ws-widget-header h3 { margin: 0; font-size: 18px; font-weight: 500; }
        .ws-widget-close { cursor: pointer; font-size: 24px; line-height: 1; }
        .ws-widget-tabs {
            display: flex;
            border-bottom: 1px solid #e0e0e0;
            background: #fafafa;
        }
        .ws-widget-tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            color: #666;
        }
        .ws-widget-tab.active { color: #007bff; border-bottom: 2px solid #007bff; }
        .ws-widget-content { flex: 1; overflow-y: auto; padding: 20px; }
        .ws-form-group { margin-bottom: 15px; }
        .ws-form-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            font-weight: 500;
            color: #333;
        }
        .ws-form-group input, .ws-form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }
        .ws-form-group input:focus, .ws-form-group textarea:focus {
            outline: none;
            border-color: #007bff;
        }
        .ws-form-group textarea { resize: vertical; min-height: 80px; }
        .ws-btn {
            width: 100%;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .ws-btn:hover { background: #0056b3; }
        .ws-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ws-ticket-item {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            cursor: pointer;
            border-left: 3px solid #007bff;
        }
        .ws-ticket-item:hover { background: #f0f0f0; }
        .ws-ticket-subject { font-weight: 600; font-size: 14px; margin-bottom: 5px; color: #333; }
        .ws-ticket-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        .ws-status-open { background: #ffc107; color: #333; }
        .ws-status-in_progress { background: #17a2b8; color: white; }
        .ws-status-closed { background: #28a745; color: white; }
        .ws-ticket-date { font-size: 11px; color: #999; margin-top: 5px; }
        .ws-message-item { margin-bottom: 15px; padding: 10px; border-radius: 8px; }
        .ws-message-user { background: #e3f2fd; margin-left: 20px; }
        .ws-message-support { background: #f1f3f5; margin-right: 20px; border-left: 3px solid #28a745; }
        .ws-message-header { font-size: 11px; color: #666; margin-bottom: 5px; }
        .ws-message-text { font-size: 14px; line-height: 1.4; }
        .ws-back-btn {
            background: none;
            border: none;
            color: #007bff;
            cursor: pointer;
            margin-bottom: 15px;
            font-size: 14px;
            padding: 0;
        }
        .ws-back-btn:hover { text-decoration: underline; }
        .ws-alert {
            position: fixed;
            bottom: 650px;
            right: 30px;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 10000;
            animation: wsSlideIn 0.3s ease;
        }
        .ws-alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .ws-alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        @keyframes wsSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .ws-reply-area { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; }
        .ws-loading { text-align: center; padding: 20px; color: #666; }
        .ws-badge { display: inline-block; font-size: 11px; color: #28a745; margin-top: 5px; }
    `;
    
    const widgetHTML = `
        <div class="ws-widget-trigger" id="wsWidgetTrigger">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <div class="ws-widget-panel" id="wsWidgetPanel">
            <div class="ws-widget-header">
                <h3>Поддержка</h3>
                <span class="ws-widget-close" id="wsWidgetClose">&times;</span>
            </div>
            <div class="ws-widget-tabs" id="wsWidgetTabs">
                <button class="ws-widget-tab" data-view="new">Новое</button>
                <button class="ws-widget-tab" data-view="list">Мои обращения</button>
            </div>
            <div class="ws-widget-content" id="wsWidgetContent"></div>
        </div>
    `;
    
    class SupportWidget {
        constructor() {
            this.init();
        }
        
        init() {
            const style = document.createElement('style');
            style.textContent = styles;
            document.head.appendChild(style);
            
            const div = document.createElement('div');
            div.id = 'supportWidgetRoot';
            div.innerHTML = widgetHTML;
            document.body.appendChild(div);
            
            this.bindEvents();
            this.checkAuth();
        }
        
        bindEvents() {
            document.getElementById('wsWidgetTrigger').onclick = () => this.open();
            document.getElementById('wsWidgetClose').onclick = () => this.close();
            
            document.querySelectorAll('.ws-widget-tab').forEach(tab => {
                tab.onclick = (e) => {
                    const view = e.target.dataset.view;
                    this.switchView(view);
                };
            });
        }
        
        open() {
            document.getElementById('wsWidgetPanel').classList.add('open');
        }
        
        close() {
            document.getElementById('wsWidgetPanel').classList.remove('open');
        }
        
        async checkAuth() {
            try {
                const res = await fetch('/api/user', { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    document.getElementById('wsWidgetTrigger').style.display = 'flex';
                    this.switchView('new');
                } else {
                    document.getElementById('wsWidgetTrigger').style.display = 'none';
                }
            } catch(e) {
                document.getElementById('wsWidgetTrigger').style.display = 'none';
            }
        }
        
        switchView(view) {
            currentView = view;
            document.querySelectorAll('.ws-widget-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === view);
            });
            
            if (view === 'new') this.showNewTicketForm();
            if (view === 'list') this.loadTickets();
        }
        
        showNewTicketForm() {
            const content = document.getElementById('wsWidgetContent');
            content.innerHTML = `
                <form id="wsNewTicketForm">
                    <div class="ws-form-group">
                        <label>Ваше имя</label>
                        <input type="text" id="wsTicketName" required>
                    </div>
                    <div class="ws-form-group">
                        <label>Тема</label>
                        <input type="text" id="wsTicketSubject" required>
                    </div>
                    <div class="ws-form-group">
                        <label>Сообщение</label>
                        <textarea id="wsTicketMessage" required></textarea>
                    </div>
                    <button type="submit" class="ws-btn" id="wsSubmitBtn">Отправить</button>
                </form>
            `;
            document.getElementById('wsNewTicketForm').onsubmit = (e) => this.createTicket(e);
        }
        
        async createTicket(e) {
            e.preventDefault();
            const btn = document.getElementById('wsSubmitBtn');
            const name = document.getElementById('wsTicketName').value;
            const subject = document.getElementById('wsTicketSubject').value;
            const message = document.getElementById('wsTicketMessage').value;
            
            if (!name || !subject || !message) {
                this.showAlert('Заполните все поля', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'Отправка...';
            
            try {
                const res = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, subject, message }),
                    credentials: 'include'
                });
                
                if (res.ok) {
                    this.showAlert('Обращение отправлено!', 'success');
                    document.getElementById('wsNewTicketForm')?.reset();
                    this.switchView('list');
                } else {
                    this.showAlert('Ошибка отправки', 'error');
                }
            } catch(e) {
                this.showAlert('Ошибка соединения', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Отправить';
            }
        }
        
        async loadTickets() {
            const content = document.getElementById('wsWidgetContent');
            content.innerHTML = '<div class="ws-loading">Загрузка...</div>';
            
            try {
                const res = await fetch('/api/tickets', { credentials: 'include' });
                const tickets = await res.json();
                
                if (!tickets.length) {
                    content.innerHTML = '<div class="ws-loading">У вас пока нет обращений</div>';
                    return;
                }
                
                content.innerHTML = tickets.map(ticket => `
                    <div class="ws-ticket-item" onclick="window.supportWidget.viewTicket(${ticket.id})">
                        <div class="ws-ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                        <div class="ws-ticket-status ws-status-${ticket.status}">
                            ${this.getStatusText(ticket.status)}
                        </div>
                        <div class="ws-ticket-date">${new Date(ticket.created_at).toLocaleString()}</div>
                        ${ticket.support_replies > 0 ? '<div class="ws-badge">Есть новые ответы</div>' : ''}
                    </div>
                `).join('');
            } catch(e) {
                content.innerHTML = '<div class="ws-loading">Ошибка загрузки</div>';
            }
        }
        
        async viewTicket(ticketId) {
            currentTicketId = ticketId;
            const content = document.getElementById('wsWidgetContent');
            content.innerHTML = '<div class="ws-loading">Загрузка...</div>';
            
            try {
                const ticketsRes = await fetch('/api/tickets', { credentials: 'include' });
                const tickets = await ticketsRes.json();
                const ticket = tickets.find(t => t.id === ticketId);
                
                const repliesRes = await fetch(`/api/tickets/${ticketId}/replies`, { credentials: 'include' });
                const replies = await repliesRes.json();
                
                content.innerHTML = `
                    <button class="ws-back-btn" onclick="window.supportWidget.loadTickets()">← Назад</button>
                    <div style="margin-bottom:15px;">
                        <h4>${this.escapeHtml(ticket.subject)}</h4>
                        <div class="ws-ticket-status ws-status-${ticket.status}">${this.getStatusText(ticket.status)}</div>
                        <div class="ws-ticket-date">Создано: ${new Date(ticket.created_at).toLocaleString()}</div>
                    </div>
                    <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:15px;">
                        <strong>Ваше сообщение:</strong>
                        <div style="margin-top:8px;">${this.escapeHtml(ticket.message)}</div>
                    </div>
                    <div id="wsRepliesList"></div>
                    <div class="ws-reply-area">
                        <div class="ws-form-group">
                            <label>Ваш ответ</label>
                            <textarea id="wsReplyMessage" rows="3" placeholder="Напишите ответ..."></textarea>
                        </div>
                        <button class="ws-btn" onclick="window.supportWidget.sendReply()">Отправить ответ</button>
                    </div>
                `;
                
                const repliesContainer = document.getElementById('wsRepliesList');
                if (!replies || replies.length === 0) {
                    repliesContainer.innerHTML = '<p style="color:#999;font-size:13px;">Нет ответов от поддержки</p>';
                } else {
                    repliesContainer.innerHTML = replies.map(r => `
                        <div class="ws-message-item ${r.is_from_support ? 'ws-message-support' : 'ws-message-user'}">
                            <div class="ws-message-header">
                                <strong>${this.escapeHtml(r.username)}</strong> 
                                ${r.is_from_support ? '(Поддержка)' : '(Вы)'} · 
                                ${new Date(r.created_at).toLocaleString()}
                            </div>
                            <div class="ws-message-text">${this.escapeHtml(r.message)}</div>
                        </div>
                    `).join('');
                }
            } catch(e) {
                content.innerHTML = '<div class="ws-loading">Ошибка загрузки</div>';
            }
        }
        
        async sendReply() {
            const message = document.getElementById('wsReplyMessage')?.value;
            if (!message) {
                this.showAlert('Введите сообщение', 'error');
                return;
            }
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Отправка...';
            
            try {
                const res = await fetch(`/api/tickets/${currentTicketId}/replies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message }),
                    credentials: 'include'
                });
                
                if (res.ok) {
                    this.showAlert('Сообщение отправлено', 'success');
                    this.viewTicket(currentTicketId);
                } else {
                    this.showAlert('Ошибка отправки', 'error');
                }
            } catch(e) {
                this.showAlert('Ошибка соединения', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Отправить ответ';
            }
        }
        
        getStatusText(status) {
            const statuses = { 'open': 'Открыто', 'in_progress': 'В работе', 'closed': 'Закрыто' };
            return statuses[status] || status;
        }
        
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        showAlert(msg, type) {
            const div = document.createElement('div');
            div.className = `ws-alert ws-alert-${type}`;
            div.textContent = msg;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 3000);
        }
    }
    
    window.supportWidget = null;
    document.addEventListener('DOMContentLoaded', () => {
        window.supportWidget = new SupportWidget();
    });
})();