package com.secure.apnastaybackend.config.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class ComplaintWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ComplaintJwtHandshakeInterceptor complaintJwtHandshakeInterceptor;
    private final ComplaintPrincipalHandshakeHandler complaintPrincipalHandshakeHandler;
    private final StompComplaintJwtConnectChannelInterceptor stompComplaintJwtConnectChannelInterceptor;
    private final StompComplaintSubscribeChannelInterceptor stompComplaintSubscribeChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat")
                .setHandshakeHandler(complaintPrincipalHandshakeHandler)
                .addInterceptors(complaintJwtHandshakeInterceptor)
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(
                stompComplaintJwtConnectChannelInterceptor,
                stompComplaintSubscribeChannelInterceptor);
    }
}
