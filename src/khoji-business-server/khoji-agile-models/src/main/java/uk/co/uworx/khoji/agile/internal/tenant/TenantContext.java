package uk.co.uworx.khoji.agile.internal.tenant;

import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantUsers;

public class TenantContext
{
  private static final ThreadLocal<TenantUsers> currentTenant = new ThreadLocal<>();

  public static void setCurrentTenant(TenantUsers tenant, String message)
  {
    currentTenant.set(tenant);
  }
  public static TenantUsers getCurrentTenant()
  {
    return currentTenant.get();
  }
  public static String getTenantIdentification()
  {
    return currentTenant.get() != null ? currentTenant.get().getTenantId().getTenantId() : "<tenant not available>";
  }
  public static void clear()
  {
    currentTenant.remove();
  }
}
