package uk.co.uworx.khoji.agile.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;

import java.util.List;
import java.util.Map;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class InstanceDetailResponse extends Instance
{
  private Long workSpaceId;
  private List<Feature> features;

  @Override
  @JsonIgnore
  public Workspace getWorkspace()
  {
    return super.getWorkspace();
  }

  public InstanceDetailResponse(Instance instance, List<Feature> features)
  {
    this.workSpaceId = instance.getWorkspace().getId();
    this.features = features;
    this.setId(instance.getId());
    this.setTenantId(instance.getTenantId());
    this.setInstanceImageUrl(instance.getInstanceImageUrl());
    this.setInstanceName(instance.getInstanceName());
    this.setPlatform(instance.getPlatform());
    this.setIsFavorite(instance.getIsFavorite());
    this.setCreatedAt(instance.getCreatedAt());
    this.setUpdatedAt(instance.getUpdatedAt());
    this.setFeatureId(this.features.get(0).getId());
  }
}
