/**
 * SubAI Local AI Engine Wrapper
 * Uses Hugging Face Transformers.js for zero-API-key local browser LLM inference.
 */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configure environment options
env.allowLocalModels = false;
env.useBrowserCache = true; // Cache model weights in browser IndexedDB

export class LocalAIEngine {
    constructor() {
        this.generator = null;
        this.currentModelId = null;
        this.taskType = 'text2text-generation';
        this.isReady = false;
        this.isLoading = false;
        this.progressCallback = null;
        this.statusCallback = null;
        this.fileProgressMap = new Map();
    }

    /**
     * Check if a model is T5 / Encoder-Decoder or Decoder-only
     */
    getTaskType(modelId) {
        if (modelId.includes('Flan-T5') || modelId.includes('T5')) {
            return 'text2text-generation';
        }
        return 'text-generation';
    }

    /**
     * Initialize / Load the selected AI Model into browser WASM / WebGPU memory
     */
    async loadModel(modelId, onProgress, onStatus) {
        if (this.currentModelId === modelId && this.isReady) {
            if (onStatus) onStatus('ready', 'AI Model Ready');
            return true;
        }

        this.currentModelId = modelId;
        this.taskType = this.getTaskType(modelId);
        this.isReady = false;
        this.isLoading = true;
        this.fileProgressMap.clear();

        if (onStatus) onStatus('loading', 'Loading AI model...');

        try {
            const progressHandler = (info) => {
                if (info.status === 'progress') {
                    this.fileProgressMap.set(info.file, {
                        loaded: info.loaded || 0,
                        total: info.total || 1
                    });

                    let totalLoaded = 0;
                    let totalBytes = 0;
                    for (const [, fileData] of this.fileProgressMap) {
                        totalLoaded += fileData.loaded;
                        totalBytes += fileData.total;
                    }

                    const percent = totalBytes > 0 ? Math.min(100, Math.round((totalLoaded / totalBytes) * 100)) : 0;
                    const loadedMB = (totalLoaded / (1024 * 1024)).toFixed(1);
                    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

                    if (onProgress) {
                        onProgress({
                            file: info.file,
                            percent,
                            loadedMB,
                            totalMB,
                            statusText: `Downloading weights: ${percent}% (${loadedMB} MB / ${totalMB} MB)`
                        });
                    }
                } else if (info.status === 'ready') {
                    if (onProgress) {
                        onProgress({ percent: 100, statusText: 'Initializing model pipeline...' });
                    }
                }
            };

            // Load the ONNX model pipeline
            this.generator = await pipeline(this.taskType, modelId, {
                progress_callback: progressHandler
            });

            this.isReady = true;
            this.isLoading = false;
            if (onStatus) onStatus('ready', 'Runs 100% locally in browser');
            return true;
        } catch (error) {
            console.error('Failed to load local AI model:', error);
            this.isReady = false;
            this.isLoading = false;
            if (onStatus) onStatus('error', 'Failed to load model. Check internet or web browser compatibility.');
            throw error;
        }
    }

    /**
     * Generate response for user prompt locally
     */
    async generateResponse(userPrompt, options = {}) {
        if (!this.isReady || !this.generator) {
            throw new Error('AI Engine is not ready yet. Please wait for model loading.');
        }

        let formattedInput = userPrompt;
        if (this.taskType === 'text-generation') {
            formattedInput = `<|im_start|>system\nYou are SubAI, a helpful AI assistant.<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
        }

        const genConfig = {
            max_new_tokens: options.maxTokens || 220,
            temperature: options.temperature || 0.7,
            repetition_penalty: 1.15,
            ...options
        };

        const result = await this.generator(formattedInput, genConfig);
        
        let outputText = '';
        if (Array.isArray(result) && result.length > 0) {
            outputText = result[0].generated_text || result[0].translation_text || '';
        } else if (typeof result === 'string') {
            outputText = result;
        }

        if (this.taskType === 'text-generation' && outputText.includes('<|im_start|>assistant\n')) {
            outputText = outputText.split('<|im_start|>assistant\n').pop().replace('<|im_end|>', '').trim();
        } else if (this.taskType === 'text-generation' && outputText.startsWith(formattedInput)) {
            outputText = outputText.substring(formattedInput.length).trim();
        }

        return outputText.trim() || "I analyzed your query locally in your browser.";
    }
}

window.LocalAIEngine = LocalAIEngine;
