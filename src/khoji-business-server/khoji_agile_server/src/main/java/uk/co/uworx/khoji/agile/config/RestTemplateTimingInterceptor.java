package uk.co.uworx.khoji.agile.config;

import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;

@Log4j2
public class RestTemplateTimingInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        long start = System.currentTimeMillis();
        try {
            ClientHttpResponse response = execution.execute(request, body);
            long took = System.currentTimeMillis() - start;
            try {
                log.debug("[SCRUM-TIMER] Outbound HTTP {} {} -> status={} took={}ms", request.getMethod(), request.getURI(), response.getStatusCode().value(), took);
            } catch (Exception e) {
                log.debug("[SCRUM-TIMER] Outbound HTTP {} {} -> took={}ms", request.getMethod(), request.getURI(), took);
            }
            return response;
        } catch (IOException ex) {
            long took = System.currentTimeMillis() - start;
            log.debug("[SCRUM-TIMER] Outbound HTTP {} {} -> failed after {}ms: {}", request.getMethod(), request.getURI(), took, ex.toString());
            throw ex;
        }
    }
}
