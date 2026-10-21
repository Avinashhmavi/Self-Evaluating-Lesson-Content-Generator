# Introduction to RAG

## What it is

RAG stands for Retrieval-Augmented Generation. It is a method that improves answers from an AI model. An AI model is a computer program that processes human language. We call it an LLM, which means a large language model. 

A plain LLM uses only its built-in training memory to answer questions. RAG connects an LLM to an external knowledge source outside its training data. This external source is called a knowledge base. A knowledge base is a collection of documents or files. 

RAG has two main parts. The first part is retrieval. This means searching the knowledge base to find text that matches a user question. The second part is generation. This means the LLM writes an answer using the retrieved text.

## Why it matters

Plain LLMs have three big problems. First, their training data stops at a specific point in time. This means their answers can be old or out of date. Second, they can state false information with great confidence. When an AI model presents invented information as fact, we call this hallucination. 

Third, retraining an LLM on new data is very expensive and hard to do. RAG solves these problems without retraining the model. RAG lowers the risk of hallucination by grounding answers in real documents. Grounding means basing the output on trusted facts. 

RAG also keeps answers current because developers can update the external data at any time. It can attribute answers to source documents. Attribution means showing the original source of the facts. This helps users check if the answers are true.

## How it works

RAG works in six clear steps. First, external data is converted into numbers called embeddings. An embedding is a numeric format of text that a computer can read. These numbers are called vectors. A vector is a list of numbers that represents the meaning of text. 

Second, the system stores these vectors in a vector database. A vector database is a special database made to store and search vectors quickly. Third, when a user asks a question, the system converts that question into a vector too. It searches the vector database to find relevant items. This search step is called retrieval. 

Fourth, the system adds the retrieved text to the prompt as context. A prompt is the text instruction given to an AI model. Context is the extra background information supplied with the prompt to help the model answer well. 

Fifth, the LLM reads the question plus that context to write its final response. Sixth, the external data must be refreshed often to stay current. RAG does not make a model error-proof, but it helps the model give more factual text.

## Example

Imagine you are an Indian student preparing for an exam. You have a big stack of study notes on your desk. This stack of notes is your knowledge base. 

First, you convert your handwritten notes into typed digital files. This is like turning documents into embeddings and vectors. 

Second, you store these typed files inside a folder on your computer. This folder is your vector database. 

Third, you read a difficult question from the exam paper. You look through your folder to find the exact page that talks about this question. Finding that page is the retrieval step. 

Fourth, you place that open page right next to the question on your desk. The words on that open page act as your context. 

Fifth, you read the question and the open page together. Then you write down the correct answer on your exam sheet. Writing this answer is the generation step. 

Sixth, if your teacher gives you new notes next week, you must add them to your folder so your information stays up to date.

## Recap

RAG is a method that connects an LLM to external information sources. Plain LLMs can suffer from hallucination, which is making up false facts. They also have outdated knowledge because their training data stops at a cutoff date. 

RAG solves these problems using a knowledge base and a retriever. First, documents are turned into embeddings and vectors. Second, they are stored in a vector database. Third, the system searches this database to find relevant text for a user query. 

Fourth, the system adds this text as context to the prompt. Fifth, the LLM generates a response using the question and the context. RAG helps lower the risk of hallucination and keeps answers factual without the high cost of retraining the model.
