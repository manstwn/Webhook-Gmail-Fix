
const app = document.getElementById('app');

// --- API Client ---

async function api(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`/api${endpoint}`, options);

    if (res.status === 401) {
        navigate('/login');
        return null;
    }

    return res;
}

async function checkAuth() {
    const res = await api('/auth/check');
    if (!res) return false;
    const data = await res.json();
    return data.authenticated;
}

// --- Config & Router ---

let CONFIG = { host: '' };

async function init() {
    const res = await api('/config');
    if (res && res.ok) CONFIG = await res.json();
    router();
}

window.navigate = async (path) => {
    history.pushState(null, '', path);
    router();
};

async function router() {
    const path = window.location.pathname;

    if (path === '/login') {
        renderLogin();
        return;
    }

    const isAuth = await checkAuth();
    if (!isAuth) {
        history.replaceState(null, '', '/login');
        renderLogin();
        return;
    }

    if (path === '/' || path === '/dashboard') {
        renderDashboard();
    } else if (path.startsWith('/webhook/')) {
        const id = path.split('/')[2];
        if (id === 'new') {
            createWebhook();
        } else {
            renderWebhookEditor(id);
        }
    } else if (path === '/email-park') {
        renderEmailPark();
    } else {
        renderDashboard();
    }
}

window.addEventListener('popstate', router);
window.addEventListener('load', init);

// --- Views ---

function renderLogin() {
    app.innerHTML = `
        <div class="login-screen">
            <div class="card login-card">
                <i class="fas fa-bolt icon-lg" style="color: var(--primary)"></i>
                <h1>Webhook Mailer</h1>
                <p>Self-hosted notification system</p>
                <form id="login-form">
                    <div class="form-group">
                        <input type="password" id="pin" placeholder="Enter PIN" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%">Login</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const pin = document.getElementById('pin').value;
        const res = await api('/login', 'POST', { pin });
        if (res && res.ok) {
            navigate('/dashboard');
        } else {
            showToast('Invalid PIN', 'error');
        }
    };
}

async function renderDashboard() {
    const res = await api('/dashboard');
    const data = await res.json();

    const webhooksRes = await api('/webhooks');
    const webhooks = await webhooksRes.json();

    app.innerHTML = `
        <nav class="nav">
            <div class="nav-logo"><i class="fas fa-bolt"></i> Webhook Mailer</div>
            <div class="nav-links">
                <div class="nav-item active">Dashboard</div>
                <div class="nav-item" onclick="navigate('/email-park')">Email Park</div>
                <div class="nav-item" onclick="logout()">Logout</div>
            </div>
        </nav>
        
        <div class="container">
            <div class="grid">
                <div class="card">
                    <h3>Active Webhooks</h3>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--success)">
                        ${data.activeWebhooks} / ${data.totalWebhooks}
                    </div>
                </div>
                <div class="card" onclick="navigate('/webhook/new')" style="cursor: pointer; border-style: dashed; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <i class="fas fa-plus" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--primary)"></i>
                    <div class="btn btn-primary">Create Webhook</div>
                </div>
            </div>
            
            <h2 style="margin-top: 2rem">Your Webhooks</h2>
            <div class="grid" id="webhook-list">
                <!-- Render webhooks here -->
            </div>
        </div>
    `;

    const list = document.getElementById('webhook-list');
    if (webhooks.length === 0) {
        list.innerHTML = `<div class="empty-state" style="grid-column: 1/-1">No webhooks found. Create one to get started.</div>`;
    } else {
        webhooks.forEach(w => {
            const statusClass = w.status === 'Active' ? 'status-active' : 'status-draft';
            list.innerHTML += `
                <div class="card" onclick="navigate('/webhook/${w.id}')" style="cursor: pointer">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem">
                        <span class="status-pill ${statusClass}">${w.status}</span>
                        <span style="color: var(--text-muted); font-size: 0.8rem"><i class="far fa-clock"></i> ${new Date(w.created).toLocaleDateString()}</span>
                    </div>
                    <h4>${w.name}</h4>
                    <p style="font-size: 0.85rem; margin-bottom: 0;">${w.lastPayload ? '<i class="fas fa-check-circle" style="color: var(--success)"></i> Data Received' : '<i class="fas fa-circle-notch" style="color: var(--warning)"></i> Waiting for data'}</p>
                </div>
            `;
        });
    }
}

async function renderEmailPark() {
    const res = await api('/email-park');
    const senders = await res.json();

    app.innerHTML = `
        <nav class="nav">
            <div class="nav-logo" onclick="navigate('/dashboard')" style="cursor: pointer"><i class="fas fa-bolt"></i> Webhook Mailer</div>
            <div class="nav-links">
                <div class="nav-item" onclick="navigate('/dashboard')">Dashboard</div>
                <div class="nav-item active">Email Park</div>
                <div class="nav-item" onclick="logout()">Logout</div>
            </div>
        </nav>
        
        <div class="container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
                <h1>Email Park</h1>
                <button class="btn btn-primary" onclick="openSenderModal()">Add Sender</button>
            </div>
            
            <div class="grid" id="sender-list"></div>
        </div>
        
        <!-- Modal for adding sender will be dynamic -->
        <div id="modal-container"></div>
    `;

    const list = document.getElementById('sender-list');

    senders.forEach(s => {
        list.innerHTML += `
            <div class="card">
                <h3>${s.name}</h3>
                <p><strong>From:</strong> ${s.fromName} &lt;${s.fromEmail}&gt;</p>
                <p><strong>Host:</strong> ${s.host}:${s.port}</p>
                <div style="margin-top: 1rem">
                    <button class="btn btn-danger btn-sm" onclick="deleteSender('${s.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

async function createWebhook() {
    const name = prompt("Enter Webhook Name:");
    if (!name) {
        navigate('/dashboard');
        return;
    }

    const res = await api('/webhooks', 'POST', { name });
    if (res.ok) {
        const w = await res.json();
        navigate(`/webhook/${w.id}`);
    }
}

window.renderWebhookEditor = async (id) => {
    const res = await api(`/webhooks/${id}`);
    if (!res.ok) {
        navigate('/dashboard');
        return;
    }
    const webhook = await res.json();

    // Ensure activePayload is set correctly based on selectedPayloadId
    let activePayload = webhook.activePayload;

    const parkRes = await api('/email-park');
    const senders = await parkRes.json();

    const logsRes = await api(`/webhooks/${id}/logs`);
    const logs = await logsRes.json();

    app.innerHTML = `
        <nav class="nav">
            <div class="nav-logo" onclick="navigate('/dashboard')" style="cursor: pointer"><i class="fas fa-bolt"></i> Webhook Mailer</div>
            <div class="nav-links">
                <div class="nav-item active">Editor</div>
                <div class="nav-item" onclick="deleteWebhook('${id}')" style="color: var(--danger)">Delete Webhook</div>
            </div>
        </nav>
        
        <div class="container editor-layout">
            
            <div style="grid-column: 1 / -1; margin-bottom: 1rem;">
                <div class="card">
                     <div class="form-group" style="margin-bottom: 0">
                        <label>Webhook Name</label>
                        <div style="display: flex; gap: 0.5rem">
                            <input type="text" id="webhook-name" value="${webhook.name}" style="flex: 1">
                            <button class="btn btn-primary" onclick="saveWebhookName('${id}')">Save Name</button>
                        </div>
                     </div>
                </div>
            </div>

            <!-- Left Column: Config & State -->
            <div class="steps">
                
                <!-- Step 1: Info -->
                <div class="card step-card">
                    <div class="step-header">
                        <h3>1. Webhook Endpoint</h3>
                        <span class="badge">Live</span>
                    </div>
                    <p>Send a POST request with JSON body to:</p>
                    <div class="code-block" style="margin-bottom: 1rem">
                        ${CONFIG.host || window.location.origin}/webhooks/${id}
                    </div>
                    <div style="display: flex; gap: 0.5rem">
                         <button class="btn" onclick="copyToClipboard('${CONFIG.host || window.location.origin}/webhooks/${id}')">Copy URL</button>
                         <button class="btn" style="background: var(--warning); border: none" onclick="regenerateWebhookUrl('${id}')">New URL</button>
                    </div>
                </div>

                <!-- Step 2: Payload Management -->
                <div class="card step-card">
                    <div class="step-header" style="flex-wrap: wrap; gap: 0.5rem">
                        <h3>2. Test Data</h3>
                        <button class="btn btn-sm btn-primary" onclick="addManualPayload('${id}')"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-sm" onclick="location.reload()"><i class="fas fa-sync"></i></button>
                    </div>
                    
                    ${webhook.payloads && webhook.payloads.length > 0 ? `
                        <div style="margin-bottom: 1rem; max-height: 150px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
                            ${webhook.payloads.map(p => `
                                <div class="payload-item ${p.id === (activePayload?.id) ? 'active' : ''}" onclick="selectPayload('${id}', '${p.id}')">
                                    <div style="display: flex; justify-content: space-between; align-items: center">
                                        <span style="font-weight: 500">${p.name || 'Untitled'}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-muted)">${new Date(p.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.2rem">
                                        <span class="badge" style="font-size: 0.65rem; background: ${p.source === 'Manual' ? 'var(--secondary)' : 'var(--success)'}">${p.source}</span>
                                        <i class="fas fa-trash" style="font-size: 0.8rem; color: var(--danger); cursor: pointer; padding: 0.2rem" onclick="event.stopPropagation(); deletePayload('${id}', '${p.id}')"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="font-size: 0.85rem; padding: 1rem; text-align: center; border: 1px dashed var(--glass-border); border-radius: var(--radius-sm)">No data received yet.</p>'}

                    ${activePayload ? `
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem"><strong>Active Payload:</strong> ${activePayload.name}</p>
                        <div class="code-block" style="max-height: 200px; overflow-y: auto;">
                            ${JSON.stringify(activePayload.data, null, 2)}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 1rem;">
                            <i class="fas fa-circle-notch" style="color: var(--warning)"></i> Waiting for selection...
                        </div>
                    `}
                </div>
                
                <!-- Step 4: Activation -->
                <div class="card step-card" ${webhook.status === 'Active' ? 'style="border-color: var(--success)"' : ''}>
                    <div class="step-header">
                        <h3>4. Activation</h3>
                        <span class="status-pill ${webhook.status === 'Active' ? 'status-active' : 'status-draft'}">${webhook.status}</span>
                    </div>
                    <p>Once you are happy with the test email, activate this webhook.</p>
                    ${webhook.status === 'Draft' ? `
                        <button class="btn btn-success" style="background: var(--success); border: none" onclick="activateWebhook('${id}')">Activate Webhook</button>
                    ` : `
                        <button class="btn" onclick="deactivateWebhook('${id}')">Deactivate (Switch to Draft)</button>
                    `}
                </div>

            </div>
            
            <!-- Right Column: Email Builder -->
            <!-- Right Column: Email Builder -->
            <div class="email-builder-section">
                <!-- ... Builder UI ... -->
                <div class="card">
                    <h3>3. Email Configuration</h3>
                    ${!activePayload ? '<p style="color: var(--warning)">Select a payload on the left to unlock builder...</p>' : ''}
                    
                    <div style="${!activePayload ? 'opacity: 0.5; pointer-events: none' : ''}">
                        
                        <div class="form-group">
                            <label>Sender (Email Park)</label>
                            <select id="email-sender">
                                <option value="">Select a sender...</option>
                                ${senders.map(s => `<option value="${s.id}" ${webhook.senderId === s.id ? 'selected' : ''}>${s.name} (${s.fromEmail})</option>`).join('')}
                            </select>
                            ${senders.length === 0 ? '<small style="color: var(--warning)">No senders configured. <a href="javascript:void(0)" onclick="navigate(\'/email-park\')">Go to Email Park</a></small>' : ''}
                        </div>
                        
                        <div class="form-group">
                            <label>Available Variables (Click to copy)</label>
                            <div id="variable-list">
                                ${webhook.variables ? webhook.variables.map(v =>
        `<span class="var-pill" onclick="insertVar('{{${v.key}}}')">{{${v.key}}}</span>`
    ).join('') : '<small style="color: var(--text-muted)">No variables found in selected payload</small>'}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>To (Recipient)</label>
                            <input type="text" id="email-to" value="${webhook.emailTemplate?.to || ''}" placeholder="{{email}}">
                        </div>

                        <div class="form-group">
                            <label>Subject</label>
                            <input type="text" id="email-subject" value="${webhook.emailTemplate?.subject || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Body (Plain Text / HTML)</label>
                            <textarea id="email-body">${webhook.emailTemplate?.body || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                             <label><input type="checkbox" id="email-html" ${webhook.emailTemplate?.isHtml ? 'checked' : ''}> Send as HTML</label>
                        </div>

                        <div style="display: flex; gap: 1rem; margin-top: 2rem">
                            <button class="btn" onclick="saveWebhook('${id}')">Save Draft</button>
                            <button class="btn btn-primary" onclick="testEmail('${id}')">Save & Send Test Email</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Automation Logs -->
            <div style="grid-column: 1 / -1; margin-top: 2rem;">
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>Automation Logs</h3>
                        <div style="display: flex; gap: 0.5rem">
                            <button class="btn btn-sm" onclick="window.renderWebhookEditor('${id}')"><i class="fas fa-sync"></i> Refresh</button>
                            <button class="btn btn-sm btn-danger" onclick="clearWebhookLogs('${id}')"><i class="fas fa-trash"></i> Clear</button>
                        </div>
                    </div>
                    
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--glass-border); text-align: left;">
                                    <th style="padding: 0.5rem;">Time</th>
                                    <th style="padding: 0.5rem;">Status</th>
                                    <th style="padding: 0.5rem;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.length > 0 ? logs.map(l => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <td style="padding: 0.5rem;">${new Date(l.timestamp).toLocaleString()}</td>
                                        <td style="padding: 0.5rem;">
                                            <span class="badge" style="background: ${l.emailStatus === 'Sent' ? 'var(--success)' : (l.emailStatus === 'Failed' ? 'var(--danger)' : 'var(--text-muted)')}">
                                                ${l.emailStatus}
                                            </span>
                                        </td>
                                        <td style="padding: 0.5rem;">
                                             <button class="btn btn-sm" onclick="showLogDetails('${l.id}')">View</button>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--text-muted)">No logs found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// New Actions for Payload CRUD
window.selectPayload = async (webhookId, payloadId) => {
    // Just update URL? Or update state via API?
    // User wants "Select". 
    // Let's update backend so it persists as "SelectedPayloadId"
    await api(`/webhooks/${webhookId}`, 'PUT', { selectedPayloadId: payloadId });
    renderWebhookEditor(webhookId);
};

window.deletePayload = async (webhookId, payloadId) => {
    if (!confirm('Delete this test data?')) return;
    await api(`/webhooks/${webhookId}/payloads/${payloadId}`, 'DELETE');
    renderWebhookEditor(webhookId);
};

window.addManualPayload = async (webhookId) => {
    const dataStr = await showPromptModal("Enter JSON Data:", true); // True implies textarea? I should update showPromptModal
    if (!dataStr) return;

    try {
        const data = JSON.parse(dataStr);
        await api(`/webhooks/${webhookId}/payloads`, 'POST', { name: "Manual Test", data });
        renderWebhookEditor(webhookId);
    } catch (e) {
        showToast("Invalid JSON", "error");
    }
};

// --- Actions ---

window.logout = async () => {
    await api('/logout', 'POST');
    navigate('/login');
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
};

window.insertVar = (text) => {
    // Ideally insert at cursor, but for simplicity copy to clipboard
    navigator.clipboard.writeText(text);
    showToast('Variable copied! Paste it in Subject or Body.', 'success');
};

window.openSenderModal = () => {
    const html = `
        <div style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000" onclick="this.remove()">
            <div class="card" style="width: 400px; max-width: 90%" onclick="event.stopPropagation()">
                <h3>Add Sender</h3>
                <form id="sender-form">
                    <div class="form-group"><label>Name (e.g. Work Email)</label><input id="s-name" required></div>
                    <div class="form-group"><label>From Name</label><input id="s-fromName" required></div>
                    <div class="form-group"><label>From Email</label><input type="email" id="s-fromEmail" required></div>
                    <div class="form-group"><label>SMTP Host</label><input id="s-host" required></div>
                    <div class="form-group"><label>SMTP Port</label><input type="number" id="s-port" value="587" required></div>
                    <div class="form-group"><label>User</label><input id="s-user" required></div>
                    <div class="form-group"><label>Password</label><input type="password" id="s-pass" required></div>
                     <div class="form-group">
                             <label><input type="checkbox" id="s-secure"> Secure (SSL/465)</label>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Sender</button>
                </form>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);

    document.getElementById('sender-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('s-name').value,
            fromName: document.getElementById('s-fromName').value,
            fromEmail: document.getElementById('s-fromEmail').value,
            host: document.getElementById('s-host').value,
            port: document.getElementById('s-port').value,
            user: document.getElementById('s-user').value,
            pass: document.getElementById('s-pass').value,
            secure: document.getElementById('s-secure').checked
        };

        // Test connection first?
        showToast('Verifying connection...', 'info');
        const testRes = await api('/email-park/test', 'POST', data);
        const test = await testRes.json();

        if (!test.success) {
            showToast('Connection failed: ' + test.error, 'error');
            return;
        }

        await api('/email-park', 'POST', data);
        showToast('Sender added!', 'success');
        document.querySelector('[onclick="this.remove()"]').click(); // close modal
        renderEmailPark();
    };
};

window.deleteSender = async (id) => {
    if (confirm('Delete this sender?')) {
        await api(`/email-park/${id}`, 'DELETE');
        renderEmailPark();
    }
};

window.saveWebhook = async (id) => {
    const data = {
        name: document.getElementById('webhook-name') ? document.getElementById('webhook-name').value : undefined,
        senderId: document.getElementById('email-sender').value,
        emailTemplate: {
            subject: document.getElementById('email-subject').value,
            body: document.getElementById('email-body').value,
            isHtml: document.getElementById('email-html').checked,
            to: document.getElementById('email-to').value
        }
    };

    await api(`/webhooks/${id}`, 'PUT', data);
    showToast('Draft saved', 'success');
};


window.saveWebhookName = async (id) => {
    const name = document.getElementById('webhook-name').value;
    if (!name) return showToast('Name cannot be empty', 'error');

    await api(`/webhooks/${id}`, 'PUT', { name });
    showToast('Name updated', 'success');
};


window.testEmail = async (id) => {
    // Save first
    const data = {
        senderId: document.getElementById('email-sender').value,
        emailTemplate: {
            subject: document.getElementById('email-subject').value,
            body: document.getElementById('email-body').value,
            isHtml: document.getElementById('email-html').checked,
            to: document.getElementById('email-to').value
        }
    };

    if (!data.senderId) { showToast('Please select a sender', 'error'); return; }
    if (!data.emailTemplate.to) { showToast('Please set a To address', 'error'); return; }

    await api(`/webhooks/${id}`, 'PUT', data);

    showToast('Sending test email...', 'info');
    const res = await api(`/webhooks/${id}/test-email`, 'POST', data);
    const json = await res.json();

    if (json.success) {
        showToast('Test email sent successfully!', 'success');
    } else {
        showToast('Failed to send: ' + json.error, 'error');
    }
};

window.activateWebhook = async (id) => {
    await api(`/webhooks/${id}`, 'PUT', { status: 'Active' });
    renderWebhookEditor(id);
    showToast('Webhook Activated!', 'success');
};

window.deactivateWebhook = async (id) => {
    await api(`/webhooks/${id}`, 'PUT', { status: 'Draft' });
    renderWebhookEditor(id);
    showToast('Webhook Deactivated', 'info');
};

window.deleteWebhook = async (id) => {
    if (confirm('Are you sure? This cannot be undone.')) {
        await api(`/webhooks/${id}`, 'DELETE');
        navigate('/dashboard');
    }
};

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showPromptModal(message, isTextarea = false) {
    return new Promise((resolve) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <div style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2000">
                <div class="card" style="min-width: 300px; max-width: 90%; max-height: 90vh; overflow-y: auto;">
                    <h3>${message}</h3>
                    <form id="prompt-form">
                        ${isTextarea
                ? `<textarea id="prompt-input" style="margin-bottom: 1rem; min-height: 200px; font-family: monospace" required autofocus></textarea>`
                : `<input id="prompt-input" style="margin-bottom: 1rem" required autofocus autocomplete="off">`
            }
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
                            <button type="button" class="btn" id="prompt-cancel">Cancel</button>
                            <button type="submit" class="btn btn-primary">OK</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        const input = div.querySelector('#prompt-input');
        input.focus();

        div.querySelector('#prompt-form').onsubmit = (e) => {
            e.preventDefault();
            const val = input.value;
            div.remove();
            resolve(val);
        };

        div.querySelector('#prompt-cancel').onclick = () => {
            div.remove();
            resolve(null);
        };
    });
}

window.regenerateWebhookUrl = async (id) => {
    if (!confirm('Are you sure? This will invalidate the old URL immediately.')) return;

    const res = await api(`/webhooks/${id}/regenerate`, 'POST');
    if (res && res.ok) {
        const data = await res.json();
        showToast('New URL Generated', 'success');
        // Update router
        navigate(`/webhook/${data.newId}`);
    } else {
        showToast('Failed to regenerate URL', 'error');
    }
};

window.clearWebhookLogs = async (id) => {
    if (!confirm('Clear all automation logs for this webhook?')) return;
    await api(`/webhooks/${id}/logs`, 'DELETE');
    renderWebhookEditor(id);
    showToast('Logs cleared', 'success');
};

window.showLogDetails = async (id) => {
    // We need to find the log entry. Since we don't have it in memory globally, we can re-fetch or pass data.
    // Fetching is safer.
    const res = await api('/logs'); // Optimization: We should have an endpoint for single log or passing data.
    // For now, let's just grab from the current view or re-fetch all is inefficient.
    // But wait, the table is rendered from `logs` variable in `renderWebhookEditor`.
    // We can't access `logs` here easily without attaching it to window or re-fetching.
    // Let's create a specific endpoint for single log or just loop through all logs (client side filtering).

    // Better: let's just pass the encoded JSON in the onclick? No, too big.
    // Let's just fetch all logs and filter. It's local JSON DB, so it's fast.
    const logsRes = await api('/logs');
    const logs = await logsRes.json();
    const log = logs.find(l => l.id === id);

    if (!log) return showToast('Log not found', 'error');

    const html = `
        <div style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2000" onclick="this.remove()">
            <div class="card" style="width: 600px; max-width: 90%; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem">
                    <h3>Log Details</h3>
                    <button class="btn btn-sm" onclick="this.closest('.card').parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>
                
                <div style="margin-bottom: 1rem">
                    <strong>Time:</strong> ${new Date(log.timestamp).toLocaleString()}<br>
                    <strong>Status:</strong> ${log.status}<br>
                    <strong>Email Status:</strong> <span class="${log.emailStatus === 'Sent' ? 'text-success' : 'text-danger'}">${log.emailStatus}</span>
                </div>

                ${log.error ? `<div class="code-block" style="color: var(--danger); margin-bottom: 1rem">${log.error}</div>` : ''}
                ${log.messageId ? `<div class="code-block" style="color: var(--success); margin-bottom: 1rem">Message ID: ${log.messageId}</div>` : ''}

                <h4>Payload Data</h4>
                <div class="code-block" style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem">${JSON.stringify(log.payload, null, 2)}</div>
                
                ${log.emailStatus !== 'Skipped (Draft)' ? `
                    <h4>Email Sent</h4>
                    <div class="card" style="background: rgba(255,255,255,0.05); padding: 1rem">
                        <div style="margin-bottom: 0.5rem"><strong>To:</strong> ${log.recipient || '-'}</div>
                        <div style="margin-bottom: 0.5rem"><strong>Subject:</strong> ${log.subject || '-'}</div>
                        <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 0.5rem 0">
                        <div style="white-space: pre-wrap; font-family: sans-serif">${log.body ? log.body.replace(/</g, '&lt;') : '-'}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
};

// Patching renderWebhookEditor "To" field manually here in the string
// I'll rewrite the function in the actual code block below.
