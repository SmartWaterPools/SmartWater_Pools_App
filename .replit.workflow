workflows:
  - name: Start application
    command: NODE_ENV=development npm run dev
    environment: node
    metadata:
      port: 5000
      protocol: http
      host: 0.0.0.0
  - name: Test Server
    command: node test-server.js
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