workflows:
  - name: Start application
    command: npm run dev
    environment: node
    metadata:
      port: 5000
      protocol: http
      host: 0.0.0.0
  - name: Build for deployment
    command: node run-build.js
    environment: node
  - name: Test production
    command: node test-prod.js
    environment: node
    metadata:
      port: 5000
      protocol: http
      host: 0.0.0.0