/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.config.gzip;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;

import java.io.IOException;
import java.util.zip.GZIPOutputStream;

public class GzipResponseWrapper extends HttpServletResponseWrapper
{
    private GzipServletOutputStream gzipServletOutputStream;

    public GzipResponseWrapper(HttpServletResponse response) throws IOException {
        super(response);
        this.gzipServletOutputStream = new GzipServletOutputStream(response.getOutputStream());
    }

    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        return gzipServletOutputStream;
    }

    public void finish() throws IOException {
        gzipServletOutputStream.finish();
    }

    private static class GzipServletOutputStream extends ServletOutputStream {
        private GZIPOutputStream gzipOutputStream;

        public GzipServletOutputStream(ServletOutputStream outputStream) throws IOException {
            this.gzipOutputStream = new GZIPOutputStream(outputStream);
        }

        @Override
        public void write(int b) throws IOException {
            gzipOutputStream.write(b);
        }

        @Override
        public void flush() throws IOException {
            gzipOutputStream.flush();
        }

        @Override
        public void close() throws IOException {
            gzipOutputStream.close();
        }

        public void finish() throws IOException {
            gzipOutputStream.finish();
        }

        @Override
        public boolean isReady() {
            return false;
        }

        @Override
        public void setWriteListener(WriteListener writeListener) {
            // Not implemented
        }
    }
}
