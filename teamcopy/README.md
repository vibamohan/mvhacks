# Marine Microplastics Map

Interactive map for exploring marine microplastics samples, nearby pattern summaries, predictions, and model-generated explanations.

## Local development

Run the local Node server:

```bash
cd /Users/vibamohan/coding/hackathon/mvhacks/teamcopy
HUGGINGFACE_API_KEY="your_token_here" node server.mjs
```

Then open `http://localhost:8000`.

## Deploy to Vercel

This project is now structured to work on Vercel without the long-running `server.mjs` process.

Use these settings in Vercel:

1. Import the repo.
2. Set the project root directory to `teamcopy`.
3. Add environment variable `HUGGINGFACE_API_KEY`.
4. Deploy.

The frontend remains static, and these Vercel serverless routes handle the model requests:

- `api/chat.mjs`
- `api/predict.mjs`
- `api/actions.mjs`

The frontend already calls `/api/chat`, `/api/predict`, and `/api/actions`, so no client-side URL changes are needed.
