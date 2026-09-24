package uk.co.uworx.khoji.agile.controller.business;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.response.WorkspaceResponse;
import uk.co.uworx.khoji.agile.service.business.InstanceService;
import uk.co.uworx.khoji.agile.service.business.WorkSpaceService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/workspace")
public class WorkSpaceController
{
  @Autowired
  private WorkSpaceService workSpaceService;

  //TODO: to be used in future release
  @PostMapping("/create")
  @Transactional
  public ResponseEntity<Workspace> createWorkSpace(@RequestBody Workspace workspace, Principal principal)
  {
    return new ResponseEntity<>(
            workSpaceService.createNewWorkSpace(workspace, principal),
            HttpStatus.OK
    );
  }

  @GetMapping
  public ResponseEntity<List<WorkspaceResponse>> getWorkSpaces(Principal principal)
  {
    return new ResponseEntity<>(
            workSpaceService.getAllWorkSpaces(principal),
            HttpStatus.OK
    );
  }
}
