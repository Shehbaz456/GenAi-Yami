Required environment variables (set them in Project Settings → Environment Variables):
- OPENAI_API_KEY: your OpenAI API key (used for embeddings and chat; server-side only)
- QDRANT_URL: the HTTP URL to your Qdrant instance (e.g., https://YOUR-CLUSTER-XXXXXXXX.aws.cloud.qdrant.io or http://localhost:6333 if accessible)
- QDRANT_API_KEY (optional): Qdrant API key if your instance requires it
- QDRANT_COLLECTION_PREFIX (optional): default "doctext"
