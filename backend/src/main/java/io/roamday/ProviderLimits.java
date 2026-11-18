package io.roamday;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.time.*;
import java.util.concurrent.Semaphore;
import static java.nio.file.StandardOpenOption.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Single-egress-gateway budget. Reserve before outbound calls; persist across restarts. */
final class ProviderLimits {
    private final Path directory;
    private final int dailyLimit;
    private final Clock clock;
    private final Semaphore active = new Semaphore(8);
    private final long spacingMs;
    private long nextAllowedMs;
    private long blockedUntil;

    ProviderLimits(Path directory, int dailyLimit, long spacingMs, Clock clock) {
        this.directory = directory;
        this.dailyLimit = dailyLimit;
        this.spacingMs = spacingMs;
        this.clock = clock;
    }

    void acquire(int credits) {
        if (!active.tryAcquire()) throw busy();
        try {
            synchronized (this) {
                if (clock.millis() < blockedUntil) throw busy();
                long delay = nextAllowedMs - clock.millis();
                if (delay > 0) Thread.sleep(delay);
                reserve(credits);
                nextAllowedMs = clock.millis() + spacingMs;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            active.release();
            throw busy();
        } catch (RuntimeException e) {
            active.release();
            throw e;
        }
    }

    void release() { active.release(); }

    synchronized void backoff(Duration retry) {
        blockedUntil = Math.max(blockedUntil, clock.millis() + retry.toMillis());
    }

    private void reserve(int credits) {
        try {
            Files.createDirectories(directory);
            Path state = directory.resolve("usage");
            try (var channel = FileChannel.open(directory.resolve("lock"), CREATE, WRITE);
                 var lock = channel.lock()) {
                LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
                int used = 0;
                if (Files.exists(state)) {
                    String[] parts = Files.readString(state).strip().split(" ");
                    if (parts.length != 2) throw new IOException();
                    LocalDate saved = LocalDate.parse(parts[0]);
                    int value = Integer.parseInt(parts[1]);
                    if (saved.isAfter(today) || value < 0) throw new IOException();
                    if (saved.equals(today)) used = value;
                }
                if (credits > dailyLimit - used) throw busy();
                Path next = directory.resolve("next");
                Files.writeString(next, today + " " + (used + credits), CREATE, WRITE, TRUNCATE_EXISTING, SYNC);
                Files.move(next, state, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException | DateTimeException | NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Live lookups are temporarily unavailable.");
        }
    }

    private static ResponseStatusException busy() {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Live lookup limit reached. Please try again later.");
    }
}
