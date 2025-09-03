// src/main/java/com/rms/reimbursement_app/service/FileStorageService.java
package com.rms.reimbursement_app.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path root = Paths.get("uploads"); // relative to working dir

    public FileStorageService() throws IOException {
        Files.createDirectories(root);
    }

    public StoredFile storeForClaim(Long claimId, MultipartFile file) throws IOException {
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        String ext = "";
        int i = original.lastIndexOf('.');
        if (i > 0) ext = original.substring(i);

        Path dir = root.resolve(Paths.get("claims", String.valueOf(claimId)));
        Files.createDirectories(dir);

        String name = UUID.randomUUID().toString().replace("-", "") + ext;
        Path dest = dir.resolve(name);

        try {
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IOException("Could not store file", e);
        }

        return new StoredFile(dest.toString(), original, file.getContentType(), file.getSize());
    }

    public record StoredFile(String path, String originalFilename, String contentType, long size) {}
}
