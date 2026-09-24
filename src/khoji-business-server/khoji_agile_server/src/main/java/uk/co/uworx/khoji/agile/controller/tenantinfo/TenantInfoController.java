package uk.co.uworx.khoji.agile.controller.tenantinfo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.service.jira.UserDataReportingSync;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;

import java.util.List;
import java.util.Map;

@RestController
@Tag(name = "Khoji For Agile", description = "Operations for tenant infos")
@Log4j2
public class TenantInfoController
{
  @Autowired
  private UserDataReportingSync userDataReportingSync;


  @Operation(summary = "To get information of active tenants users")
  @GetMapping("/getAllActiveTenantsInfo")
  @AuthorizationApplicationLevelAPIs
  public ResponseEntity<Map<String, List<UserDataReportingSync.TenantUserInfo>>> getAllTenantDetails()
  {
    try
    {
      return new ResponseEntity<>(
              userDataReportingSync.getAllTenantDetails(),
              HttpStatus.OK
      );
    }
    catch (Exception e)
    {
      return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
    }
  }
}

