package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.services.RentalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RentReminderScheduler {
    private final RentalService rentalService;

    @Scheduled(cron = "0 30 9 * * *")
    public void sendUpcomingDueReminders() {
        int sent = rentalService.runUpcomingDueReminders();
        log.info("Upcoming rent due reminder cycle complete. Emails sent: {}", sent);
    }
}
