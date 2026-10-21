# Introduction to RAG

## What it is

Retrieval-Augmented Generation is a method that improves AI answers. It connects an AI model to outside information sources. We call this method RAG for short. 

A plain AI model stores facts inside its own memory from its training. But this memory has limits. It cannot always access or change those facts easily. RAG fixes this limit. It lets the AI search an external knowledge source before it answers a question. 

RAG combines two types of memory. The first type is the internal memory of the AI model. The second type is an external knowledge base. A knowledge base is a large collection of outside documents or files. 

RAG does not retrain the model. Training a model again is very slow and costly. RAG queries outside data at run time instead. Run time is the moment when the user asks a question and the system runs the program to answer it.

## Why it matters

Plain AI models have big problems when they answer questions. First, they can state false information with high confidence. When an AI presents invented information as a true fact, we call this a hallucination. 

Second, the training data of an AI has a cutoff date. A cutoff date is the final day of data used to train the model. The model knows nothing about events that happen after that date. Its answers can become outdated. 

Third, plain models can draw on bad sources. RAG solves these problems in many ways. It grounds answers in authoritative sources. This lowers the risk of hallucinations. 

RAG keeps answers current because developers can update the external data. It is much cheaper than retraining a model on new domain data. Also, RAG can attribute answers to source documents. This means the AI can show the source of its answers. Users can check those sources to verify the facts.

## How it works

RAG works in a series of steps without retraining the model. 

First, external data is converted into numbers. We call these numerical forms embeddings. An embedding is a text converted into a list of numbers so a computer can understand its meaning. These embeddings are stored in a vector database. A vector database is a special database designed to store and search through those number lists quickly. In this database, a vector is just another word for that list of numbers. 

Second, the user submits a prompt. A prompt is the text or question that a user types into the AI system. 

Third, a retriever searches the knowledge base. A retriever is a tool that finds relevant passages in the knowledge base. This action of finding and getting relevant passages from the knowledge base is the retrieval step. 

Fourth, the system takes the retrieved text and adds it to the prompt as context. Context is the extra background text given to the AI to help it form a good answer. 

Fifth, the language model generates the response. A language model, or LLM, is an AI program that reads and writes human text. The LLM reads the user question plus the new context, and then it writes the final answer.

## Example

Think about an Indian student studying in a city library for a college exam. 

First, the student has a massive textbook stored on a shelf. This shelf acts like your vector database, holding all the pages of text as structured notes. 

Second, the student gets a difficult question on a practice sheet. This question is your prompt. 

Third, the student goes to the shelf and looks up the exact topic in the textbook index. This action of finding and getting the correct page is the retrieval step. 

Fourth, the student opens the book to that specific page and keeps it open next to the question paper. This open page acts as the context. 

Fifth, the student reads the question and the open textbook page together. Then the student writes down the correct, factual answer on the paper. This final writing step is how the language model generates the response using the extra context. 

Sixth, if the textbook page has old data, the student must replace that page with a new printed update to stay current. This matches the rule that external data must be refreshed to stay current.

## Recap

RAG is a system that connects an AI model to external knowledge sources. It improves the answers of the AI without retraining the model. 

Plain models suffer from hallucinations where they state false facts. They also have a training cutoff date that makes their knowledge out of date. 

RAG fixes this by using a retriever to search a vector database. It converts documents into embeddings. 

Then it adds the retrieved text to the prompt as context before the generator creates the final answer. This method lowers errors, keeps data current, and lets users check source documents.
