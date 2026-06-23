import os
from typing import Optional, List
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.schema import Document
from langchain.prompts import PromptTemplate

from app.config import settings

os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY or ""


class RAGService:
    def __init__(self, index_path: str = "./knowledge_index"):
        self.index_path = index_path
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.GEMINI_API_KEY,
        )
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        )
        self.vector_store: Optional[FAISS] = None
        self._load_index()

    def _load_index(self):
        index_file = os.path.join(self.index_path, "index.faiss")
        if os.path.exists(index_file):
            self.vector_store = FAISS.load_local(
                self.index_path,
                self.embeddings,
                allow_dangerous_deserialization=True,
            )

    def _save_index(self):
        if self.vector_store:
            os.makedirs(self.index_path, exist_ok=True)
            self.vector_store.save_local(self.index_path)

    def add_documents(self, texts: List[str]):
        documents = [Document(page_content=t) for t in texts]
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""],
        )
        chunks = text_splitter.split_documents(documents)

        if self.vector_store:
            self.vector_store.add_documents(chunks)
        else:
            self.vector_store = FAISS.from_documents(chunks, self.embeddings)

        self._save_index()

    def add_file(self, file_path: str):
        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith(".txt"):
            loader = TextLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_path}")

        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)

        if self.vector_store:
            self.vector_store.add_documents(chunks)
        else:
            self.vector_store = FAISS.from_documents(chunks, self.embeddings)

        self._save_index()

    def search(self, query: str, top_k: int = 5) -> List[dict]:
        if not self.vector_store:
            return []

        results = self.vector_store.similarity_search_with_score(query, k=top_k)
        return [
            {"content": doc.page_content, "score": float(score)}
            for doc, score in results
        ]

    def query_with_context(self, query: str, user_context: str = "") -> str:
        if not self.vector_store:
            return "Knowledge base is empty. Ingest documents first."

        prompt_template = PromptTemplate(
            template=(
                "You are a medical knowledge assistant. Use the retrieved context to answer "
                "the user's health-related question. Always cite your sources from the context. "
                "If the context doesn't contain enough information, say so clearly.\n\n"
                "User Health Context:\n{user_context}\n\n"
                "Retrieved Knowledge:\n{context}\n\n"
                "Question: {question}\n\n"
                "Answer:"
            ),
            input_variables=["user_context", "context", "question"],
        )

        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(
                search_type="similarity", search_kwargs={"k": 5}
            ),
            chain_type_kwargs={
                "prompt": prompt_template,
                "document_prompt": PromptTemplate(
                    input_variables=["page_content"],
                    template="{page_content}",
                ),
                "document_separator": "\n\n---\n\n",
            },
            return_source_documents=True,
        )

        result = qa_chain.invoke({
            "query": query,
            "user_context": user_context,
        })

        return result["result"]

    def rebuild_index(self, texts: List[str]):
        documents = [Document(page_content=t) for t in texts]
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        self._save_index()

    def get_status(self) -> dict:
        if self.vector_store:
            return {
                "index_loaded": True,
                "total_documents": self.vector_store.index.ntotal,
                "dimension": self.vector_store.index.d,
            }
        return {"index_loaded": False, "total_documents": 0, "dimension": 0}


rag_service = RAGService()
