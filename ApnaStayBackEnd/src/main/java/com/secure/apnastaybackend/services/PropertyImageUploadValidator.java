package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.exceptions.BadRequestException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Component
public class PropertyImageUploadValidator {

    public static final int MAX_FILES_PER_PROPERTY = 20;
    public static final long MAX_BYTES_PER_FILE = 7L * 1024 * 1024; // 7 MB

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is empty.");
        }
        if (file.getSize() > MAX_BYTES_PER_FILE) {
            throw new BadRequestException("Each image must be at most 7 MB.");
        }
        String declared = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT).replace(" ", "");
        if ("image/jpg".equals(declared)) declared = "image/jpeg";
        byte[] head;
        try {
            head = readHeader(file, 12);
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded image.");
        }
        String detected = detectMimeFromMagic(head);
        if (detected == null) {
            throw new BadRequestException("File is not a recognized image (JPEG, PNG, WebP, or GIF).");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(declared) && !"application/octet-stream".equals(declared)) {
            throw new BadRequestException("Only JPEG, PNG, WebP, and GIF images are allowed.");
        }
        if (!"application/octet-stream".equals(declared) && !detected.equals(declared)) {
            throw new BadRequestException("File content does not match the declared image type.");
        }
    }

    public void validateFileCount(int count) {
        if (count > MAX_FILES_PER_PROPERTY) {
            throw new BadRequestException("At most " + MAX_FILES_PER_PROPERTY + " images per property.");
        }
    }

    private static byte[] readHeader(MultipartFile file, int n) throws IOException {
        try (var in = file.getInputStream()) {
            byte[] buf = new byte[n];
            int read = in.read(buf);
            if (read <= 0) return new byte[0];
            return read < n ? Arrays.copyOf(buf, read) : buf;
        }
    }

    /** Must align with ALLOWED_CONTENT_TYPES */
    private static String detectMimeFromMagic(byte[] b) {
        if (b.length < 3) return null;
        // JPEG SOI: FF D8
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8) {
            return "image/jpeg";
        }
        // PNG
        if (b.length >= 8
                && b[0] == (byte) 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }
        // GIF
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return "image/gif";
        }
        // WebP: RIFF....WEBP
        if (b.length >= 12
                && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
