---
title: What is LLaMA Factory? LLM Fine-Tuning
description: A technical look at LLaMA Factory—a feature-rich toolkit for tuning large language models—and the latest updates through 2025.
tags: [llm]
slug: llama-factory
image: https://cdn.voltagent.dev/2025-05-17-llmafactory/social.png
authors: omeraplak
---

import LlamaFactoryNavigator from '@site/src/components/blog-widgets/LlamaFactoryNavigator';
import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

**Updated: October 14, 2025** — This article reflects the latest LLaMA-Factory updates, covering OFT/OFTv2 support, new model families (Intern-S1-mini, GPT-OSS, Llama 4, Qwen3, InternVL3), advanced optimizers (Muon, APOLLO), and expanded multimodal capabilities.

Large Language Models (LLMs) generate text and code for various tasks. These models can be specialized for specific purposes through fine-tuning on task-specific data.

This article examines **LLaMA‑Factory**—an open‑source toolkit for fine‑tuning and deploying large language models (LLMs) and vision‑language models (VLMs)—and how it has evolved through 2025.

![llama-factory](https://cdn.voltagent.dev/2025-05-17-llmafactory/llma.png)

## LLaMA-Factory Overview

[LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory/) is an open-source toolkit by developer hiyouga that provides a unified interface for fine-tuning over 100 different LLMs and VLMs. The toolkit integrates with models and datasets from Hugging Face and ModelScope.

> **Note:** For general AI agents, prompt engineering, retrieval-augmented generation, or function calling may be sufficient. LLaMA-Factory is designed for cases where you need to specialize a model on custom data or specific behaviors.

<LlamaFactoryNavigator />

### Core Features

LLaMA-Factory includes features for fine-tuning and deployment.

#### Model Support and Fine-Tuning Methods

- **Model Support**: LLaMA variants, Mistral, ChatGLM, Qwen, Gemma, DeepSeek, and other model families.

- **Training Approaches**:
  - **Standard Methods**: Supervised Fine-Tuning (SFT) and Continuous Pre-training
  - **Preference Tuning**: PPO, DPO, KTO, and ORPO for aligning models to human preferences
  - **LoRA and QLoRA**: Parameter-efficient methods using low-rank adaptation with quantization (2, 3, 4, 5, 6, or 8-bit) for training large models on limited VRAM

#### Training Efficiency

- **Precision Options**:
  - Full 16-bit training or freeze-tuning (updating only part of the network)
  - Quantization: AQLM, AWQ, GPTQ for reduced memory footprint
  - Speed optimizations: FlashAttention-2, Unsloth, GaLore (Gradient Low-Rank Projection)

- **Interface Options**:
  - Command-line interface (CLI) with sample configurations
  - LLaMA Board: Web UI for configuring fine-tuning tasks

:::note Additional Capabilities

- **Supported Tasks**: Multi-turn dialogue, tool use, image understanding, visual grounding, video classification, and audio understanding across LLMs and VLMs
- **Experiment Tracking**: Integration with LlamaBoard, TensorBoard, WandB, MLflow, and SwanLab for monitoring loss curves and hyperparameters
- **Deployment**: OpenAI-compatible API, vLLM worker and SGLang worker support, and CLI chat interface (`llamafactory-cli chat your_model_config.yaml`)
  :::

<ZoomableMermaid chart={`graph LR
LF[LLaMA Factory] --> MODELS[Model Support]
LF --> METHODS[Training Methods]
LF --> DEPLOY[Deployment]

MODELS --> LLM[100+ LLMs]
MODELS --> VLM[Vision-Language Models]

METHODS --> SFT[Supervised Fine-Tuning]
METHODS --> PREF[Preference Alignment]
METHODS --> LORA[LoRA/QLoRA]
METHODS --> QUANT[Quantization]

PREF --> PPO[PPO]
PREF --> DPO[DPO]
PREF --> KTO[KTO]
PREF --> ORPO[ORPO]

DEPLOY --> API[OpenAI-compatible API]
DEPLOY --> VLLM[vLLM Worker]
DEPLOY --> SGLANG[SGLang Worker]

style LF fill:#121E1B,stroke:#50C878,stroke-width:2px,color:#50C878
style MODELS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style METHODS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style DEPLOY fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878`} />

## Why Use LLaMA‑Factory?

The toolkit provides:

- **Reduced Boilerplate**: ML engineers can start training models with minimal setup code
- **Compute Efficiency**: Optimizations reduce training costs
- **Active Development**: Maintainers incorporate new models and methods regularly

> **Note:** LLaMA‑Factory is open‑source and updated frequently. Below are highlights added since spring 2025.

### What's New in 2025?

Recent additions include:

- **Orthogonal Finetuning (OFT) and OFTv2 (Aug 22 2025).** Parameter-efficient tuning methods that constrain updates to an orthogonal subspace, improving memory and compute efficiency. LLaMA-Factory supports both OFT and OFTv2.
- **Intern-S1-mini model support (Aug 20 2025).** Smaller InternLM models (Intern-S1-mini) can be fine-tuned through the toolkit.
- **GPT-OSS model support (Aug 6 2025).** Open-source GPT-OSS models are supported for fine-tuning.
- **New model families.** Earlier 2025 releases added support for GLM-4.1V, Qwen3, InternVL3, Llama 4, Qwen2.5-Omni and other models. Optimizers (Muon, APOLLO) were integrated, and SGLang was added as an inference backend. Support includes audio models (Qwen2-Audio, DeepSeek-R1) and multimodal models (MiniCPM-V).

To use these capabilities, update your repository and refer to the examples in the changelog.

:::tip Update Frequency
LLaMA-Factory receives regular updates. The developers add support for new models, and the open-source community contributes improvements.
:::

## Getting Started

Installation and setup instructions for LLaMA-Factory.

### Requirements and Installation

Check the LLaMA-Factory GitHub for hardware requirements (GPU, RAM, etc.) as requirements vary by model size and tuning method.

Clone the repository:

```bash
git clone --depth 1 https://github.com/hiyouga/LLaMA-Factory.git
cd LLaMA-Factory
```

Install with pip (use a virtual environment):

```bash
pip install -e ".[torch,metrics]"  # extras like bitsandbytes enable QLoRA
```

**Docker alternative**: Use the Dockerfiles in the `docker` directory for CUDA, NPU, and ROCm configurations.

:::important Production Deployment
LLaMA-Factory includes deployment APIs for experimentation and fine-tuning. Scaling to high-load production environments may require additional MLOps tools and infrastructure.
:::

### Data Preparation

Datasets should be JSON formatted and described in `data/dataset_info.json`. Supported sources:

- Local JSON files (e.g., customer support dialogues, product descriptions)
- Hugging Face datasets
- ModelScope Hub collections

The `data/README.md` file specifies formats and includes example datasets.

### Running Fine-Tuning

**CLI method**: Run fine-tuning via the `llamafactory-cli` tool:

```bash
llamafactory-cli train examples/train_lora/llama3_lora_sft.yaml
```

Sample YAML configuration files in the `examples` directory cover:

- LoRA SFT on Llama 3
- DPO on Mistral
- Other training scenarios

Copy a sample config, adapt it to your model and data, set hyperparameters (learning rate, epochs, batch size).

**Web UI method**: Launch the LLaMA Board UI:

```bash
llamafactory-cli webui
```

This launches a Gradio interface for selecting models, datasets, fine-tuning methods, and parameters.

**Test the model**: Chat with your fine-tuned model:

```bash
llamafactory-cli chat path_to_your_finetuned_model_or_adapter_config.yaml
```

### Post-Training

**Export model**: Merge LoRA adapters into the base model:

```bash
llamafactory-cli export your_config.yaml
```

**Hugging Face compatibility**: Exported models are compatible with Hugging Face Hub.

### Documentation Resources

- **Official Documentation**: [llamafactory.readthedocs.io](https://llamafactory.readthedocs.io/en/latest/)
- **Examples Directory**: GitHub repository with scripts and configurations
- **GitHub Issues**: Search existing issues or open new ones

## Summary

LLaMA-Factory is a toolkit for fine-tuning large language and vision-language models. It supports a range of models and training methods, including recent additions like OFT/OFTv2 and support for new model families.

The toolkit reduces boilerplate code for fine-tuning workflows while maintaining flexibility in model selection and training approaches.

## References

- **GitHub Repository**: [hiyouga/LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)
- **Documentation**: [llamafactory.readthedocs.io](https://llamafactory.readthedocs.io/en/latest/)
- **Research Paper (ACL 2024)**: [LlamaFactory: Unified Efficient Fine-Tuning of 100+ Language Models](https://arxiv.org/abs/2403.13372)
