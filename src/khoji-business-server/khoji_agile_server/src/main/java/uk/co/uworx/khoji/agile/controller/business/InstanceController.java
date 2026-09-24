package uk.co.uworx.khoji.agile.controller.business;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.request.InstanceInvite;
import uk.co.uworx.khoji.agile.service.business.InstanceService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/instance")
public class InstanceController
{
  @Autowired
  private InstanceService instanceService;

  @PostMapping("/create")
  @Transactional
  public ResponseEntity<Instance> createInstance(@RequestBody Instance instance, Principal principal)
  {
    return new ResponseEntity<>(
            instanceService.createNewInstance(instance, principal),
            HttpStatus.OK
    );
  }

  @GetMapping("/{id}")
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<Instance> getInstanceAgainstId(@PathVariable long id)
  {
    return new ResponseEntity<>(
            instanceService.getInstanceAgainstId(id),
            HttpStatus.OK
    );
  }

  @DeleteMapping("/delete")
  @Transactional
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.TENANT_ADMIN
          }
  )
  public ResponseEntity<Map<String, String>> deleteInstanceAndRelatedInformation()
  {
    try {
      instanceService.deleteInstanceAndRelatedInformation(null);
      return new ResponseEntity<>(
              Map.of("message", "success"),
              HttpStatus.OK
      );
    }
    catch (Exception e)
    {
      return new ResponseEntity<>(
              Map.of("message", "Failed"),
              HttpStatus.EXPECTATION_FAILED
      );
    }
  }

  @PostMapping("/invite")
  @Transactional
  public ResponseEntity<Map<String, String>> inviteAction(
          @RequestBody InstanceInvite instanceInvite,
          Principal principal
  )
  {
    try
    {
      if (instanceInvite.isAction())
      {
        instanceService.acceptInvite(instanceInvite.getInstanceId(), principal);
      }
      else
      {
        instanceService.rejectInvite(instanceInvite.getInstanceId(), principal);
      }
      return new ResponseEntity<>(
              Map.of("message", "ok"),
              HttpStatus.OK
      );
    }
    catch (Exception e)
    {
      if (e instanceof ServiceException) throw e;

      return new ResponseEntity<>(
              Map.of("message", "failed"),
              HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
