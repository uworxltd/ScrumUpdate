package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;
import uk.co.uworx.khoji.agile.persistence.repository.InstanceFeatureRepository;

import java.util.List;

@Service
public class InstanceFeatureDataService
{
  @Autowired
  private InstanceFeatureRepository instanceFeatureRepository;

  public InstanceFeature saveOrUpdate(InstanceFeature instanceFeature)
  {
    return instanceFeatureRepository.save(instanceFeature);
  }

  public boolean checkIfFeatureIsUnlockedAgainstInstance(long featureId, long instanceId)
  {
    return instanceFeatureRepository.existsByFeatureAndInstance(featureId, instanceId);
  }

  public List<InstanceFeature> findAllByInstance(Instance instance)
  {
    return instanceFeatureRepository.findAllByInstance(instance);
  }
}
