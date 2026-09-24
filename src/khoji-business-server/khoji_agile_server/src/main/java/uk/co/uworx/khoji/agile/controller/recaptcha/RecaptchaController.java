package uk.co.uworx.khoji.agile.controller.recaptcha;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.recaptchaValidation.ReCaptchaValidationService;

@CrossOrigin
@RestController
@Tag(name = "Khoji For Agile", description = "Operation to check the recaptcha validation in Khoji For Agile")
@Validated
@Log4j2
public class RecaptchaController
{
  @Autowired
  ReCaptchaValidationService reCaptchaValidationService;

  @Operation(summary = "Recaptcha Validation API")
  @PostMapping("/recaptcha/validate")
  public ResponseEntity<String> checkRecaptchaValidation(@RequestBody String token)
  {
    log.debug("Recaptcha Token: {}", token);
    if (reCaptchaValidationService.validateCaptcha(token))
    {
      return new ResponseEntity<>(HttpStatus.OK);
    }
    return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
  }
}

