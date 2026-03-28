package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.services.EngagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SavedSearchAlertScheduler {
    private final EngagementService engagementService;

    @Scheduled(cron = "0 0 */6 * * *")
    public void runAlerts() {
        int totalNewMatches = engagementService.runAlertsForAllEnabledSavedSearches();
        log.info("Saved search alert cycle completed. New matches found: {}", totalNewMatches);
    }
}
