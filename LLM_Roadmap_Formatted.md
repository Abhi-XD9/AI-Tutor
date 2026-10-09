# WEEK 5 — Jul 6 to Jul 10 — LLM APIs (Groq + OpenAI)

> **End-state Fri: Real Groq-powered chat in ZoroAI, token counts saved per message, model selector in UI, OpenAI as fallback. HuggingFace inference demo in bonus/.**


## Day 1 — Mon Jul 6 — Groq setup + first API call + tiktoken

### 📘 Learnings (1.5 hr):


- Search YouTube: "Groq API Python tutorial 2024" — pick top recent result
- Search YouTube: "Andrej Karpathy LLM 1 hour" or "What is LLM beginner" — 15 min foundation
- Read: Groq Python SDK docs — 15 min
- Search YouTube: "tiktoken token counting tutorial"
### 🛠️ Tasks (1.5 hr):


- pip install groq tiktoken
- Add GROQ_API_KEY to .env + Render env vars
- Create chat/llm.py:

```python
from groq import Groq
from decouple import config
```

```python
client = Groq(api_key=config('GROQ_API_KEY'))
```

```python
def chat_groq(messages, model="llama-3.3-70b-versatile"):
    response = client.chat.completions.create(messages=messages, model=model)
    return response.choices[0].message.content
```
- Test in python manage.py shell:

```python
from chat.llm import chat_groq
```
- chat_groq([{"role": "user", "content": "Hello in 3 words"}])
- Count tokens with tiktoken before/after the call
### ✅ Deliverable: Groq returns a reply in shell. git commit -m "W5D1: Groq client + tiktoken"


## Day 2 — Tue Jul 7 — Real streaming (replace fake)

### 📘 Learnings (1 hr):


- Read Groq streaming docs
- Search YouTube: "OpenAI streaming Python SDK 2024" — same pattern, applies here
### 🛠️ Tasks (2 hr):


- Update chat/streaming.py — replace FAKE_RESPONSES with real Groq stream:

```python
def event_generator():
    messages = list(conversation.messages.order_by('created_at').values('role', 'content'))
    stream = client.chat.completions.create(
        messages=messages + [{"role": "user", "content": user_text}],
        model="llama-3.3-70b-versatile",
        stream=True,
```
-     )
```python
    full = ''
```
-     for chunk in stream:
```python
        token = chunk.choices[0].delta.content or ''
        full += token
```
-         if token:
```python
            yield f"data: {token}\n\n"
    Message.objects.create(conversation=conversation, role='assistant', content=full)
    yield "data: [DONE]\n\n"
```
- Test in React UI — typing effect should look identical, just with real responses
### ✅ Deliverable: Real AI chat works end-to-end. git commit -m "W5D2: Groq streaming replaces fake stream"


## Day 3 — Wed Jul 8 — System prompts + prompt engineering

### 📘 Learnings (1.5 hr):


- Anthropic prompt engineering docs — free, canonical, 30 min
- Search YouTube: "Greg Brockman prompt engineering" OR "Jeremy Howard prompts"
- Search YouTube: "Hitesh Choudhary prompt engineering" — Hindi option
### 🛠️ Tasks (1.5 hr):


- Add system_prompt field to Conversation model + migrate
- Prepend system prompt to messages before sending to Groq
- Add temperature + max_tokens fields (defaults: 0.7, 1024)
- Test 3 different system prompts: helpful assistant / sarcastic friend / code reviewer
```python
Try JSON mode: response_format={"type": "json_object"} (Groq supports it)
```
### ✅ Deliverable: System prompts visibly change behavior. git commit -m "W5D3: system prompts + temperature + JSON mode"


## Day 4 — Thu Jul 9 — Token counting + cost tracking + retry

### 📘 Learnings (1 hr):


- Search YouTube: "tenacity Python retry tutorial"
- Read: Groq rate limits docs
### 🛠️ Tasks (2 hr):


- Add prompt_tokens + completion_tokens to Message model + migrate
- Read counts from Groq response (response.usage), save on message
```python
pip install tenacity — wrap LLM calls in @retry(stop=stop_after_attempt(3), wait=wait_exponential())
```
- Build /api/usage/me/ endpoint — return current user's total tokens + estimated cost (use OpenAI pricing as reference since Groq is free)
- Add usage chip to React UI sidebar
### ✅ Deliverable: Every message has token counts. Usage endpoint returns totals. git commit -m "W5D4: token + cost tracking + retry"


## Day 5 — Fri Jul 10 — BROADER: HuggingFace transformers inference

### 📘 Learnings (1.5 hr):


- Search YouTube: "HuggingFace pipeline tutorial 2024" — top result
- Search YouTube: "AssemblyAI HuggingFace beginner" or "Patrick Loeber HuggingFace"
- Read HF pipelines docs — 20 min
### 🛠️ Tasks (1.5 hr):


- pip install transformers torch (CPU-only torch is fine: torch torchvision --index-url https://download.pytorch.org/whl/cpu)
- Create bonus/hf-inference/sentiment_demo.py:

```python
from transformers import pipeline
classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
print(classifier(["I love ZoroAI", "This bug is killing me"]))
```
- Create bonus/hf-inference/ner_demo.py using pipeline("ner") with dslim/bert-base-NER
- Write bonus/hf-inference/README.md — what each model does, when you'd use it vs an LLM API
- Mention "have you used HF?" in your mental interview answer template
### ✅ Deliverable: Both demos run, output reasonable predictions. git commit -m "W5D5: HF inference demos (sentiment + NER)"


# WEEK 6 — Jul 13 to Jul 17 — Embeddings + pgvector

> **End-state Fri: Upload PDF → chunks → embeddings stored in pgvector → semantic search returns relevant chunks. Celery handles the embedding job in the background.**


## Day 1 — Mon Jul 13 — Embeddings intuition + first call

### 📘 Learnings (1.5 hr):


- 3Blue1Brown — Vectors — 10 min, point-of-use math
- Search YouTube: "StatQuest word embeddings clearly explained"
- Search YouTube: "OpenAI embeddings tutorial 2024 Python"
### 🛠️ Tasks (1.5 hr):


- pip install openai numpy (already have openai probably)
- Demo in shell:

```python
from openai import OpenAI
client = OpenAI()
resp = client.embeddings.create(input="hello world", model="text-embedding-3-small")
v = resp.data[0].embedding  # 1536 floats
```
- Compute cosine similarity between 3 sentences using numpy. Confirm related sentences score higher.
- Save in bonus/embeddings-intuition/
### ✅ Deliverable: Cosine similarity demo working. git commit -m "W6D1: embeddings + cosine demo"


## Day 2 — Tue Jul 14 — pgvector install + Document/Chunk models

### 📘 Learnings (1 hr):


- pgvector GitHub README — 15 min
- Search YouTube: "pgvector Django tutorial 2024"
- Search YouTube: "Postgres pgvector setup"
### 🛠️ Tasks (2 hr):


- Update docker-compose.yml db service to pgvector/pgvector:pg16 image (has the extension preinstalled)
- Rebuild: docker compose up --build -d db
- Enable extension: docker compose exec db psql -U postgres -d zoroai -c "CREATE EXTENSION vector;"
- pip install pgvector
- Create models in chat/models.py:

```python
from pgvector.django import VectorField
```

```python
class Document(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    created_at = models.DateTimeField(auto_now_add=True)
```

```python
class Chunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()
    embedding = VectorField(dimensions=1536)
    index = models.IntegerField()
```
- Migrate
### ✅ Deliverable: Migrations applied, tables exist with embedding column. git commit -m "W6D2: pgvector + Document/Chunk models"


## Day 3 — Wed Jul 15 — PDF upload + chunking

### 📘 Learnings (1 hr):


- Search YouTube: "LangChain RecursiveCharacterTextSplitter tutorial"
- Read: LangChain text splitters docs
### 🛠️ Tasks (2 hr):


- pip install pypdf langchain-text-splitters
- Add DocumentUploadView(APIView) accepting multipart/form-data
- Parse PDF with pypdf, get full text
```python
Chunk with RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
```
- Save Chunk rows (without embeddings yet)
- Test by uploading a PDF, verify chunks in admin
### ✅ Deliverable: PDF uploaded → N chunks in DB. git commit -m "W6D3: PDF upload + chunking"


## Day 4 — Thu Jul 16 — Embed chunks + semantic search endpoint

### 📘 Learnings (1 hr):


- Search YouTube: "OpenAI batch embeddings tutorial"
- Read: pgvector query operators
### 🛠️ Tasks (2 hr):


- After upload, loop through chunks and embed each (batch in groups of 20):

```python
def embed_chunks(document):
```
-     for chunk in document.chunks.all():
```python
        resp = client.embeddings.create(input=chunk.content, model="text-embedding-3-small")
        chunk.embedding = resp.data[0].embedding
```
-         chunk.save()
- Build POST /api/search/:

```python
from pgvector.django import CosineDistance
query_embedding = embed(query)
chunks = Chunk.objects.filter(document__user=request.user).annotate(
    distance=CosineDistance('embedding', query_embedding)
```
- ).order_by('distance')[:5]
- Return chunks JSON to client
- Time the embed job — note how slow it is for 20-page PDF (groundwork for Celery on Fri)
### ✅ Deliverable: Upload PDF → search query returns relevant chunks. git commit -m "W6D4: embed + semantic search endpoint"


## Day 5 — Fri Jul 17 — BROADER: Celery + Redis broker for async embedding

### 📘 Learnings (1.5 hr):


- Search YouTube: "Very Academy Celery Django tutorial" — best Django+Celery channel
- Search YouTube: "Celery Redis Django 2024"
- Read: Celery docs first-steps
### 🛠️ Tasks (1.5 hr):


- pip install celery
- Create ZoroAI/celery.py:

```python
import os
from celery import Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ZoroAI.settings')
app = Celery('ZoroAI')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
Settings: CELERY_BROKER_URL = REDIS_URL, CELERY_RESULT_BACKEND = REDIS_URL
```
- Create chat/tasks.py:

```python
from celery import shared_task
from .models import Document
from .embeddings import embed_chunks
```

```python
@shared_task
def embed_document_task(document_id):
    embed_chunks(Document.objects.get(id=document_id))
```
- In DocumentUploadView, replace sync embed_chunks(doc) with embed_document_task.delay(doc.id)
- Add Celery worker service to docker-compose.yml:

-   celery:
-     build: .
-     command: celery -A ZoroAI worker -l info
-     volumes: [".:/app"]
-     env_file: [".env"]
-     depends_on:
-       redis: { condition: service_healthy }
-       db: { condition: service_healthy }
- Test: upload PDF → response is instant (job queued), worker logs show embed progress
### ✅ Deliverable: Async embedding works. git commit -m "W6D5: Celery + Redis broker for async embed jobs"


# WEEK 7 — Jul 20 to Jul 24 — LangChain + retrievers (RAG basics)

> **End-state Fri: ZoroAI chats with your uploaded documents using LangChain retriever. Streaming responses include source chunks.**


## Day 1 — Mon Jul 20 — LangChain LCEL intro

### 📘 Learnings (1.5 hr):


- LangChain official YouTube — LCEL — pick from official channel
- Search YouTube: "James Briggs LangChain LCEL"
- Read: LCEL conceptual docs
### 🛠️ Tasks (1.5 hr):


- pip install langchain langchain-openai langchain-groq
- First chain in shell:

```python
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
```

```python
llm = ChatGroq(model="llama-3.3-70b-versatile")
prompt = ChatPromptTemplate.from_template("Translate '{text}' to Hindi.")
chain = prompt | llm | StrOutputParser()
print(chain.invoke({"text": "Good morning"}))
```
- Grok the | pipe — that's the whole framework's elegance
### ✅ Deliverable: LCEL chain runs in shell. git commit -m "W7D1: LangChain LCEL first chain"


## Day 2 — Tue Jul 21 — PGVector retriever via LangChain

### 📘 Learnings (1 hr):


- Read: LangChain PGVector vectorstore docs
- Search YouTube: "LangChain retrievers tutorial"
### 🛠️ Tasks (2 hr):


- pip install langchain-postgres
- Wrap your existing chunks in LangChain PGVector:

```python
from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings
```

```python
vectorstore = PGVector(
    embeddings=OpenAIEmbeddings(model="text-embedding-3-small"),
    collection_name="zoroai_chunks",
    connection=config('DATABASE_URL'),
```
- )
```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
```
- Test: retriever.invoke("your test query") returns 5 Documents
### ✅ Deliverable: LangChain retriever returns top-5 chunks. git commit -m "W7D2: PGVector retriever"


## Day 3 — Wed Jul 22 — RAG chain (non-streaming first)

### 📘 Learnings (1 hr):


- Search YouTube: "LangChain RAG tutorial 2024"
- Read: LangChain RAG tutorial
### 🛠️ Tasks (2 hr):


- Build the canonical RAG chain:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
```

```python
prompt = ChatPromptTemplate.from_template("""Answer using ONLY this context:
```
- {context}

- Question: {question}""")

```python
rag_chain = (
```
-     {"context": retriever, "question": RunnablePassthrough()}
-     | prompt | llm | StrOutputParser()
- )
```python
print(rag_chain.invoke("what does my document say about X?"))
```
- Wire into a new endpoint /api/chat/rag/ (non-streaming this time, just JSON)
### ✅ Deliverable: RAG endpoint returns grounded answer. git commit -m "W7D3: first RAG chain"


## Day 4 — Thu Jul 23 — Streaming RAG + sources panel

### 🛠️ Tasks (3 hr):


- Convert to streaming version using astream or stream:

- for chunk in rag_chain.stream("question"):
```python
    yield f"data: {chunk}\n\n"
```
- Update SSE endpoint to stream RAG responses
- Return retrieved chunks (sources) before token stream starts as a JSON event:

```python
yield f"event: sources\ndata: {json.dumps(source_dicts)}\n\n"
```
- Update React streamChat to parse the event: sources differently — populate a sources panel
### ✅ Deliverable: Streaming RAG with sources visible in UI. git commit -m "W7D4: streaming RAG + sources panel"


## Day 5 — Fri Jul 24 — BROADER: LangChain advanced patterns (memory + history)

### 📘 Learnings (1.5 hr):


- Search YouTube: "LangChain conversation memory tutorial 2024"
- Read: LangChain message history docs
### 🛠️ Tasks (1.5 hr):


- Add RunnableWithMessageHistory so multi-turn RAG works
- Use Postgres-backed history (LangChain has built-in adapter) OR roll your own using your Message model
- Test: ask follow-up questions that require remembering earlier context
### ✅ Deliverable: Multi-turn chat with memory. git commit -m "W7D5: LangChain message history"


# WEEK 8 — Jul 27 to Jul 31 — RAG CAPSTONE WEEK

> **End-state Fri: Production-grade RAG with citations, grounding, hybrid search, re-ranking. Big LinkedIn post with 90-sec demo video.**


## Day 1 — Mon Jul 27 — Citations in responses

### 📘 Learnings (1 hr):


- Read: Anthropic citation pattern
- Search YouTube: "RAG with citations tutorial"
### 🛠️ Tasks (2 hr):


- Change RAG prompt: "Cite sources as [1], [2]. Number them based on context order."
- Number chunks in the prompt: [1] {chunk 1 text}\n[2] {chunk 2 text}
- Parse [1], [2] from response, map back to chunk IDs
- UI: render citations as clickable chips → scroll to source chunk
### ✅ Deliverable: Citations clickable. git commit -m "W8D1: numbered citations"


## Day 2 — Tue Jul 28 — Grounding + hallucination guardrails

### 📘 Learnings (1 hr):


- Search YouTube: "RAG hallucination prevention" — pick top 2024
- Read: Pinecone or Weaviate blog on grounding (skim)
### 🛠️ Tasks (2 hr):


- Strong system prompt: "Answer ONLY from CONTEXT. If unsure, say 'I cannot find this in the provided documents.'"
```python
temperature=0 for RAG mode
```
- If response contains "I cannot find", show different UI state (warning icon, lighter color)
- Add /api/feedback/ endpoint (thumbs up/down per message) — eval data for W11
### ✅ Deliverable: No-answer detection works. git commit -m "W8D2: grounding + no-answer UI"


## Day 3 — Wed Jul 29 — Hybrid search (BM25 + semantic)

### 📘 Learnings (1 hr):


- Search YouTube: "hybrid search BM25 semantic tutorial"
- Read: LangChain ensemble retriever docs
### 🛠️ Tasks (2 hr):


- pip install rank_bm25
- Build BM25 index over chunks (in-memory or persist)
- At query time: top-10 from BM25 + top-10 from pgvector, deduplicate by chunk_id, weighted score
- A/B test on 5 queries: which retrieves better?
### ✅ Deliverable: Hybrid search live. git commit -m "W8D3: hybrid BM25 + semantic"


## Day 4 — Thu Jul 30 — Re-ranking with cross-encoder

### 📘 Learnings (1 hr):


- Search YouTube: "James Briggs cross-encoder reranking"
- Read: sentence-transformers cross-encoder docs
### 🛠️ Tasks (2 hr):


- pip install sentence-transformers
- Load cross-encoder/ms-marco-MiniLM-L-6-v2 (small, ~60MB)
- After hybrid search returns top-20, re-rank with cross-encoder, keep top-5
- Measure: subjective quality improvement (look at retrieved chunks for a complex query)
### ✅ Deliverable: Re-ranking active. git commit -m "W8D4: cross-encoder re-rank"


## Day 5 — Fri Jul 31 — CAPSTONE POLISH + BIG LinkedIn POST

### 🛠️ Tasks (3 hr):


- Record a 90-sec demo video with ScreenToGif or Loom:
- Upload PDF (2 sec)
- Ask a question (2 sec)
- Watch streaming response with citations (10 sec)
- Click a citation → highlight source (5 sec)
- Save as demos/rag-capstone.mp4 (commit if under 100MB or use git-lfs)
- README major rewrite — prominent RAG section, embed demo, architecture diagram updated
- LinkedIn post (250 words): "Spent 4 weeks building RAG. Here are the 3 things that actually matter — chunking strategy, hybrid retrieval, grounding prompts." Include the demo video and repo link.
- Cross-post to Twitter/X and r/LangChain
### ✅ Deliverable: Demo video + capstone post live. git commit -m "Week 8 complete: RAG capstone + demo + LinkedIn"


- THIS IS THE WEEK RECRUITERS NOTICE. Spend the Friday on it.

# WEEK 9 — Aug 3 to Aug 7 — LangGraph + agents

> **End-state Fri: ZoroAI can call tools (web search, calculator, document query) and routes intelligently. Tool-call cards visible in UI. Multi-modal demo in bonus/.**


## Day 1 — Mon Aug 3 — LangGraph intro + state graphs

### 📘 Learnings (1.5 hr):


- LangChain official YouTube — LangGraph series
- Search YouTube: "LangGraph beginner tutorial 2024"
- Read: LangGraph quickstart
### 🛠️ Tasks (1.5 hr):


- pip install langgraph
- First state graph in shell — a 2-node graph that just passes a message through
- Add a conditional edge based on input
### ✅ Deliverable: First LangGraph runs. git commit -m "W9D1: LangGraph first state graph"


## Day 2 — Tue Aug 4 — Define 3 tools

### 📘 Learnings (1 hr):


- Search YouTube: "LangChain tool calling tutorial 2024"
- Read: LangChain @tool decorator docs
### 🛠️ Tasks (2 hr):


- Sign up Tavily (free tier 1k searches/mo) for web search
- Create chat/tools.py:

```python
from langchain_core.tools import tool
from tavily import TavilyClient
```

```python
@tool
def search_web(query: str) -> str:
```
-     """Search the web for current information."""
```python
    client = TavilyClient(api_key=config('TAVILY_API_KEY'))
    return client.search(query, max_results=3)
```

```python
@tool
def calculate(expression: str) -> str:
```
-     """Calculate a math expression."""
```python
    return str(eval(expression, {"__builtins__": {}}, {}))
```

```python
@tool
def query_documents(query: str) -> str:
```
-     """Search the user's uploaded documents."""
```python
    docs = retriever.invoke(query)
    return "\n".join([d.page_content for d in docs])
```
- Test each tool standalone
### ✅ Deliverable: 3 tools callable. git commit -m "W9D2: 3 tools defined"


## Day 3 — Wed Aug 5 — Agent state graph with routing

### 📘 Learnings (1 hr):


- Search YouTube: "LangGraph ReAct agent tutorial"
- Read: LangGraph prebuilt agent
### 🛠️ Tasks (2 hr):


- Use LangGraph's prebuilt create_react_agent:

```python
from langgraph.prebuilt import create_react_agent
agent = create_react_agent(llm, [search_web, calculate, query_documents])
```
- Test: "What's the weather in Hyderabad and what's 23 * 47?" → should call both tools
- Iterate on prompts/system message for better routing
### ✅ Deliverable: Agent picks correct tools. git commit -m "W9D3: ReAct agent with 3 tools"


## Day 4 — Thu Aug 6 — Wire agent into ZoroAI

### 🛠️ Tasks (3 hr):


- Add mode field to Conversation (chat / rag / agent)
```python
New endpoint /api/agent/stream/: when mode=agent, route through LangGraph
```
- Stream agent events with type tags: event: thought, event: tool_call, event: tool_result, event: token
- Update React UI: show tool call as collapsible card "🔍 Searching: 'X'", "🧮 Calculated: Y"
### ✅ Deliverable: Agent visible in UI with tool calls. git commit -m "W9D4: agent mode in ZoroAI with tool cards"


## Day 5 — Fri Aug 7 — BROADER: Multi-modal (Whisper + GPT-4o vision)

### 📘 Learnings (1.5 hr):


- Search YouTube: "OpenAI Whisper tutorial Python 2024"
- Search YouTube: "GPT-4o vision API tutorial"
- Read: OpenAI vision quickstart
### 🛠️ Tasks (1.5 hr):


- bonus/multimodal/whisper_demo.py:

```python
from openai import OpenAI
client = OpenAI()
with open("test.mp3", "rb") as f:
    transcript = client.audio.transcriptions.create(model="whisper-1", file=f)
print(transcript.text)
```
- bonus/multimodal/vision_demo.py:

```python
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": [
```
-         {"type": "text", "text": "What's in this image?"},
-         {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}},
-     ]}],
- )
- Record a 30-sec voice note, transcribe with Whisper. Take a photo of your laptop, describe with vision.
- Write bonus/multimodal/README.md
### ✅ Deliverable: Both demos run. git commit -m "W9D5: Whisper + vision demos"


# WEEK 10 — Aug 10 to Aug 14 — Memory + cost optimization

> **End-state Fri: Long conversations summarized. Cached LLM responses. Token budget enforced per user. LoRA/PEFT understood conceptually.**


## Day 1 — Mon Aug 10 — Conversation summarization

### 📘 Learnings (1 hr):


- ...

- [Message clipped]  View entire message
- Attachments area
- Preview YouTube video Vectors | Chapter 1, Essence of linear algebraPreview YouTube video Vectors | Chapter 1, Essence of linear algebra
