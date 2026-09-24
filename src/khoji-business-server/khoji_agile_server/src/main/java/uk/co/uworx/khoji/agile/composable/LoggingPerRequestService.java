/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.composable;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.text.MessageFormat;
import java.util.HashMap;
import java.util.Map;

@Component
@Log4j2
public class LoggingPerRequestService {

    private static final String QUICK_SEARCH_LOGGING_PATTERN = "QuickAccess Headers: {0} and Body: {1}";

    private ObjectMapper objectMapper = new ObjectMapper();


    /**
     * To log header and body of the request
     *
     * @param request is used to get the request headers
     * @param body    of the request
     */
    public void logRequest(final ContentCachingRequestWrapper request, HashMap body)
    {
        Map<String, String> headers = new HashMap<>();

        headers.put("username", "<email encrypted>");

        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        try
        {
            log.info(MessageFormat.format(QUICK_SEARCH_LOGGING_PATTERN, objectMapper.writeValueAsString(headers), objectMapper.writeValueAsString(body)));
        }
        catch (JsonProcessingException e)
        {
            log.error("JSON Parsing Error posting quick search data", e);
        }
    }
}
