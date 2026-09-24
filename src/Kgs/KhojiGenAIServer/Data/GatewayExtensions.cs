// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Data;

static class GatewayExtensions
{
    public static int GetConfiguredSprint(this KssGateway kssGateway)
    {
        var kbs = new KbsGateway(kssGateway.Logger, kssGateway.ConnectionString);
        if (kbs.GetConfiguredSprintId(kssGateway.InstanceId) is not int sprintId)
            throw new ApplicationException($"Sprint is not configured in the given instance!");

        if (kssGateway.GetSprint(sprintId, out string additionalInfo) is not int s)
            throw new ApplicationException(additionalInfo);

        return s;
    }
}
