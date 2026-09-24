package uk.co.uworx.khoji.agile.recaptchaValidation;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Log4j2
@Service
public class ReCaptchaValidationService {
    @Value("${google.recaptcha.endpoint:https://www.google.com/recaptcha/api/siteverify}")
    public String googleRecaptchaEndpoint;

    @Value("${recaptcha.secret:}")
    public String recaptchaSecret;

    public boolean validateCaptcha(String captchaResponse){
        // No secret configured (blank RECAPTCHA_SECRET in docker compose, or the literal
        // Swarm fallback /run/secrets/recaptcha-secret in prod/demo/test-env profiles) ->
        // fail closed and never call Google with an empty or invalid secret.
        if (!StringUtils.hasText(recaptchaSecret) || recaptchaSecret.contains("/run/secrets/")) {
            log.warn("reCAPTCHA secret not configured (RECAPTCHA_SECRET); skipping validation");
            return false;
        }
        RestTemplate restTemplate = new RestTemplate();

        MultiValueMap<String, String> requestMap = new LinkedMultiValueMap<>();
        requestMap.add("secret", recaptchaSecret);
        requestMap.add("response", captchaResponse);

        ReCaptchResponseType apiResponse = restTemplate.postForObject(googleRecaptchaEndpoint, requestMap, ReCaptchResponseType.class);

        return apiResponse != null && apiResponse.isSuccess();
    }
}
