# fine_tune_unsloth_wandb.py

import wandb
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# ------------------------------------------------------
# 1. Initialize Weights & Biases
# ------------------------------------------------------
wandb.init(
    project="unsloth-finetune",
    config={
        "epochs": 2,
        "batch_size": 2,
        "learning_rate": 2e-4,
        "gradient_accumulation_steps": 4,
        "max_seq_length": 2048,
    }
)

# ------------------------------------------------------
# 2. Load a base model
# ------------------------------------------------------
model_name = "unsloth/llama-3-8b"   # example, change as needed
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=model_name,
    load_in_4bit=True,      # memory-efficient
)

# Enable LoRA fine-tuning
model = FastLanguageModel.get_peft_model(
    model,
    r=16, lora_alpha=32, lora_dropout=0.1, bias="none",
    target_modules=["q_proj", "v_proj"], # typical for LLaMA
)

# ------------------------------------------------------
# 3. Load and preprocess dataset
# ------------------------------------------------------
dataset = load_dataset("tatsu-lab/alpaca")

def format_example(example):
    instruction = example["instruction"]
    input_text = example["input"]
    output_text = example["output"]

    if input_text:
        prompt = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output_text}"
    else:
        prompt = f"### Instruction:\n{instruction}\n\n### Response:\n{output_text}"

    return {"text": prompt}

dataset = dataset.map(format_example)

# Use train/test split for evaluation
dataset = dataset["train"].train_test_split(test_size=0.1)

# ------------------------------------------------------
# 4. Training arguments
# ------------------------------------------------------
training_args = TrainingArguments(
    output_dir="./checkpoints",
    num_train_epochs=wandb.config.epochs,
    per_device_train_batch_size=wandb.config.batch_size,
    gradient_accumulation_steps=wandb.config.gradient_accumulation_steps,
    warmup_steps=50,
    logging_dir="./logs",
    logging_steps=10,
    save_strategy="steps",
    save_steps=500,
    learning_rate=wandb.config.learning_rate,
    fp16=True,
    optim="paged_adamw_32bit",
    lr_scheduler_type="cosine",
    evaluation_strategy="steps",   # <-- enable evaluation
    eval_steps=200,
    report_to="wandb",             # <-- send logs to wandb
)

# ------------------------------------------------------
# 5. Trainer
# ------------------------------------------------------
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],   # <-- add eval set
    dataset_text_field="text",
    max_seq_length=wandb.config.max_seq_length,
    args=training_args,
)

# ------------------------------------------------------
# 6. Train + Evaluate
# ------------------------------------------------------
trainer.train()

metrics = trainer.evaluate()
wandb.log(metrics)   # log eval results to wandb

# ------------------------------------------------------
# 7. Save model
# ------------------------------------------------------
trainer.save_model("./fine_tuned_model")
tokenizer.save_pretrained("./fine_tuned_model")
wandb.finish()
