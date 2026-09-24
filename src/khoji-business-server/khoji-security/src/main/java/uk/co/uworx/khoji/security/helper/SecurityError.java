/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.helper;

/**
 *  this enum contains the security codes that are attached at the CUSTOM_ERROR header in response to api call
 *  if any error is encountered during the execution of the api call
 */
public enum SecurityError {
    BAD_CREDENTIALS("SE001"),
    LOCKED_EXCEPTION("SE002"),
    CONNECTION_FAILED("SE005"),
    UNINVITED_USER("SE006"),
    ERROR_WITH_REFRESH_TOKEN("SE008"),
    ERROR_WITH_SAME_EMAIL_LINKED_WITH_DIFFERENT_ACCOUNT("SE009");

    private String errorCode;

    SecurityError(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
