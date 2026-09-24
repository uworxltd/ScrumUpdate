package uk.co.uworx.khoji.agile.recaptchaValidation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ReCaptchResponseType {
    private boolean success;
    private String challenge_ts;
    private String hostname;
}
