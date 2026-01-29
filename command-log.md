## Command Log

Commands run to investigate AI-related changes:

- `rg -n "AI|OpenAI|Anthropic|Claude|GPT|LLM|prompt|model|completion|chat" -S server client shared`
- `sed -n '1,20p' server/services/pdf-parser-service.ts`
- `sed -n '520,720p' server/services/pdf-parser-service.ts`
- `sed -n '380,520p' server/routes/vendor-invoice-routes.ts`
