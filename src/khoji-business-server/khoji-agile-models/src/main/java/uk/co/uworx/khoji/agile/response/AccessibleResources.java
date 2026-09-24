package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import uk.co.uworx.khoji.agile.persistence.model.Instance;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AccessibleResources
{
  List<JiraResourcesResponse> jiraInstances;
  List<InvitedInstances> invitedInstances;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @SuperBuilder
  public static class JiraResourcesResponse extends Resources
  {
    List<String> scopes;
    private boolean alreadyRegistered;
  }

  @Getter
  @Setter
  @AllArgsConstructor
  @NoArgsConstructor
  @SuperBuilder
  public static class InvitedInstances extends Resources
  {
    String errorCode;
    InstanceOwner instanceOwner;
    Long instanceId;

    public InvitedInstances(Instance instance)
    {
      super(
              instance.getTenantId(),
              String.format("https://%s.atlassian.net", instance.getInstanceName()),
              instance.getInstanceName(),
              instance.getInstanceImageUrl()
      );
      this.errorCode = "";
      this.instanceOwner = new InstanceOwner(
              instance.getWorkspace().getOwner().getFullName(),
              instance.getWorkspace().getOwner().getImageUrl()
      );
      this.instanceId = instance.getId();
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InstanceOwner
    {
      String name;
      String avatarUrl;
    }
  }

  @Setter
  @Getter
  @AllArgsConstructor
  @NoArgsConstructor
  @SuperBuilder
  public static class Resources
  {
    private String id;
    private String url;
    private String name;
    private String avatarUrl;
  }
}
