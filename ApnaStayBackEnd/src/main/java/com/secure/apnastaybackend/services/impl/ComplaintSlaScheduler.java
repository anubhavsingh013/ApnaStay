package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ComplaintSlaScheduler {
    private final ComplaintService complaintService;

    @Scheduled(cron = "0 */30 * * * *")
    public void runSlaChecks() {
        int flagged = complaintService.runSlaEscalationCycle();
        log.info("Complaint SLA cycle complete. Flagged complaints: {}", flagged);
    }
}
