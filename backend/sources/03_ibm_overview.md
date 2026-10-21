# Source 3: IBM, "What is retrieval augmented generation?" (ibm.com/think/topics/retrieval-augmented-generation)
- RAG is an architecture that connects an AI model to external knowledge sources for more relevant, higher-quality answers.
- A model's knowledge stops at its training cutoff. Models sometimes present invented information as fact; this is called hallucination. Grounding answers in authoritative sources lowers this risk.
- Retraining or fine-tuning on domain data is expensive; RAG adds specialised knowledge without that cost.
- Five steps: the user submits a prompt; a retriever searches the knowledge base; relevant results go to an integration layer; the prompt is expanded with that context; the language model generates the response.
- The knowledge base is built by splitting documents into chunks and converting them into vectors (embeddings). Chunk size must be tuned; too large or too small both hurt retrieval.
- Main components: knowledge base, retriever, integration layer, generator.
- RAG queries external data at run time, while fine-tuning trains the model on domain data. They can be combined.
- RAG answers can cite sources so users can check them.
- Limits: RAG does not make a model error-proof; the knowledge base must be kept up to date; the context window limits how much retrieved text fits in a prompt.
