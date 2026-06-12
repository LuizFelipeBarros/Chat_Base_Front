const URL_BACKEND = 'http://localhost:5000' 

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');
    const quickReplyButtons = document.querySelectorAll('.quick-reply');

    let userSessionId = null;

    function updateConnectionStatus(isConnected) {
        connectionStatus.textContent = isConnected ? 'Conectado' : 'Desconectado';
        connectionStatus.className = isConnected ? 'status-online' : 'status-offline';
        setChatEnabled(isConnected);
    }

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Bot';
        } else {
            messageElement.classList.add('status-message');
        }

        if (type === 'error') {
            messageElement.classList.add('error-text');
            sender = 'Erro';
        } else if (type === 'status') {
            messageElement.classList.add('status-text');
            sender = 'Status';
        }

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        
        // Se for uma mensagem normal (bot ou usuário), renderiza o Markdown
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            // Se for erro ou status, mantém como texto puro
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para habilitar/desabilitar o chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    function extractMessagePayload(data) {
        if (typeof data === 'string') {
            return { sender: 'Bot', text: data };
        }

        return {
            sender: data?.remetente || data?.sender || 'Bot',
            text: data?.texto || data?.mensagem || data?.message || data?.erro || '',
        };
    }

    function sendMessage(text) {
        const messageText = (text || messageInput.value).trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText, session_id: userSessionId });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Não conectado ao servidor.', 'error');
        }
    }

    // Inicialmente desativa o chat
    setChatEnabled(false);
    updateConnectionStatus(false);
    addMessageToChat('Status', 'Clique em "Iniciar conversa" para começar.', 'status');

    // Função para conectar ao servidor
    function iniciarConversa() {
        if (socket && socket.connected) return;

        socket = io(URL_BACKEND);

        socket.on('connect', () => {
            console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
            updateConnectionStatus(true);
            addMessageToChat('Status', 'Conectado ao servidor de chat.', 'status');
        });

        socket.on('disconnect', () => {
            console.log('Desconectado do servidor Socket.IO.');
            updateConnectionStatus(false);
            addMessageToChat('Status', 'Você foi desconectado.', 'status');
        });

        socket.on('status_conexao', (data) => {
            if (data?.session_id || data?.sessionId) {
                userSessionId = data.session_id || data.sessionId;
            }
        });

        socket.on('nova_mensagem', (data) => {
            const payload = extractMessagePayload(data);
            addMessageToChat(payload.sender, payload.text);
        });

        socket.on('erro', (data) => {
            const payload = extractMessagePayload(data);
            addMessageToChat('Erro', payload.text, 'error');
        });
    }

    // Função para encerrar a conversa
    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            addMessageToChat('Status', 'Conversa encerrada pelo usuário.', 'status');
        }
    }

    // Função para limpar as mensagens da tela
    function limparTela() {
        chatBox.innerHTML = ''; // Isso apaga todo o HTML de dentro da caixa de chat
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem para o servidor
    function sendMessageToServer() {
        sendMessage();
    }

    // Eventos dos botões
    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    quickReplyButtons.forEach((button) => {
        button.addEventListener('click', () => {
            sendMessage(button.dataset.text || button.textContent);
        });
    });

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessageToServer();
        }
    });
});

