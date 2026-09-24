package uk.co.uworx.khoji.agile.transform;

import com.bazaarvoice.jolt.Transform;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderJiraImpl;
import uk.co.uworx.khoji.agile.service.TenantService;

public class DisplayNameTransform implements Transform
{
  private ITransform displayNameTransform;
  private TenantService tenantService;

  public DisplayNameTransform()
  {
    tenantService = (TenantService) BootApplicationContextProviderJiraImpl.getContext().getBean("tenantService");
  }

  public DisplayNameTransform(TenantService tenantService)
  {
    this.tenantService = tenantService;
  }

  @Override
  public Object transform(Object data)
  {
    displayNameTransform = tenantService.getTransform(TenantService.DISPLAY_NAME_TRANSFORM);
    if (displayNameTransform != null)
    {
      data = displayNameTransform.transform(data, null);
    }
    return data;
  }
}
