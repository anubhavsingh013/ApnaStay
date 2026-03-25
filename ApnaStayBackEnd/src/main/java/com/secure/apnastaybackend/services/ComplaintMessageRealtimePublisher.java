package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;

/** Push new complaint thread messages to connected clients (e.g. Socket.IO). */
public interface ComplaintMessageRealtimePublisher {

    void publishNewMessage(Long complaintId, ComplaintMessageDTO message);

    /** Typing indicator in complaint room (no-op when Socket.IO disabled). */
    default void publishTyping(Long complaintId, String userName, boolean typing) {
    }

    /** Read receipt: {@code readerUserName} has read up to {@code lastReadMessageId}. */
    default void publishReadReceipt(Long complaintId, String readerUserName, Long lastReadMessageId) {
    }

    /** Message soft-deleted; clients should remove or mask the bubble. */
    default void publishMessageDeleted(Long complaintId, Long messageId) {
    }
}
