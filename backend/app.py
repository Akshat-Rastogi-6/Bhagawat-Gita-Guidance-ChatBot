import json
import pickle
import torch
import faiss
import numpy as np
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load environment variables
load_dotenv('backend\.env')

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
api_key = os.getenv("GEMINI_API_KEY")
os.environ["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# Setup Langchain components
model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
workflow = StateGraph(state_schema=MessagesState)
with open("backend\system_prompt.txt", "r") as file:
    system_prompt = file.read()
print(f"System prompt: {system_prompt}")
prompt_template = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            system_prompt
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

def input_func(state: MessagesState):
    prompt = prompt_template.invoke(state)
    response = model.invoke(prompt)
    return {"messages": response}

workflow.add_edge(START, "model")
workflow.add_node("model", input_func)

memory = MemorySaver()
chat_app = workflow.compile(checkpointer=memory)
config = {"configurable": {"thread_id": "abc123"}}

# Functions for processing queries
def embed(content):
    """Generate embeddings for text content"""
    if isinstance(content, list):
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=content
        )
        tensor = torch.tensor(result['embedding'], dtype=torch.float32)
    else:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=[content]
        )
        tensor = torch.tensor(result['embedding'][0], dtype=torch.float32)
    
    return tensor

def search_embeddings(query_embedding, chunks, k=3):
    """Search for relevant chunks using vector similarity"""
    query_embedding_array = np.expand_dims(np.array(query_embedding, dtype='float32'), axis=0)
    
    try:
        index = faiss.read_index("backend/vector/daily_care.faiss")
        distances, indices = index.search(query_embedding_array, k)
        matching_chunks = [chunks[i] for i in indices[0]]
        return matching_chunks
    except Exception as e:
        print(f"Error searching embeddings: {e}")
        return []

def generate_response(matching_chunks, query, chat_app):
    """Generate response using context and query"""
    context = "\n".join(matching_chunks)
    input_prompt = f"Context: {context}\nQuestion: {query}\nAnswer:"
    input_message = [HumanMessage(content=input_prompt)]
    
    try:
        output = chat_app.invoke({"messages": input_message}, config)
        return output["messages"][-1].content
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I apologize, but I'm having trouble processing your question. Could you please rephrase it?"

# API Endpoints
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        
        # Process the query
        query_embedding = embed(query)
        
        try:
            with open(r'backend/chunks/daily_care.pkl', 'rb') as f:
                chunked = pickle.load(f)
        except FileNotFoundError:
            return jsonify({'error': 'Knowledge base not found'}), 500
            
        results = search_embeddings(query_embedding, chunked)
        response = generate_response(results, query, chat_app)
        
        return jsonify({'response': response})
    
    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({'error': 'An error occurred processing your request'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)