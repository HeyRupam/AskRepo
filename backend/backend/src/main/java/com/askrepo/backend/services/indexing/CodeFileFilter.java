package com.askrepo.backend.services.indexing;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component 
public class CodeFileFilter {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".java", ".kt", ".scala", ".groovy",
            ".py", ".rb", ".php", ".go", ".rs", ".swift",
            ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".vue", ".svelte",
            ".c", ".h", ".cpp", ".hpp", ".cs",
            ".sql", ".sh", ".gradle",
            ".md", ".yml", ".yaml", ".toml", ".xml", ".properties");
    private static final Set<String> EXCLUDED_DIRECTORIES = Set.of(
            ".git", "node_modules", "venv", ".venv", "__pycache__", "build", "dist", "target",
            ".next", "out", "vendor", "coverage", ".idea", ".vscode");
    private static final Set<String> EXCLUDED_FILE_NAMES = Set.of(
            "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "pipfile.lock", "gemfile.lock",
            "poetry.lock", "cargo.lock", "go.sum");
    private static final Set<String> ALLOWED_FILE_NAMES = Set.of("dockerfile", "makefile");

    public boolean isAllowed(String filePath, long fileSize, long maxFileSize) {
        if (fileSize > maxFileSize) {
            return false;
        }

        String lowerCaseFilePath = "/" + filePath.toLowerCase(Locale.ROOT);
        String fileName = lowerCaseFilePath.substring(lowerCaseFilePath.lastIndexOf('/') + 1);

        // Check for excluded directories
        for (String dir : EXCLUDED_DIRECTORIES) {
            if (lowerCaseFilePath.contains("/" + dir + "/")) {
                return false;
            }
        }

        // Check for excluded file names
        if (EXCLUDED_FILE_NAMES.contains(fileName)) {
            return false;
        }

        if (ALLOWED_FILE_NAMES.contains(fileName)) {
            return true;
        }

        if (fileName.endsWith(".min.js")) {
            return false;
        }

        // Check for allowed extensions
        for (String ext : ALLOWED_EXTENSIONS) {
            if (lowerCaseFilePath.endsWith(ext)) {
                return true;
            }
        }

        return false;
    }

    public String detectLanguage(String filePath) {
       String lower = filePath.toLowerCase(Locale.ROOT);
       String fileName = lower.substring(lower.lastIndexOf('/') + 1);
       if("dockerfile".equals(fileName)) {
           return "dockerfile";
       }
       if("makefile".equals(fileName)) {
           return "makefile";
       }
       int dot = fileName.lastIndexOf('.');
       if(dot < 0) {
           return "text";
       }
       return fileName.substring(dot + 1);
    }

}
