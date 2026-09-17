from decouple import config
# pyrefly: ignore [missing-import]
from google import genai 
# pyrefly: ignore [missing-import]
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from rest_framework.response import Response
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

NVIDIA_KEY=config("NVIDIA_KEY")

# MODEL_NAME = "LiquidAI/LFM2.5-1.2B-Instruct"

# tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# model = AutoModelForCausalLM.from_pretrained(
#     MODEL_NAME,
#     device_map="cpu",
#     torch_dtype=torch.float32,
# )

class WebSearchService:
   

    @staticmethod
    def build_prompt(question:str ,context:str)-> str:


        prompt = f"""
        You are an AI Tutor.
        Answer the user's question ONLY using the provided context.
        Rules:
        1. Use only the information from the context.
        2. If the answer is not available in the context, respond:
        "I couldn't find this information in the uploaded documents."
        3. Be concise and explain clearly.
        4. Do not make up information.
        Context:
        -----------------------
        {context}
        -----------------------
        Question:
        {question}
        Answer:
        """
        return prompt
    
    @staticmethod
    def generate_answer(prompt):

        
        # client = genai.Client(api_key = GEMINI_API_KEY)
        client = ChatNVIDIA(

            # model="nvidia/ising-calibration-1.5-31b",
            model="google/gemma-4-31b-it",
            api_key=NVIDIA_KEY, 
            temperature=1,
            top_p=0.95,
            max_completion_tokens=16384,
            # reasoning_budget=16384,
            # chat_template_kwargs={"enable_thinking":True},

            )

        try:
            # messages = [
            #     {
            #         "role": "user",
            #         "content": prompt,
            #     }
            # ]

            # inputs = tokenizer.apply_chat_template(
            #     messages,
            #     add_generation_prompt=True,
            #     tokenize=True,
            #     return_tensors="pt",
            #     return_dict=True,
            # ).to(model.device)

            # with torch.no_grad():
            #     outputs = model.generate(
            #         **inputs,
            #         max_new_tokens=1024,      
            #         temperature=1.0,
            #         top_p=0.95,
            #         do_sample=True,
            #         repetition_penalty=1.1,
            #         pad_token_id=tokenizer.eos_token_id,
            #         eos_token_id=tokenizer.eos_token_id,
            #     )

            # generated_tokens = outputs[0][inputs["input_ids"].shape[-1]:]

            # response = tokenizer.decode(
            #     generated_tokens,
            #     skip_special_tokens=True
            # ).strip()

            # return response


            response = client.invoke(prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Error generating answer: {str(e)}")
