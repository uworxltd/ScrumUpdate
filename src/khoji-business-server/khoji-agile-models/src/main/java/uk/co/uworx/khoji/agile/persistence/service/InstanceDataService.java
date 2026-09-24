package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.persistence.repository.InstanceRepository;

import java.util.List;
import java.util.Optional;

@Service
public class InstanceDataService
{
  @Autowired
  private InstanceRepository instanceRepository;

  public Instance createOrUpdate(Instance instance)
  {
    return instanceRepository.save(instance);
  }

  public Optional<Instance> findById(Long id, boolean autoInjectId)
  {
    // this if is for auto-injection using aspect
    if (autoInjectId) return instanceRepository.findByInstanceId(null);
    return instanceRepository.findById(id);
  }

  public List<Instance> findByWorkspace(Workspace workspace)
  {
    return instanceRepository.findAllByWorkspace(workspace);
  }

  public void deleteByInstanceId(Long instanceId) {
    instanceRepository.deleteByInstanceId(instanceId);
  }

  public List<Instance> findInstancesByUserId(Long userId) {
    return instanceRepository.findByOwnerUserId(userId);
  }

  public List<Instance> findAll()
  {
    return instanceRepository.findAll();
  }
}
