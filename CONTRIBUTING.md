# Contributing to YouTube MCP

First off, thank you for considering contributing to the YouTube MCP server! It's people like you that make this tool great.

## Getting Started

1.  **Fork and Clone** the repository to your local machine.
2.  **Install Dependencies**: Run `npm install`.
3.  **Build the Project**: Run `npm run build`.
4.  **Local Testing**: You can test your local changes using the MCP Inspector:
    ```bash
    npx @modelcontextprotocol/inspector node build/server/index.js
    ```
    *Tip: If your tool requires authentication, provide your API key as an argument:*
    ```bash
    npx @modelcontextprotocol/inspector node build/server/index.js "YOUR_API_KEY"
    ```

## Making Changes

1.  Create a new branch for your feature or bug fix: `git checkout -b feature-name`.
2.  Ensure your code follows the existing style and conventions.
3.  **TypeScript**: All new code should be strongly typed. Run `npm run build` to catch compilation errors.
4.  **Security**: If you are adding a new package dependency, ensure it is secure by running `npm audit`. We strictly avoid packages with known vulnerabilities.
5.  **Documentation**: If you are adding a new MCP tool, ensure it is documented in the `README.md`'s "Available Tools Reference".

##  Pull Requests

1.  Commit your changes clearly and descriptively.
2.  Push to your fork and submit a Pull Request.
3.  Please fill out the provided Pull Request template completely so we understand the context of your changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
