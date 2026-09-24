/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.config.gzip;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

public class GzipFilter implements Filter
{

    public static final String ACCEPT_ENCODING = "Accept-Encoding";
    public static final String GZIP = "gzip";
    public static final String CONTENT_ENCODING = "Content-Encoding";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException
    {
        if (response instanceof HttpServletResponse httpServletResponse && request instanceof HttpServletRequest httpRequest) {

            // Check if the "Accept-Encoding" header contains "gzip"
            String acceptEncoding = httpRequest.getHeader(ACCEPT_ENCODING);
            if (acceptEncoding != null && acceptEncoding.contains(GZIP)) {
                httpServletResponse.setHeader(CONTENT_ENCODING, GZIP);
                GzipResponseWrapper gzipResponseWrapper = new GzipResponseWrapper(httpServletResponse);

                try {
                    chain.doFilter(request, gzipResponseWrapper);
                } finally {
                    gzipResponseWrapper.finish();
                }
            } else {
                // Proceed without compression
                chain.doFilter(request, response);
            }
        } else {
            chain.doFilter(request, response);
        }
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // Initialization code, if needed
    }

    @Override
    public void destroy() {
        // Cleanup code, if needed
    }
}
