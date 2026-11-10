
/* =========================================================
   TRANSCRITOR DE ÁUDIO
   Motor: Transformers.js + Whisper
   Processamento: navegador do usuário
========================================================= */

import { pipeline, env } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

// =========================================================
// CONFIGURAÇÕES
// =========================================================

const MODEL_NAME = "Xenova/whisper-base";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

// =========================================================
// ELEMENTOS HTML
// =========================================================

const audioFile = document.getElementById("audioFile");
const uploadArea = document.getElementById("uploadArea");

const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");

const removeFile = document.getElementById("removeFile");

const transcribeButton =
    document.getElementById("transcribeButton");

const progressSection =
    document.getElementById("progressSection");

const progressText =
    document.getElementById("progressText");

const progressPercent =
    document.getElementById("progressPercent");

const progressBar =
    document.getElementById("progressBar");

const statusMessage =
    document.getElementById("statusMessage");

const resultSection =
    document.getElementById("resultSection");

const transcriptionText =
    document.getElementById("transcriptionText");

const copyButton =
    document.getElementById("copyButton");

const downloadButton =
    document.getElementById("downloadButton");

const modelInfo =
    document.getElementById("modelInfo");

// =========================================================
// VARIÁVEIS
// =========================================================

let selectedFile = null;
let transcriber = null;
let isProcessing = false;

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function formatFileSize(bytes) {

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function showStatus(message, type = "") {

    statusMessage.textContent = message;

    statusMessage.className = "status-message";

    if (type) {
        statusMessage.classList.add(type);
    }
}

function updateProgress(percent, message) {

    const value = Math.max(0, Math.min(100, percent));

    progressBar.style.width = value + "%";
    progressPercent.textContent = Math.round(value) + "%";

    if (message) {
        progressText.textContent = message;
    }
}

// =========================================================
// SELEÇÃO DO ARQUIVO
// =========================================================

function selectFile(file) {

    if (!file) {
        return;
    }

    if (!file.type.startsWith("audio/")) {

        showStatus(
            "Selecione um arquivo de áudio válido.",
            "error"
        );

        return;
    }

    if (isProcessing) {
        return;
    }

    selectedFile = file;

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    fileInfo.hidden = false;

    uploadArea.hidden = true;

    resultSection.hidden = true;

    transcriptionText.value = "";

    transcribeButton.disabled = false;

    showStatus("Áudio selecionado. Pronto para transcrever.");

}

// =========================================================
// REMOVER ARQUIVO
// =========================================================

function clearFile() {

    if (isProcessing) {
        return;
    }

    selectedFile = null;

    audioFile.value = "";

    fileInfo.hidden = true;

    uploadArea.hidden = false;

    transcribeButton.disabled = true;

    resultSection.hidden = true;

    progressSection.hidden = true;

    showStatus("Selecione um áudio para começar.");

}

// =========================================================
// CARREGAMENTO DO MODELO DE IA
// =========================================================

async function loadModel() {

    if (transcriber) {
        return transcriber;
    }

    showStatus(
        "Preparando inteligência artificial. Na primeira utilização, será necessário baixar o modelo."
    );

    progressSection.hidden = false;

    updateProgress(0, "Carregando modelo de IA...");

    modelInfo.innerHTML = `
        <span class="status-dot"></span>
        Baixando ou preparando o modelo de inteligência artificial...
    `;

    try {

        transcriber = await pipeline(
            "automatic-speech-recognition",
            MODEL_NAME,
            {
                dtype: "q8",
                device: "wasm",

                progress_callback: (event) => {

                    if (event.status === "progress") {

                        const progress = event.progress || 0;

                        updateProgress(
                            progress,
                            "Baixando modelo de IA..."
                        );

                    }

                    if (event.status === "ready") {

                        updateProgress(
                            100,
                            "Modelo carregado!"
                        );

                    }

                }
            }
        );

        modelInfo.innerHTML = `
            <span class="status-dot" style="background:#16a34a"></span>
            Modelo de inteligência artificial carregado e pronto para uso.
        `;

        return transcriber;

    } catch (error) {

        transcriber = null;

        throw new Error(
            "Não foi possível carregar o modelo de IA. Verifique sua conexão com a internet e tente novamente."
        );

    }

}

// =========================================================
// CONVERTER ÁUDIO PARA 16 KHZ E MONO
// =========================================================

async function prepareAudio(file) {

    let audioContext;

    try {

        audioContext = new AudioContext({
            sampleRate: 16000
        });

        const arrayBuffer = await file.arrayBuffer();

        const audioBuffer =
            await audioContext.decodeAudioData(arrayBuffer);

        // Criar um áudio mono com taxa de 16 kHz.

        const targetSampleRate = 16000;

        const offlineContext = new OfflineAudioContext(
            1,
            Math.ceil(audioBuffer.duration * targetSampleRate),
            targetSampleRate
        );

        const source = offlineContext.createBufferSource();

        source.buffer = audioBuffer;

        source.connect(offlineContext.destination);

        source.start(0);

        const convertedBuffer =
            await offlineContext.startRendering();

        const audioData = convertedBuffer.getChannelData(0);

        return new Float32Array(audioData);

    } finally {

        if (audioContext && audioContext.state !== "closed") {
            await audioContext.close();
        }

    }

}

// =========================================================
// TRANSCRIÇÃO
// =========================================================

async function transcribeAudio() {

    if (!selectedFile || isProcessing) {
        return;
    }

    isProcessing = true;

    transcribeButton.disabled = true;

    removeFile.disabled = true;

    progressSection.hidden = false;

    resultSection.hidden = true;

    updateProgress(0, "Iniciando...");

    try {

        // 1. Carregar modelo.

        showStatus("Verificando o modelo de inteligência artificial...");

        const recognizer = await loadModel();

        // 2. Converter áudio.

        updateProgress(0, "Preparando áudio...");

        showStatus(
            "Convertendo o áudio para um formato compatível com a inteligência artificial."
        );

        const audioData = await prepareAudio(selectedFile);

        if (!audioData.length) {
            throw new Error("O arquivo de áudio está vazio.");
        }

        // 3. Executar transcrição.

        updateProgress(0, "Transcrevendo áudio...");

        showStatus(
            "A inteligência artificial está analisando o áudio. Aguarde..."
        );

        const result = await recognizer(
            audioData,
            {
                language: "portuguese",
                task: "transcribe",

                chunk_length_s: 30,
                stride_length_s: 5
            }
        );

        // 4. Exibir resultado.

        const text = result.text.trim();

        if (!text) {

            throw new Error(
                "Não foi possível identificar nenhuma fala no áudio."
            );

        }

        transcriptionText.value = text;

        resultSection.hidden = false;

        updateProgress(100, "Transcrição concluída!");

        showStatus(
            "Seu áudio foi transcrito com sucesso!",
            "success"
        );

        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error("Erro na transcrição:", error);

        showStatus(
            error.message || "Ocorreu um erro durante a transcrição.",
            "error"
        );

    } finally {

        isProcessing = false;

        transcribeButton.disabled = !selectedFile;

        removeFile.disabled = false;

    }

}

// =========================================================
// COPIAR TEXTO
// =========================================================

async function copyText() {

    const text = transcriptionText.value.trim();

    if (!text) {
        return;
    }

    try {

        await navigator.clipboard.writeText(text);

        copyButton.textContent = "Texto copiado!";

        setTimeout(() => {
            copyButton.textContent = "Copiar texto";
        }, 2000);

    } catch (error) {

        transcriptionText.select();

        const copied = document.execCommand("copy");

        if (copied) {

            copyButton.textContent = "Texto copiado!";

            setTimeout(() => {
                copyButton.textContent = "Copiar texto";
            }, 2000);

        } else {

            showStatus(
                "Não foi possível copiar automaticamente. Selecione o texto manualmente.",
                "error"
            );

        }

    }

}

// =========================================================
// BAIXAR TXT
// =========================================================

function downloadText() {

    const text = transcriptionText.value.trim();

    if (!text) {
        return;
    }

    const blob = new Blob(
        [text],
        {
            type: "text/plain;charset=utf-8"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const originalName = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, "")
        : "transcricao";

    link.href = url;

    link.download = originalName + "_transcricao.txt";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}

// =========================================================
// EVENTOS
// =========================================================

// Seleção pelo botão de arquivo.

audioFile.addEventListener("change", (event) => {

    const file = event.target.files[0];

    selectFile(file);

});

// Remover arquivo.

removeFile.addEventListener("click", clearFile);

// Iniciar transcrição.

transcribeButton.addEventListener(
    "click",
    transcribeAudio
);

// Copiar resultado.

copyButton.addEventListener("click", copyText);

// Baixar resultado.

downloadButton.addEventListener("click", downloadText);

// =========================================================
// ARRASTAR E SOLTAR ARQUIVOS
// =========================================================

uploadArea.addEventListener("dragover", (event) => {

    event.preventDefault();

    uploadArea.classList.add("dragging");

});

uploadArea.addEventListener("dragleave", () => {

    uploadArea.classList.remove("dragging");

});

uploadArea.addEventListener("drop", (event) => {

    event.preventDefault();

    uploadArea.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    selectFile(file);

});

// =========================================================
// INICIALIZAÇÃO
// =========================================================

showStatus("Selecione um áudio para começar.");
