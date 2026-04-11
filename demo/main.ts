import { createCMC7Reader } from '../src/index.js';

const viewport = document.getElementById('camera-viewport')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const qualityBar = document.getElementById('quality-bar')!;
const qualityVal = document.getElementById('quality-val')!;
const statusText = document.getElementById('status-text')!;
const resultsView = document.getElementById('results-view')!;
const rawStringText = document.getElementById('raw-string')!;

let reader: any = null;

async function init() {
  try {
    statusText.innerText = 'Inicializando motor OCR...';
    reader = await createCMC7Reader({
      frameIntervalMs: 250,
      minFrameQualityScore: 45
    });

    reader.on('frame-quality', (report: any) => {
      qualityBar.style.width = `${report.score}%`;
      qualityVal.innerText = `${Math.round(report.score)}%`;
      
      if (report.score < 45) {
        statusText.innerText = `Baixa qualidade: ${report.suggestion || 'ajuste o foco'}`;
        statusText.style.color = '#ff5252';
      } else {
        statusText.innerText = 'Buscando cheque...';
        statusText.style.color = '#fff';
      }
    });

    reader.on('result', (result: any) => {
      renderResult(result);
    });

    reader.on('error', (err: any) => {
      console.error('Reader Error:', err);
      statusText.innerText = `Erro: ${err.message}`;
    });

    startBtn.onclick = async () => {
      startBtn.disabled = true;
      try {
        statusText.innerText = 'Acessando câmera...';
        await reader.startCamera(viewport);
        stopBtn.disabled = false;
        statusText.innerText = 'Câmera ativa';
      } catch (e: any) {
        alert(`Erro ao iniciar câmera: ${e.message}`);
        startBtn.disabled = false;
      }
    };

    stopBtn.onclick = async () => {
      stopBtn.disabled = true;
      await reader.stop();
      startBtn.disabled = false;
      statusText.innerText = 'Scanner parado';
    };

    statusText.innerText = 'Pronto para iniciar';

  } catch (e: any) {
    statusText.innerText = `Erro de inicialização: ${e.message}`;
  }
}

function renderResult(result: any) {
  rawStringText.innerText = result.raw;
  
  if (!result.validation.isValid) {
    statusText.innerText = 'Dígitos verificadores inválidos!';
    statusText.style.color = '#ff5252';
  } else {
    statusText.innerText = 'Cheque lido com sucesso!';
    statusText.style.color = '#00e676';
  }

  const fields = result.fields;
  resultsView.innerHTML = `
    <div class="field">
      <label>Banco</label>
      <div class="value">${fields.bankCode || '---'}</div>
    </div>
    <div class="field">
      <label>Agência</label>
      <div class="value">${fields.agency || '---'}</div>
    </div>
    <div class="field">
      <label>Conta</label>
      <div class="value">${fields.account || '---'}</div>
    </div>
    <div class="field">
      <label>Nº Cheque</label>
      <div class="value">${fields.checkNumber || '---'}</div>
    </div>
  `;
}

init();
