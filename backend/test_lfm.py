from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# Load model and tokenizer
MODEL_NAME = "LiquidAI/LFM2.5-1.2B-Instruct"

print("Loading model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    torch_dtype="auto"
)

print("Model loaded successfully!\n")

# Store conversation history
messages = []

print("=== Chat Started ===")
print("Type 'exit' or 'quit' to stop.\n")

while True:
    user_input = input("You: ").strip()

    if user_input.lower() in ["exit", "quit"]:
        print("Goodbye!")
        break

    # Add user message
    messages.append({
        "role": "user",
        "content": user_input
    })

    # Convert conversation to model input
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_tensors="pt",
        return_dict=True,
    ).to(model.device)

    # Generate response
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode only newly generated tokens
    generated_ids = outputs[0][inputs["input_ids"].shape[-1]:]
    assistant_response = tokenizer.decode(
        generated_ids,
        skip_special_tokens=True
    ).strip()

    print(f"Assistant: {assistant_response}\n")

    # Store assistant response for future context
    messages.append({
        "role": "assistant",
        "content": assistant_response
    })