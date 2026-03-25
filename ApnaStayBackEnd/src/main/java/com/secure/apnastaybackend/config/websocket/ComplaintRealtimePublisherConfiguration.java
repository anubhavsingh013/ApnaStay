package com.secure.apnastaybackend.config.websocket;

import com.secure.apnastaybackend.services.ComplaintMessageRealtimePublisher;
import com.secure.apnastaybackend.services.impl.NoOpComplaintMessageRealtimePublisher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Configuration
public class ComplaintRealtimePublisherConfiguration {

    @Bean
    @ConditionalOnBean(SimpMessagingTemplate.class)
    public ComplaintMessageRealtimePublisher stompComplaintMessagePublisher(SimpMessagingTemplate messagingTemplate) {
        return new StompComplaintMessagePublisher(messagingTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(ComplaintMessageRealtimePublisher.class)
    public ComplaintMessageRealtimePublisher noopComplaintMessageRealtimePublisher() {
        return new NoOpComplaintMessageRealtimePublisher();
    }
}
