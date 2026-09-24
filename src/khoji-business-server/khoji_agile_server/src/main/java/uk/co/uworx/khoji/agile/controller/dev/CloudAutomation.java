package uk.co.uworx.khoji.agile.controller.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.service.business.UserService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@Profile("dev")
@RequestMapping("/cloud-automation")
public class CloudAutomation
{
  private final UserService userService;

  public CloudAutomation(
          UserService userService
  )
  {
    this.userService = userService;
  }

  @GetMapping("/reset/sanity-users")
  @AuthorizationApplicationLevelAPIs
  public ResponseEntity<Map<String, String>> resetUsersForSanity()
  {
    List<String> sanityScriptAccounts = List.of(
            "user-771834b1-c3c7-40c8-911f-cc2a2382a693@mailslurp.net",
            "hello@scrumupdate.com"
    );

    Map<String, String> resultMap = new HashMap<>();

    sanityScriptAccounts.forEach(acc -> {
      try
      {
        userService.deleteUserProfileAndRelatedInformation(() -> acc);
      }
      catch (Exception e)
      {
        if (e instanceof ServiceException serviceException)
        {
          resultMap.put(acc, serviceException.getResponseCode());
        }
        else
        {
          resultMap.put(acc, "HIBERNATE_OR_CODE_FAILURE");
        }
      }
    });

    if (resultMap.isEmpty())
    {
      return new ResponseEntity<>(
              Map.of("message", "success"),
              HttpStatus.OK
      );
    }

    return new ResponseEntity<>(
            resultMap,
            HttpStatus.PARTIAL_CONTENT
    );
  }
}
