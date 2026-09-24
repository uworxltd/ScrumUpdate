package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.persistence.repository.WorkspaceRepository;

import java.util.List;
import java.util.Optional;

@Service
public class WorkspaceDataService
{
  @Autowired
  private WorkspaceRepository workspaceRepository;

  public Workspace createWorkspace(Workspace workspace)
  {
    //TODO: null handling
    return workspaceRepository.save(workspace);
  }

  public List<Workspace> findByOwner(KhojiUser user)
  {
    return workspaceRepository.findByOwner(user);
  }

  public Optional<Workspace> fetchWorkspaceById(Long id)
  {
    return workspaceRepository.findById(id);
  }
}
