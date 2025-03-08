{
  "workflows": [
    {
      "name": "Test application",
      "command": "node app-test.js",
      "restartOn": {
        "files": ["app-test.js", "redirect.html"]
      }
    }
  ]
}
