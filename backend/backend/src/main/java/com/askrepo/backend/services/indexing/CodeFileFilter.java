package com.askrepo.backend.services.indexing;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component 
public class CodeFileFilter {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".java", ".py", ".js", ".ts", ".cpp", ".c", ".cs", ".go", ".rb", ".php", ".swift", ".kt", ".rs");
    private static final Set<String> EXCLUDED_DIRECTORIES = Set.of(".git", "node_modules", "venv", "__pycache__", "build", "dist", "target");
    private static final Set<String> EXCLUDED_FILE_NAMES = Set.of("package-lock.json", "yarn.lock", "Pipfile.lock", "Gemfile.lock");

    public boolean isAllowed(String filePath, long fileSize, long maxFileSize) {
        if (fileSize > maxFileSize) {
            return false;
        }

        String lowerCaseFilePath = filePath.toLowerCase();

        // Check for excluded directories
        for (String dir : EXCLUDED_DIRECTORIES) {
            if (lowerCaseFilePath.contains("/" + dir + "/") || lowerCaseFilePath.endsWith("/" + dir)) {
                return false;
            }
        }

        // Check for excluded file names
        for (String fileName : EXCLUDED_FILE_NAMES) {
            if (lowerCaseFilePath.endsWith("/" + fileName)) {
                return false;
            }
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
