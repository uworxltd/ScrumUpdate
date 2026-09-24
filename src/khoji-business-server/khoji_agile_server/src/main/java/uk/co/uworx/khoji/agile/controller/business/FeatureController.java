package uk.co.uworx.khoji.agile.controller.business;


import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;
import uk.co.uworx.khoji.agile.request.FeatureUnlockRequest;
import uk.co.uworx.khoji.agile.service.business.FeatureService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.List;

@Log4j2
@RestController
@RequestMapping("/features")
public class FeatureController
{
  @Autowired
  private FeatureService featureService;

  @GetMapping
  public ResponseEntity<List<Feature>> getAllAvailableFeatures()
  {
    return new ResponseEntity<>(
            featureService.getAllAvailableFeatures(),
            HttpStatus.OK
    );
  }

  @PostMapping(value = "/unlock")
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.TENANT_ADMIN
          }
  )
  public ResponseEntity<InstanceFeature> unlockFeatureAgainstInstance(
          @RequestBody FeatureUnlockRequest instanceFeature,
          Principal principal
  )
  {
    log.debug("About to unlock feature against user: {}", principal.getName());
    return new ResponseEntity<>(
            featureService.unlockFeatureAgainstInstance(
                    new InstanceFeature(
                            new Instance(
                                    instanceFeature.getInstanceId()
                            ),
                            new Feature(instanceFeature.getFeatureId())
                    ),
                    true,
                    null,
                    principal
            ),
            HttpStatus.OK
    );
  }
}
