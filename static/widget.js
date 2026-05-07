(function() {
    if (window.supportWidget) return;
    
    let currentUser = null;
    let currentTicketId = null;
    let currentView = 'new';
    
    const styles = `
        .support-widget-trigger {
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
            z-index: 1000;
            transition: transform 0.2s;
        }
        .support-widget-trigger:hover { transform: scale(1.05); background: #0056b3; }
        .support-widget-trigger svg { width: 30px; height: 30px; fill: white; }
        .support-widget-panel {
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 450px;
            height: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            display: none;
            flex-direction: column;
            overflow: hidden;
        }
        .support-widget-panel.open { display: flex; }
        .widget-header {
            background: #1a1a2e;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .widget-header h3 { font-size: 18px; }
        .widget-close { cursor: pointer; font-size: 24px; }
        .widget-tabs {
            display: flex;
            border-bottom: 1px solid #e0e0e0;
            background: #fafafa;
        }
        .widget-tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            color: #666;
        }
        .widget-tab.active {
            color: #007bff;
            border-bottom: 2px solid #007bff;
        }
        .widget-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .widget-form-group { margin-bottom: 15px; }
        .widget-form-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            font-weight: 500;
            color: #333;
        }
        .widget-form-group input, .widget-form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        .widget-form-group input:focus, .widget-form-group textarea:focus {
            outline: none;
            border-color: #007bff;
        }
        .widget-form-group textarea { resize: vertical; min-height: 80px; }
        .widget-btn {
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
        .widget-btn:hover { background: #0056b3; }
        .widget-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ticket-item {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            cursor: pointer;
            border-left: 3px solid #007bff;
        }
        .ticket-item:hover { background: #f0f0f0; }
        .ticket-subject { font-weight: 600; font-size: 14px; margin-bottom: 5px; }
        .ticket-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-top: 5px;
        }
        .status-open { background: #ffc107; color: #333; }
        .status-in_progress { background: #17a2b8; color: white; }
        .status-closed { background: #28a745; color: white; }
        .ticket-date { font-size: 11px; color: #999; margin-top: 5px; }
        .message-item { margin-bottom: 15px; padding: 10px; border-radius: 8px; }
        .message-user { background: #e3f2fd; margin-left: 20px; }
        .message-support { background: #f1f3f5; margin-right: 20px; border-left: 3px solid #28a745; }
        .message-header { font-size: 11px; color: #666; margin-bottom: 5px; }
        .message-text { font-size: 14px; line-height: 1.4; }
        .back-btn {
            background: none;
            border: none;
            color: #007bff;
            cursor: pointer;
            margin-bottom: 15px;
            font-size: 14px;
        }
        .back-btn:hover { text-decoration: underline; }
        .alert-message {
            position: fixed;
            bottom: 650px;
            right: 30px;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 1100;
            animation: slideIn 0.3s ease;
        }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .reply-area { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; }
    `;
    
    const widgetHTML = `
        <div class="support-widget-trigger" id="widgetTrigger">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <div class="support-widget-panel" id="widgetPanel">
            <div class="widget-header">
                <h3>Поддержка</h3>
                <span class="widget-close" id="widgetClose">&times;</span>
            </div>
            <div class="widget-tabs" id="widgetTabs">
                <button class="widget-tab" data-view="new">Новое</button>
                <button class="widget-tab" data-view="list">Мои обращения</button>
            </div>
            <div class="widget-content" id="widgetContent"></div>
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
            document.getElementById('widgetTrigger').onclick = () => this.open();
            document.getElementById('widgetClose').onclick = () => this.close();
            
            document.querySelectorAll('.widget-tab').forEach(tab => {
                tab.onclick = (e) => {
                    const view = e.target.dataset.view;
                    this.switchView(view);
                };
            });
        }
        
        open() {
            document.getElementById('widgetPanel').classList.add('open');
        }
        
        close() {
            document.getElementById('widgetPanel').classList.remove('open');
        }
        
        async checkAuth() {
            try {
                const res = await fetch('/api/user', { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    document.getElementById('widgetTrigger').style.display = 'flex';
                    this.switchView('new');
                } else {
                    document.getElementById('widgetTrigger').style.display = 'none';
                }
            } catch(e) {
                document.getElementById('widgetTrigger').style.display = 'none';
            }
        }
        
        switchView(view) {
            currentView = view;
            document.querySelectorAll('.widget-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === view);
            });
            
            if (view === 'new') this.showNewTicketForm();
            if (view === 'list') this.loadTickets();
        }
        
        showNewTicketForm() {
            const content = document.getElementById('widgetContent');
            content.innerHTML = `
                <form id="newTicketForm">
                    <div class="widget-form-group">
                        <label>Ваше имя</label>
                        <input type="text" id="ticketName" required>
                    </div>
                    <div class="widget-form-group">
                        <label>Тема</label>
                        <input type="text" id="ticketSubject" required>
                    </div>
                    <div class="widget-form-group">
                        <label>Сообщение</label>
                        <textarea id="ticketMessage" required></textarea>
                    </div>
                    <button type="submit" class="widget-btn" id="submitBtn">Отправить</button>
                </form>
            `;
            document.getElementById('newTicketForm').onsubmit = (e) => this.createTicket(e);
        }
        
        async createTicket(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const name = document.getElementById('ticketName').value;
            const subject = document.getElementById('ticketSubject').value;
            const message = document.getElementById('ticketMessage').value;
            
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
                    document.getElementById('newTicketForm')?.reset();
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
            const content = document.getElementById('widgetContent');
            content.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка...</div>';
            
            try {
                const res = await fetch('/api/tickets', { credentials: 'include' });
                const tickets = await res.json();
                
                if (!tickets.length) {
                    content.innerHTML = '<div style="text-align:center;padding:20px;">У вас пока нет обращений</div>';
                    return;
                }
                
                content.innerHTML = tickets.map(ticket => `
                    <div class="ticket-item" onclick="window.supportWidget.viewTicket(${ticket.id})">
                        <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                        <div class="ticket-status status-${ticket.status}">
                            ${this.getStatusText(ticket.status)}
                        </div>
                        <div class="ticket-date">${new Date(ticket.created_at).toLocaleString()}</div>
                        ${ticket.support_replies > 0 ? '<div style="font-size:11px;color:#28a745;margin-top:5px;">Есть новые ответы</div>' : ''}
                    </div>
                `).join('');
            } catch(e) {
                content.innerHTML = '<div style="text-align:center;padding:20px;">Ошибка загрузки</div>';
            }
        }
        
        async viewTicket(ticketId) {
            currentTicketId = ticketId;
            const content = document.getElementById('widgetContent');
            content.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка...</div>';
            
            try {
                const ticketsRes = await fetch('/api/tickets', { credentials: 'include' });
                const tickets = await ticketsRes.json();
                const ticket = tickets.find(t => t.id === ticketId);
                
                const repliesRes = await fetch(`/api/tickets/${ticketId}/replies`, { credentials: 'include' });
                const replies = await repliesRes.json();
                
                content.innerHTML = `
                    <button class="back-btn" onclick="window.supportWidget.loadTickets()">← Назад</button>
                    <div style="margin-bottom:15px;">
                        <h4>${this.escapeHtml(ticket.subject)}</h4>
                        <div class="ticket-status status-${ticket.status}">${this.getStatusText(ticket.status)}</div>
                        <div class="ticket-date">Создано: ${new Date(ticket.created_at).toLocaleString()}</div>
                    </div>
                    <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:15px;">
                        <strong>Ваше сообщение:</strong>
                        <div style="margin-top:8px;">${this.escapeHtml(ticket.message)}</div>
                    </div>
                    <div id="repliesList"></div>
                    <div class="reply-area">
                        <div class="widget-form-group">
                            <label>Ваш ответ</label>
                            <textarea id="replyMessage" rows="3" placeholder="Напишите ответ..."></textarea>
                        </div>
                        <button class="widget-btn" onclick="window.supportWidget.sendReply()">Отправить ответ</button>
                    </div>
                `;
                
                const repliesContainer = document.getElementById('repliesList');
                if (replies.length === 0) {
                    repliesContainer.innerHTML = '<p style="color:#999;font-size:13px;">Нет ответов от поддержки</p>';
                } else {
                    repliesContainer.innerHTML = replies.map(r => `
                        <div class="message-item ${r.is_from_support ? 'message-support' : 'message-user'}">
                            <div class="message-header">
                                <strong>${this.escapeHtml(r.username)}</strong> 
                                ${r.is_from_support ? '(Поддержка)' : '(Вы)'} · 
                                ${new Date(r.created_at).toLocaleString()}
                            </div>
                            <div class="message-text">${this.escapeHtml(r.message)}</div>
                        </div>
                    `).join('');
                }
            } catch(e) {
                content.innerHTML = '<div style="text-align:center;padding:20px;">Ошибка загрузки</div>';
            }
        }
        
        async sendReply() {
            const message = document.getElementById('replyMessage')?.value;
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
            div.className = `alert-message alert-${type}`;
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